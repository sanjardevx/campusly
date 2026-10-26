import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { ENQUIRY_LIMIT } from '../../libs/config';
import type { EnquiryList, EnquiryRow } from '../../libs/dto/site/site';
import type {
  EnquiriesInput,
  SubmitEnquiryInput,
} from '../../libs/dto/site/site.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { EnquiryStatus } from '../../libs/enums/site.enum';
import type { AuthUser } from '../../libs/types/auth';
import { normalizeUzPhone } from '../../libs/utils/phone';
import { AuditService } from '../audit/audit.service';
import { badRequest, shortName } from './site-text';

const ENQUIRY_INCLUDE = {
  handledBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.EnquiryInclude;
type EnquiryDbRow = Prisma.EnquiryGetPayload<{
  include: typeof ENQUIRY_INCLUDE;
}>;

/**
 * "Questions about admission or a program?" (public form) and the admin inbox (Stitch
 * "Campusly Admin — Enquiries", Admissions tab). Nobody signs in, so the form is protected by
 * a per-IP limit in Redis and a honeypot field; no IP is stored, only "Chrome on Android".
 */
@Injectable()
export class EnquiryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {}

  public async submit(
    input: SubmitEnquiryInput,
    client: { ip: string; userAgent?: string },
  ): Promise<boolean> {
    // A bot filled the hidden field: answer "sent" so it learns nothing, store nothing
    if (input.website?.trim()) return true;

    const key = `enquiry:ip:${client.ip}`;
    const [count] = (await this.redisService
      .multi()
      .incr(key)
      .expire(key, ENQUIRY_LIMIT.windowSec, 'NX')
      .exec()) as [[Error | null, number]];
    if (count[1] > ENQUIRY_LIMIT.perIp) {
      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many enquiries. Please call the office.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const phone = normalizeUzPhone(input.phone);
    if (!phone) {
      throw new HttpException(
        {
          code: ErrorCode.INVALID_PHONE,
          message: 'Write an Uzbek mobile number',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const parentName = input.parentName.trim();
    if (parentName.length < 2) throw badRequest('Write your name');

    await this.prismaService.enquiry.create({
      data: {
        parentName,
        phone,
        childGrade: input.childGrade ?? null,
        interest: input.interest ?? null,
        locale: input.locale,
        userAgent: describeDevice(client.userAgent),
      },
    });
    return true;
  }

  /** The inbox: newest first; counts per status for the chips (search applies, status does not) */
  public async list(input: EnquiriesInput): Promise<EnquiryList> {
    const q = input.search?.trim();
    const digits = q?.replace(/\D/g, '');
    const search: Prisma.EnquiryWhereInput = q
      ? {
          OR: [
            { parentName: { contains: q, mode: 'insensitive' } },
            ...(digits && digits.length >= 3
              ? [{ phone: { contains: digits } }]
              : []),
          ],
        }
      : {};
    const [items, groups] = await Promise.all([
      this.prismaService.enquiry.findMany({
        where: { AND: [search, input.status ? { status: input.status } : {}] },
        include: ENQUIRY_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prismaService.enquiry.groupBy({
        by: ['status'],
        where: search,
        _count: true,
      }),
    ]);
    const count = (s: EnquiryStatus) =>
      groups.find((g) => g.status === s)?._count ?? 0;
    return {
      items: items.map(toRow),
      new: count('NEW'),
      inProgress: count('IN_PROGRESS'),
      resolved: count('RESOLVED'),
    };
  }

  public async setStatus(
    admin: AuthUser,
    id: string,
    status: EnquiryStatus,
  ): Promise<EnquiryRow> {
    const row = await this.prismaService.enquiry.findUnique({
      where: { id },
      include: ENQUIRY_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Enquiry not found',
      });
    }
    const before = toRow(row);
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.enquiry.update({
        where: { id },
        data: {
          status,
          handledById: status === 'NEW' ? null : admin.id,
          handledAt: status === 'NEW' ? null : new Date(),
        },
        include: ENQUIRY_INCLUDE,
      });
      const after = toRow(updated);
      await this.auditService.log(tx, {
        actor: admin,
        action: AuditAction.ENQUIRY_STATUS,
        entityType: 'Enquiry',
        entityId: id,
        before: { name: before.parentName, status: before.status },
        after: { name: after.parentName, status: after.status },
      });
      return after;
    });
  }
}

function toRow(row: EnquiryDbRow): EnquiryRow {
  return {
    id: row.id,
    parentName: row.parentName,
    phone: row.phone,
    childGrade: row.childGrade,
    interest: row.interest,
    locale: row.locale,
    userAgent: row.userAgent,
    status: row.status,
    handledBy: shortName(row.handledBy),
    handledAt: row.handledAt,
    createdAt: row.createdAt,
  };
}

/** "Mozilla/5.0 (Linux; Android 14) … Chrome/130" → "Chrome on Android" (enough for the office) */
export function describeDevice(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  const browser =
    [
      ['Edg/', 'Edge'],
      ['YaBrowser', 'Yandex'],
      ['SamsungBrowser', 'Samsung Internet'],
      ['OPR/', 'Opera'],
      ['Firefox/', 'Firefox'],
      ['Chrome/', 'Chrome'],
      ['Safari/', 'Safari'],
    ].find(([needle]) => userAgent.includes(needle))?.[1] ?? 'Browser';
  const os = [
    ['Android', 'Android'],
    ['iPhone', 'iPhone'],
    ['iPad', 'iPad'],
    ['Windows', 'Windows'],
    ['Mac OS X', 'macOS'],
    ['Linux', 'Linux'],
  ].find(([needle]) => userAgent.includes(needle))?.[1];
  return os ? `${browser} on ${os}` : browser;
}
