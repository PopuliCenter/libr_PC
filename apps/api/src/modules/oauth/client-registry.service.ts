import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OAuthClient {
  clientId: string;
  name: string;
  /** Null/undefined => klien publik (hanya PKCE). Diisi => klien rahasia. */
  clientSecret?: string | null;
  redirectUris: string[];
  /** Scope yang boleh diminta klien ini. */
  scopes: string[];
  logoUri?: string;
}

/**
 * Registri klien OAuth2 dari konfigurasi (env `OAUTH_CLIENTS`, JSON array).
 * Bukan admin-UI — daftar klien internal Populi (aplikasi survei, pendaftaran
 * acara, dsb.) sengaja dikelola lewat env agar tak ada permukaan tulis publik.
 * Di non-produksi, bila kosong, sebuah klien pengembangan diseed otomatis.
 */
@Injectable()
export class ClientRegistryService {
  private readonly logger = new Logger(ClientRegistryService.name);
  private readonly clients = new Map<string, OAuthClient>();

  constructor(config: ConfigService) {
    const raw = (config.get<string>('OAUTH_CLIENTS', '') ?? '').trim();
    let parsed: OAuthClient[] = [];

    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(
          'OAUTH_CLIENTS bukan JSON valid. Contoh: [{"clientId":"populi-survey","name":"Aplikasi Survei Populi","clientSecret":"...","redirectUris":["https://survei.populicenter.org/auth/callback"],"scopes":["openid","profile","email"]}]',
        );
      }
    }

    if (parsed.length === 0 && process.env.NODE_ENV !== 'production') {
      parsed = [
        {
          clientId: 'populi-survey-dev',
          name: 'Aplikasi Survei Populi (dev)',
          clientSecret: 'dev-survey-secret',
          redirectUris: [
            'http://localhost:4000/auth/callback',
            'http://localhost:3000/oauth/dev-callback',
          ],
          scopes: ['openid', 'profile', 'email', 'offline_access'],
        },
      ];
      this.logger.warn(
        'OAUTH_CLIENTS kosong — memakai klien pengembangan "populi-survey-dev". Set OAUTH_CLIENTS di produksi.',
      );
    }

    for (const c of parsed) {
      if (!c.clientId || !Array.isArray(c.redirectUris)) {
        throw new Error(
          `Klien OAuth tidak valid (butuh clientId & redirectUris): ${JSON.stringify(c)}`,
        );
      }
      this.clients.set(c.clientId, {
        ...c,
        name: c.name ?? c.clientId,
        scopes: c.scopes ?? ['openid', 'profile', 'email'],
      });
    }
  }

  find(clientId: string): OAuthClient | undefined {
    return this.clients.get(clientId);
  }

  /** Redirect URI harus cocok persis dengan salah satu yang terdaftar. */
  isRedirectAllowed(client: OAuthClient, redirectUri: string): boolean {
    return client.redirectUris.includes(redirectUri);
  }

  /** Klien rahasia (punya secret) wajib membuktikan diri di token endpoint. */
  isConfidential(client: OAuthClient): boolean {
    return Boolean(client.clientSecret);
  }

  get configured(): boolean {
    return this.clients.size > 0;
  }
}
