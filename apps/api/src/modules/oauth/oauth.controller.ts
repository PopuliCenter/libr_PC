import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { AuthorizeDto } from './dto/authorize.dto';
import { TokenDto } from './dto/token.dto';
import { OAuthService } from './oauth.service';

/**
 * OpenID Connect Provider — perpustakaan sebagai penerbit identitas Populi.
 * Aplikasi survei (dan layanan Populi lain) memakai Authorization Code + PKCE:
 *   1. arahkan pengguna ke halaman consent (authorization_endpoint di web)
 *   2. tukar code -> token di /oauth/token
 *   3. verifikasi id_token via /oauth/jwks, ambil profil via /oauth/userinfo
 */
@Controller()
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Public()
  @Get('.well-known/openid-configuration')
  discovery() {
    return this.oauth.discoveryDocument();
  }

  @Public()
  @Get('oauth/jwks')
  jwks() {
    return this.oauth.jwks();
  }

  /** Dipakai halaman consent untuk menampilkan nama klien + daftar scope. */
  @Public()
  @Get('oauth/authorize/context')
  context(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('scope') scope: string,
  ) {
    return this.oauth.authorizationContext(clientId, redirectUri, scope ?? 'openid');
  }

  /**
   * Persetujuan anggota (butuh login perpustakaan). Frontend mengirim token
   * akses anggota; kami membuat authorization code dan mengembalikan redirect.
   */
  @Audited('oauth.authorize', 'oauth')
  @Post('oauth/authorize')
  @HttpCode(200)
  authorize(@CurrentUser() user: User, @Body() dto: AuthorizeDto) {
    return this.oauth.authorize(user, dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('oauth/token')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  token(@Body() dto: TokenDto) {
    return this.oauth.token(dto);
  }

  @Public()
  @Get('oauth/userinfo')
  @Header('Cache-Control', 'no-store')
  userinfo(@Headers('authorization') authorization?: string) {
    return this.oauth.userinfo(authorization);
  }
}
