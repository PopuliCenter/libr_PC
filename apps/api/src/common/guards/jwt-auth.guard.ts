import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global JWT. Endpoint non-@Public wajib token. Endpoint @Public tetap
 * MELAMPIRKAN pengguna bila token valid tersedia (auth opsional) tanpa menolak
 * saat token kosong/invalid — dipakai mis. katalog publik agar peneliti internal
 * melihat koleksi INTERNAL di katalog yang sama.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  canActivate(context: ExecutionContext) {
    // Selalu jalankan strategi agar user terlampir bila token ada; keputusan
    // menolak/mengizinkan ditangani di handleRequest.
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (this.isPublic(context)) {
      // Anonim diperbolehkan; user dilampirkan hanya bila token valid.
      return (user ?? undefined) as TUser;
    }
    return super.handleRequest(err, user, info, context);
  }
}
