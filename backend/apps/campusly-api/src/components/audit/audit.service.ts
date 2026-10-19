import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction } from '../../libs/enums/audit.enum';
import { redact } from '../../libs/interceptor/Logging.interceptor';

export interface AuditEntry {
  /** Who did it (null = system or batch job) */
  actor: { id: string; ip?: string } | null;
  action: AuditAction;
  /** Model name, e.g. "User", "AcademicYear" */
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * "Who changed what" log — the safety net that replaces hard deletes (DECISIONS §5).
 * Nestar had none: after `memberStatus: DELETE` nobody knew who did it.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Pass the SAME transaction that makes the change: either both the change and its audit row
   * are saved, or neither is (no silent changes).
   */
  public async log(
    tx: Prisma.TransactionClient | PrismaService,
    entry: AuditEntry,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorId: entry.actor?.id ?? null,
        ip: entry.actor?.ip ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: toAuditJson(entry.before),
        after: toAuditJson(entry.after),
      },
    });
  }
}

/** Secrets (password hashes, tokens) become "***"; Dates become ISO strings; undefined → no value */
export function toAuditJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(redact(value), jsonReplacer),
  ) as Prisma.InputJsonValue;
}

/** JSON.stringify cannot serialize BigInt (MediaAsset.size); Decimal and Date have toJSON already */
function jsonReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}
