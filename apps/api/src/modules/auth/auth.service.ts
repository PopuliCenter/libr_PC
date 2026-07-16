import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { GoogleProfile } from './strategies/google.strategy';
import { JwtPayload } from './strategies/jwt.strategy';
import { RegisterDto } from './dto/register.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const token = randomBytes(32).toString('hex');
    await this.usersService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      institution: dto.institution ?? null,
      passwordHash: await argon2.hash(dto.password),
      status: 'pending',
      interests: dto.interests ?? [],
      newsletterConsent: dto.newsletterConsent ?? false,
      newsletterConsentAt: dto.newsletterConsent ? new Date() : null,
      verificationTokenHash: this.hashToken(token),
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    await this.mailService.sendVerificationEmail(
      dto.email,
      `${webUrl}/verify-email?email=${encodeURIComponent(dto.email)}&token=${token}`,
    );

    return {
      message: 'Registrasi berhasil. Silakan cek email untuk verifikasi.',
    };
  }

  async verifyEmail(email: string, token: string): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(email);
    if (
      !user ||
      user.status !== 'pending' ||
      !user.verificationTokenHash ||
      user.verificationTokenHash !== this.hashToken(token)
    ) {
      throw new BadRequestException('Token verifikasi tidak valid');
    }
    if (
      user.verificationTokenExpiresAt &&
      user.verificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Token verifikasi kedaluwarsa. Silakan daftar ulang.',
      );
    }

    await this.usersService.update(user.id, {
      status: 'active',
      emailVerifiedAt: new Date(),
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });

    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email atau password salah');
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Email atau password salah');
    if (user.status === 'pending') {
      throw new UnauthorizedException('Akun belum diverifikasi. Cek email Anda.');
    }
    if (user.status === 'blocked') {
      throw new UnauthorizedException('Akun diblokir. Hubungi pustakawan.');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token tidak valid');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Akun tidak aktif');
    }
    return this.issueTokens(user);
  }

  /** Login/registrasi otomatis via Google — akun langsung aktif (email sudah terverifikasi Google). */
  async loginWithGoogle(profile: GoogleProfile): Promise<TokenPair> {
    if (!profile.email) {
      throw new BadRequestException('Akun Google tidak memiliki email');
    }
    let user = await this.usersService.findByGoogleId(profile.googleId);
    if (!user) {
      const byEmail = await this.usersService.findByEmail(profile.email);
      user = byEmail
        ? await this.usersService.update(byEmail.id, {
            googleId: profile.googleId,
            status: byEmail.status === 'pending' ? 'active' : byEmail.status,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          })
        : await this.usersService.create({
            name: profile.name,
            email: profile.email,
            googleId: profile.googleId,
            passwordHash: null,
            status: 'active',
            emailVerifiedAt: new Date(),
          });
    }
    if (user.status === 'blocked') {
      throw new UnauthorizedException('Akun diblokir. Hubungi pustakawan.');
    }
    return this.issueTokens(user);
  }

  /** Anggota memperbarui minat / consent newsletter / nomor telepon. */
  async updatePreferences(
    userId: string,
    input: {
      interests?: string[];
      newsletterConsent?: boolean;
      phone?: string;
    },
  ): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Akun tidak aktif');

    const patch: Partial<User> = {};
    if (input.interests !== undefined) {
      patch.interests = [...new Set(input.interests.map((s) => s.trim()).filter(Boolean))];
    }
    if (input.phone !== undefined) {
      patch.phone = input.phone.trim() || null;
    }
    if (input.newsletterConsent !== undefined) {
      patch.newsletterConsent = input.newsletterConsent;
      // Catat momen consent berubah menjadi true (jejak persetujuan UU PDP).
      if (input.newsletterConsent && !user.newsletterConsent) {
        patch.newsletterConsentAt = new Date();
      }
      if (!input.newsletterConsent) patch.newsletterConsentAt = null;
    }
    return this.usersService.update(userId, patch);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const base = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...base, type: 'access' },
        { expiresIn: this.config.get('JWT_ACCESS_TTL', '900s') },
      ),
      this.jwtService.signAsync(
        { ...base, type: 'refresh' },
        { expiresIn: this.config.get('JWT_REFRESH_TTL', '30d') },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
