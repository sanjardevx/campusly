import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IMPORT_LIMIT } from '../../libs/config';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import { ImportRowStatus } from '../../libs/enums/user.enum';
import {
  CreateStudentResult,
  ImportPreview,
  ImportResult,
} from '../../libs/dto/user/user';
import type { AuthUser } from '../../libs/types/auth';
import { parentLoginId } from '../../libs/utils/phone';
import {
  generateParentPassword,
  generateStudentPassword,
} from '../../libs/utils/temp-password';
import { AuditService } from '../audit/audit.service';
import { ImportRow, parseStudentCsv } from './student-import.parser';
import { UserAdminService } from './user-admin.service';

/** A row after the database checks: the class id is known, the status is decided */
interface CheckedRow extends ImportRow {
  groupId?: string;
  status: ImportRowStatus;
}

/**
 * Admin CSV import of students (design: Upload → Check data → Import & login slips).
 * The preview never writes; the import checks the file AGAIN (the data may have changed since the
 * preview) and creates everything in ONE transaction: all rows or none.
 */
@Injectable()
export class StudentImportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userAdminService: UserAdminService,
    private readonly auditService: AuditService,
  ) {}

  public async preview(csv: string): Promise<ImportPreview> {
    const rows = await this.check(parseStudentCsv(csv));
    return {
      rows: rows.map((r) => ({
        line: r.line,
        firstName: r.firstName,
        lastName: r.lastName,
        className: r.className,
        admissionYear: r.admissionYear ?? null,
        parentName: r.parent
          ? `${r.parent.firstName} ${r.parent.lastName}`
          : null,
        parentPhone: r.parent?.phone ?? null,
        status: r.status,
        errors: r.errors,
      })),
      summary: {
        ready: rows.filter((r) => r.status === ImportRowStatus.READY).length,
        linkParent: rows.filter((r) => r.status === ImportRowStatus.LINK_PARENT)
          .length,
        errors: rows.filter((r) => r.status === ImportRowStatus.ERROR).length,
      },
    };
  }

  public async import(
    admin: AuthUser,
    csv: string,
    skipErrors: boolean,
  ): Promise<ImportResult> {
    const rows = await this.check(parseStudentCsv(csv));
    const bad = rows.filter((r) => r.status === ImportRowStatus.ERROR);
    const good = rows.filter((r) => r.status !== ImportRowStatus.ERROR);
    if (bad.length && !skipErrors) {
      throw badRequest(
        `${bad.length} row(s) have errors. Fix them or turn on "Skip rows with errors".`,
      );
    }
    if (good.length === 0) throw badRequest('There is nothing to import');

    // bcrypt is slow on purpose: hash every password BEFORE the transaction starts
    const passwords = await Promise.all(
      good.map(async (row) => ({
        student: await this.userAdminService.preparePassword(
          generateStudentPassword(),
        ),
        parent: row.parent
          ? await this.userAdminService.preparePassword(
              generateParentPassword(),
            )
          : null,
      })),
    );

    const slips = await this.prismaService.$transaction(
      async (tx) => {
        const results: CreateStudentResult[] = [];
        for (const [i, row] of good.entries()) {
          // The same code as a single "Add student": the same rules, the same audit rows
          results.push(
            await this.userAdminService.createStudentTx(
              tx,
              admin,
              {
                firstName: row.firstName,
                lastName: row.lastName,
                groupId: row.groupId!,
                admissionYear: row.admissionYear,
                parent: row.parent,
              },
              passwords[i].student,
              passwords[i].parent,
            ),
          );
        }
        await this.auditService.log(tx, {
          actor: admin,
          action: AuditAction.USERS_IMPORT,
          entityType: 'User',
          after: {
            created: results.length,
            skippedLines: bad.map((r) => r.line),
          },
        });
        return results;
      },
      // Prisma's default 5 s is too short for hundreds of students
      { timeout: IMPORT_LIMIT.txTimeoutMs, maxWait: 10_000 },
    );

    return {
      created: slips.length,
      linkedParents: slips.filter((s) => s.parent && !s.parent.isNew).length,
      skipped: bad.length,
      slips,
    };
  }

  /** Database checks for all rows at once: 3 queries, not 3 per row */
  private async check(rows: ImportRow[]): Promise<CheckedRow[]> {
    const year = await this.prismaService.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true, name: true },
    });
    if (!year) throw badRequest('Set the current academic year first');

    const groups = await this.prismaService.group.findMany({
      where: { academicYearId: year.id, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    const groupIdByName = new Map(
      groups.map((g) => [g.name.toUpperCase(), g.id]),
    );

    const phones = [
      ...new Set(rows.flatMap((r) => (r.parent ? [r.parent.phone] : []))),
    ];
    const existingParents = await this.prismaService.parentProfile.findMany({
      where: { phone: { in: phones } },
      select: { phone: true },
    });
    // A parent login is the last 9 phone digits: it must not belong to someone who is not a parent
    const takenLogins = await this.prismaService.user.findMany({
      where: {
        loginId: { in: phones.map(parentLoginId) },
        role: { not: 'PARENT' },
      },
      select: { loginId: true },
    });
    const knownParents = new Set(existingParents.map((p) => p.phone));
    const takenLoginIds = new Set(takenLogins.map((u) => u.loginId));

    return rows.map((row) => {
      const errors = [...row.errors];
      const groupId = groupIdByName.get(row.className);
      if (row.className && !groupId) {
        errors.push(`Class ${row.className} not found in ${year.name}`);
      }
      if (row.parent && takenLoginIds.has(parentLoginId(row.parent.phone))) {
        errors.push('The parent login ID is already used by another account');
      }

      let status = ImportRowStatus.READY;
      if (errors.length) {
        status = ImportRowStatus.ERROR;
      } else if (row.parent) {
        if (knownParents.has(row.parent.phone))
          status = ImportRowStatus.LINK_PARENT;
        // A sibling further down the file links to the parent this row creates
        knownParents.add(row.parent.phone);
      }
      return { ...row, groupId, errors, status };
    });
  }
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}
