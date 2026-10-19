import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Role digit inside the login ID: 26 1 00042 → student, 26 2 00001 → teacher */
const ROLE_CODE = { STUDENT: 1, TEACHER: 2 } as const;
export type LoginIdRole = keyof typeof ROLE_CODE;

/**
 * Login IDs: YY + role digit + 5-digit sequence, e.g. 26100042 (DECISIONS §6).
 *
 * Never `MAX() + 1`: two admins could read the same max at the same moment and create the same ID.
 * The upsert reads and increments the counter row in ONE statement, and Postgres locks that row,
 * so a parallel call waits and gets the next number.
 */
@Injectable()
export class LoginIdService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Pass the transaction that creates the user: if creating the user fails,
   * the counter increment is rolled back too, so no number is wasted.
   */
  public async next(
    role: LoginIdRole,
    tx: Prisma.TransactionClient | PrismaService = this.prismaService,
    now = new Date(),
  ): Promise<string> {
    const year = now.getUTCFullYear();
    const roleCode = ROLE_CODE[role];

    const [{ lastValue }] = await tx.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO id_counters ("year", "roleCode", "lastValue")
      VALUES (${year}, ${roleCode}, 1)
      ON CONFLICT ("year", "roleCode")
      DO UPDATE SET "lastValue" = id_counters."lastValue" + 1
      RETURNING "lastValue"`;

    if (lastValue > 99_999) {
      throw new Error(`Login ID sequence for ${year}/${roleCode} is full`);
    }
    return `${year % 100}${roleCode}${String(lastValue).padStart(5, '0')}`;
  }
}
