import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard Google OAuth yang gagal dengan pesan jelas (503) bila
 * GOOGLE_CLIENT_ID belum dikonfigurasi, alih-alih error internal.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get('GOOGLE_CLIENT_ID')) {
      throw new ServiceUnavailableException(
        'Login Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET.',
      );
    }
    return super.canActivate(context);
  }
}
