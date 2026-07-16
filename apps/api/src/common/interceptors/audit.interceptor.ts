import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDITED_KEY, AuditedMeta } from '../decorators/audited.decorator';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Mencatat aksi ber-@Audited() ke audit log setelah handler sukses.
 * Pencatatan tidak boleh menggagalkan request utama.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditedMeta>(
      AUDITED_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap((result) => {
        this.auditService
          .record({
            actorId: request.user?.id ?? null,
            action: meta.action,
            entity: meta.entity,
            entityId: this.extractEntityId(request, result),
            ip: request.ip,
            meta: {
              method: request.method,
              path: request.url,
              params: request.params,
            },
          })
          .catch(() => undefined);
      }),
    );
  }

  private extractEntityId(request: any, result: any): string | null {
    return String(request.params?.id ?? result?.id ?? '') || null;
  }
}
