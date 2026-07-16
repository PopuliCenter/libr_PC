import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'audited';

export interface AuditedMeta {
  action: string;
  entity: string;
}

/**
 * Menandai endpoint agar aksinya dicatat ke audit log,
 * mis. @Audited('document.create', 'document').
 */
export const Audited = (action: string, entity: string) =>
  SetMetadata(AUDITED_KEY, { action, entity } satisfies AuditedMeta);
