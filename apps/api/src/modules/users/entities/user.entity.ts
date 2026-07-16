import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DATETIME } from '../../../database/column-types';

export type UserRole = 'member' | 'librarian' | 'superadmin';
export type UserStatus = 'pending' | 'active' | 'blocked';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  /** Null untuk akun yang dibuat via Google login. */
  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  institution: string | null;

  @Column({ type: 'varchar', default: 'member' })
  role: UserRole;

  @Column({ type: 'varchar', default: 'pending' })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  /** Slug kategori yang diminati anggota (segmentasi diseminasi — PRD I6). */
  @Column({ type: 'simple-json', default: '[]' })
  interests: string[];

  /** Persetujuan menerima notifikasi terbitan baru (non-transaksional, UU PDP). */
  @Column({ type: 'boolean', default: false })
  newsletterConsent: boolean;

  @Column({ type: DATETIME, nullable: true })
  newsletterConsentAt: Date | null;

  @Column({ type: DATETIME, nullable: true })
  emailVerifiedAt: Date | null;

  /** Token verifikasi email (hash) + kedaluwarsanya. */
  @Column({ type: 'varchar', nullable: true })
  verificationTokenHash: string | null;

  @Column({ type: DATETIME, nullable: true })
  verificationTokenExpiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
