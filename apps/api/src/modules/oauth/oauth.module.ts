import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { ClientRegistryService } from './client-registry.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { OidcKeyService } from './oidc-key.service';
import { OAuthAuthorizationCode } from './entities/authorization-code.entity';

/**
 * OpenID Connect Provider (PRD I1 — akun tunggal Populi / SSO).
 * Perpustakaan bertindak sebagai penerbit identitas untuk aplikasi survei
 * dan layanan Populi lainnya.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OAuthAuthorizationCode]), UsersModule],
  controllers: [OAuthController],
  providers: [OAuthService, OidcKeyService, ClientRegistryService],
})
export class OAuthModule {}
