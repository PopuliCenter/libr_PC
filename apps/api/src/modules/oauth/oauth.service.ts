import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ClientRegistryService, OAuthClient } from './client-registry.service';
import { AuthorizeDto } from './dto/authorize.dto';
import { TokenDto } from './dto/token.dto';
import { OAuthAuthorizationCode } from './entities/authorization-code.entity';
import { OidcKeyService } from './oidc-key.service';

const SUPPORTED_SCOPES = ['openid', 'profile', 'email', 'offline_access'];
const CODE_TTL_MS = 60_000; // 1 menit
const ACCESS_TTL_SEC = 900; // 15 menit
const ID_TTL_SEC = 900;
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30 hari

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/** Error format OAuth2 (RFC 6749 §5.2) supaya klien standar mengertinya. */
function oauthError(error: string, description: string): BadRequestException {
  return new BadRequestException({ error, error_description: description });
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthAuthorizationCode)
    private readonly codes: Repository<OAuthAuthorizationCode>,
    private readonly clients: ClientRegistryService,
    private readonly keys: OidcKeyService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  private get issuer(): string {
    return this.config.get<string>(
      'OIDC_ISSUER',
      `${this.config.get('APP_URL', 'http://localhost:3001')}/api/v1`,
    );
  }

  private get webUrl(): string {
    return this.config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  // ===================================================================
  // Discovery & JWKS
  // ===================================================================

  discoveryDocument() {
    const iss = this.issuer;
    return {
      issuer: iss,
      authorization_endpoint: `${this.webUrl}/oauth/authorize`,
      token_endpoint: `${iss}/oauth/token`,
      userinfo_endpoint: `${iss}/oauth/userinfo`,
      jwks_uri: `${iss}/oauth/jwks`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: SUPPORTED_SCOPES,
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
      code_challenge_methods_supported: ['S256'],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'auth_time',
        'nonce',
        'name',
        'preferred_username',
        'email',
        'email_verified',
      ],
    };
  }

  jwks() {
    return this.keys.jwks();
  }

  // ===================================================================
  // Consent context (dipakai halaman consent untuk menampilkan klien+scope)
  // ===================================================================

  authorizationContext(clientId: string, redirectUri: string, scope: string) {
    const client = this.requireValidClientRedirect(clientId, redirectUri);
    const scopes = this.resolveScopes(scope, client);
    return {
      client: { clientId: client.clientId, name: client.name, logoUri: client.logoUri },
      scopes: scopes.map((s) => ({ key: s, label: SCOPE_LABELS[s] ?? s })),
    };
  }

  // ===================================================================
  // Authorize — buat kode otorisasi setelah anggota menyetujui
  // ===================================================================

  async authorize(
    user: User,
    dto: AuthorizeDto,
  ): Promise<{ redirectTo: string }> {
    const client = this.requireValidClientRedirect(dto.client_id, dto.redirect_uri);

    // Setelah client+redirect valid, galat lain dikembalikan via redirect (spec).
    if (dto.approve === false) {
      return { redirectTo: this.redirect(dto.redirect_uri, { error: 'access_denied' }, dto.state) };
    }

    const scopes = this.resolveScopes(dto.scope, client);

    const raw = randomBytes(32).toString('hex');
    await this.codes.save(
      this.codes.create({
        codeHash: this.sha256(raw),
        clientId: client.clientId,
        userId: user.id,
        redirectUri: dto.redirect_uri,
        scope: scopes.join(' '),
        nonce: dto.nonce ?? null,
        codeChallenge: dto.code_challenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        consumedAt: null,
      }),
    );

    return { redirectTo: this.redirect(dto.redirect_uri, { code: raw }, dto.state) };
  }

  // ===================================================================
  // Token endpoint
  // ===================================================================

  async token(dto: TokenDto): Promise<TokenResponse> {
    if (dto.grant_type === 'authorization_code') {
      return this.authorizationCodeGrant(dto);
    }
    if (dto.grant_type === 'refresh_token') {
      return this.refreshTokenGrant(dto);
    }
    throw oauthError('unsupported_grant_type', 'grant_type tidak didukung');
  }

  private async authorizationCodeGrant(dto: TokenDto): Promise<TokenResponse> {
    if (!dto.code) throw oauthError('invalid_request', 'code wajib diisi');
    if (!dto.code_verifier) {
      throw oauthError('invalid_request', 'code_verifier wajib diisi (PKCE)');
    }

    const client = this.authenticateClient(dto);

    const record = await this.codes.findOne({
      where: { codeHash: this.sha256(dto.code) },
    });
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      throw oauthError('invalid_grant', 'Kode otorisasi tidak valid atau kedaluwarsa');
    }
    if (record.clientId !== client.clientId) {
      throw oauthError('invalid_grant', 'Kode otorisasi bukan milik klien ini');
    }
    if (record.redirectUri !== dto.redirect_uri) {
      throw oauthError('invalid_grant', 'redirect_uri tidak cocok');
    }
    // PKCE: S256(code_verifier) harus sama dengan code_challenge tersimpan.
    const computed = createHash('sha256').update(dto.code_verifier).digest('base64url');
    if (computed !== record.codeChallenge) {
      throw oauthError('invalid_grant', 'Verifikasi PKCE gagal');
    }

    // Tandai terpakai (sekali-pakai) sebelum menerbitkan token.
    record.consumedAt = new Date();
    await this.codes.save(record);

    const user = await this.usersService.findById(record.userId);
    if (!user || user.status !== 'active') {
      throw oauthError('invalid_grant', 'Akun tidak aktif');
    }

    return this.issue(user, client.clientId, record.scope, record.nonce);
  }

  private async refreshTokenGrant(dto: TokenDto): Promise<TokenResponse> {
    if (!dto.refresh_token) {
      throw oauthError('invalid_request', 'refresh_token wajib diisi');
    }
    const client = this.authenticateClient(dto);

    let payload: any;
    try {
      payload = this.keys.verify(dto.refresh_token, {
        issuer: this.issuer,
        audience: client.clientId,
      });
    } catch {
      throw oauthError('invalid_grant', 'refresh_token tidak valid');
    }
    if (payload.token_use !== 'refresh') {
      throw oauthError('invalid_grant', 'Bukan refresh_token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw oauthError('invalid_grant', 'Akun tidak aktif');
    }
    // Tidak menerbitkan refresh_token baru (klien menyimpan yang lama).
    return this.issue(user, client.clientId, payload.scope, null, false);
  }

  // ===================================================================
  // Userinfo
  // ===================================================================

  async userinfo(authorization?: string): Promise<Record<string, unknown>> {
    const token = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new UnauthorizedException('Bearer token wajib');

    let payload: any;
    try {
      payload = this.keys.verify(token, {
        issuer: this.issuer,
        audience: this.issuer,
      });
    } catch {
      throw new UnauthorizedException('Access token tidak valid');
    }
    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('Bukan access token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    const scopes = String(payload.scope ?? '').split(' ');
    return { sub: user.id, ...this.scopedClaims(user, scopes) };
  }

  // ===================================================================
  // Helper
  // ===================================================================

  private issue(
    user: User,
    clientId: string,
    scope: string,
    nonce: string | null,
    withRefresh = true,
  ): TokenResponse {
    const scopes = scope.split(' ').filter(Boolean);
    const now = Math.floor(Date.now() / 1000);

    const accessToken = this.keys.sign(
      {
        token_use: 'access',
        scope,
        client_id: clientId,
        azp: clientId,
      },
      { issuer: this.issuer, audience: this.issuer, subject: user.id, expiresIn: ACCESS_TTL_SEC },
    );

    const response: TokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_SEC,
      scope,
    };

    if (scopes.includes('openid')) {
      const idClaims: Record<string, unknown> = {
        token_use: 'id',
        auth_time: now,
        azp: clientId,
        ...this.scopedClaims(user, scopes),
      };
      if (nonce) idClaims.nonce = nonce;
      response.id_token = this.keys.sign(idClaims, {
        issuer: this.issuer,
        audience: clientId,
        subject: user.id,
        expiresIn: ID_TTL_SEC,
      });
    }

    if (withRefresh && scopes.includes('offline_access')) {
      response.refresh_token = this.keys.sign(
        { token_use: 'refresh', scope },
        { issuer: this.issuer, audience: clientId, subject: user.id, expiresIn: REFRESH_TTL_SEC },
      );
    }

    return response;
  }

  /** Klaim identitas sesuai scope yang disetujui (profile / email). */
  private scopedClaims(user: User, scopes: string[]): Record<string, unknown> {
    const claims: Record<string, unknown> = {};
    if (scopes.includes('profile')) {
      claims.name = user.name;
      claims.preferred_username = user.email;
    }
    if (scopes.includes('email')) {
      claims.email = user.email;
      claims.email_verified = Boolean(user.emailVerifiedAt);
    }
    return claims;
  }

  private requireValidClientRedirect(
    clientId: string,
    redirectUri: string,
  ): OAuthClient {
    const client = this.clients.find(clientId);
    if (!client) throw oauthError('invalid_client', 'Klien tidak dikenal');
    if (!this.clients.isRedirectAllowed(client, redirectUri)) {
      throw oauthError('invalid_request', 'redirect_uri tidak terdaftar');
    }
    return client;
  }

  /** Autentikasi klien di token endpoint (rahasia untuk klien confidential). */
  private authenticateClient(dto: TokenDto): OAuthClient {
    const client = this.clients.find(dto.client_id);
    if (!client) throw oauthError('invalid_client', 'Klien tidak dikenal');
    if (this.clients.isConfidential(client) && dto.client_secret !== client.clientSecret) {
      throw new UnauthorizedException({
        error: 'invalid_client',
        error_description: 'client_secret salah',
      });
    }
    return client;
  }

  private resolveScopes(scope: string, client: OAuthClient): string[] {
    const requested = (scope ?? '').split(' ').map((s) => s.trim()).filter(Boolean);
    if (!requested.includes('openid')) {
      throw oauthError('invalid_scope', 'scope "openid" wajib untuk OIDC');
    }
    for (const s of requested) {
      if (!SUPPORTED_SCOPES.includes(s)) {
        throw oauthError('invalid_scope', `scope tidak didukung: ${s}`);
      }
      if (!client.scopes.includes(s)) {
        throw oauthError('invalid_scope', `klien tidak diizinkan scope: ${s}`);
      }
    }
    return requested;
  }

  private redirect(
    base: string,
    params: Record<string, string>,
    state?: string,
  ): string {
    const url = new URL(base);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (state) url.searchParams.set('state', state);
    return url.toString();
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Bersihkan kode kedaluwarsa/terpakai tiap 10 menit. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupExpiredCodes(): Promise<void> {
    await this.codes.delete({ expiresAt: LessThan(new Date()) });
  }
}

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Verifikasi identitas Anda',
  profile: 'Nama dan profil dasar',
  email: 'Alamat email Anda',
  offline_access: 'Tetap masuk (akses berkelanjutan)',
};
