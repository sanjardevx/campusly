import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuditChange, AuditLogs } from '../../libs/dto/audit/audit';
import type { AuditLogsInquiry } from '../../libs/dto/audit/audit.input';
import type { RecordExportInput } from '../../libs/dto/records/records.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { RecordReport } from '../../libs/enums/records.enum';
import type { AuthUser } from '../../libs/types/auth';
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

  /** Records page: nothing changes, so there is no transaction — the row is the whole action */
  public logRecordExport(
    admin: AuthUser,
    input: RecordExportInput,
  ): Promise<void> {
    return this.log(this.prismaService, {
      actor: admin,
      action: AuditAction.RECORDS_EXPORT,
      entityType: TARGET_TYPE[input.report],
      entityId: input.targetId,
      after: { report: input.report, format: input.format, scope: input.scope },
    });
  }

  /**
   * Admin Activity log (read only): newest first. Each row carries only the fields that changed,
   * so the page shows "status: ACTIVE → BLOCKED" instead of two whole snapshots.
   */
  public async getAuditLogs(input: AuditLogsInquiry): Promise<AuditLogs> {
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        input.action ? { action: input.action } : {},
        input.actorId ? { actorId: input.actorId } : {},
      ],
    };
    const [total, rows] = await this.prismaService.$transaction([
      this.prismaService.auditLog.count({ where }),
      this.prismaService.auditLog.findMany({
        where,
        // id (UUID v7, time-ordered) as a tie-breaker: rows of one transaction keep their order
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          actor: {
            select: {
              id: true,
              loginId: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
    ]);
    return {
      metaCounter: { total },
      list: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        target: auditTarget(row.after) ?? auditTarget(row.before),
        actor: row.actor,
        changes: auditChanges(row.before, row.after),
        createdAt: row.createdAt,
      })),
    };
  }
}

/** Bookkeeping columns: they change on every update and say nothing to an admin */
const HIDDEN_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);
const MAX_CHANGES = 20;
const MAX_VALUE_LENGTH = 200;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A stored JSON value as one short line ("ACTIVE", "18.5", '["9A","9B"]') */
function shortText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH
    ? `${text.slice(0, MAX_VALUE_LENGTH - 1)}…`
    : text;
}

/**
 * The fields that differ between two snapshots. A create (no before) lists what was set,
 * an action without snapshots (an export) lists its details. Secrets were already "***".
 */
export function auditChanges(before: unknown, after: unknown): AuditChange[] {
  const b = isRecord(before) ? before : {};
  const a = isRecord(after) ? after : {};
  if (!isRecord(before) && !isRecord(after)) {
    const value = shortText(after ?? before);
    return value === null
      ? []
      : [{ field: 'value', before: null, after: value }];
  }
  const fields = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return fields
    .filter((f) => !HIDDEN_FIELDS.has(f))
    .filter((f) => JSON.stringify(b[f]) !== JSON.stringify(a[f]))
    .slice(0, MAX_CHANGES)
    .map((field) => ({
      field,
      before: shortText(b[field]),
      after: shortText(a[field]),
    }));
}

/** A readable name for the changed record: a person, a class, a course, a period … */
export function auditTarget(snapshot: unknown): string | null {
  if (!isRecord(snapshot)) return null;
  const { firstName, lastName, title, name } = snapshot;
  if (typeof firstName === 'string' || typeof lastName === 'string') {
    return [firstName, lastName].filter((v) => typeof v === 'string').join(' ');
  }
  if (typeof title === 'string') return title;
  if (typeof name === 'string') return name;
  return null;
}

/** Which model `targetId` points to, per document */
const TARGET_TYPE: Record<RecordReport, string> = {
  STUDENTS: 'Group',
  GRADES: 'Course',
  ATTENDANCE: 'Course',
  REPORT_CARD: 'User',
};

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
