import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicKey,
  generateKeyPairSync,
  KeyObject,
} from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Menyimpan kunci penandatangan OIDC dan menandatangani/memverifikasi token
 * dengan RS256. Kunci publik dipublikasikan sebagai JWKS agar klien (aplikasi
 * survei) memverifikasi id_token tanpa berbagi rahasia.
 *
 * Produksi: set `OIDC_PRIVATE_KEY` (PEM PKCS#8; escape newline sebagai \n).
 * Dev: bila kosong, kunci RSA sementara dibuat saat boot (token tidak bertahan
 * setelah restart) dengan peringatan.
 */
@Injectable()
export class OidcKeyService {
  private readonly logger = new Logger(OidcKeyService.name);
  private readonly privateKeyPem: string;
  private readonly publicKeyPem: string;
  private readonly publicKey: KeyObject;
  readonly kid: string;

  constructor(config: ConfigService) {
    this.kid = config.get<string>('OIDC_KEY_ID', 'populi-oidc-1');
    const configured = (config.get<string>('OIDC_PRIVATE_KEY', '') ?? '').trim();

    if (configured) {
      this.privateKeyPem = configured.replace(/\\n/g, '\n');
      this.publicKey = createPublicKey(this.privateKeyPem);
    } else {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      this.privateKeyPem = privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }) as string;
      this.publicKey = publicKey;
      this.logger.warn(
        'OIDC_PRIVATE_KEY kosong — memakai kunci RSA sementara (token OIDC tidak valid setelah restart). Set OIDC_PRIVATE_KEY di produksi.',
      );
    }

    this.publicKeyPem = this.publicKey.export({
      type: 'spki',
      format: 'pem',
    }) as string;
  }

  sign(payload: Record<string, unknown>, options: jwt.SignOptions): string {
    return jwt.sign(payload, this.privateKeyPem, {
      algorithm: 'RS256',
      keyid: this.kid,
      ...options,
    });
  }

  verify<T = jwt.JwtPayload>(token: string, options: jwt.VerifyOptions): T {
    return jwt.verify(token, this.publicKeyPem, {
      algorithms: ['RS256'],
      ...options,
    }) as T;
  }

  /** Dokumen JWKS publik (endpoint `jwks_uri`). */
  jwks(): { keys: Array<Record<string, unknown>> } {
    const jwk = this.publicKey.export({ format: 'jwk' });
    return {
      keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: this.kid }],
    };
  }
}
