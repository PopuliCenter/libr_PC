import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DATETIME } from '../../../database/column-types';

/**
 * Kode otorisasi OAuth2 sekali-pakai (Authorization Code + PKCE).
 * Berumur pendek (~60 detik) dan ditandai `consumedAt` begitu ditukar token,
 * agar tidak bisa diputar ulang (replay). Disimpan sebagai hash, bukan mentah.
 */
@Entity('oauth_authorization_codes')
export class OAuthAuthorizationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  codeHash: string;

  @Column()
  clientId: string;

  @Column()
  userId: string;

  @Column()
  redirectUri: string;

  /** Scope yang disetujui, dipisah spasi (mis. "openid profile email"). */
  @Column()
  scope: string;

  @Column({ type: 'varchar', nullable: true })
  nonce: string | null;

  @Column()
  codeChallenge: string;

  @Column({ default: 'S256' })
  codeChallengeMethod: string;

  @Column({ type: DATETIME })
  expiresAt: Date;

  @Column({ type: DATETIME, nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
