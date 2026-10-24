import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ErrorCode } from '../../libs/enums/common.enum';
import { toDbDate } from '../../libs/utils/date';

/**
 * The year's quarters (leaf periods, like the gradebook tabs) and the one to show: the one asked
 * for, else the current one (the last started), else the first. Shared by myGrades and
 * studentAttendance. A periodId from another year → NOT_FOUND.
 */
export async function yearPeriods(
  prismaService: PrismaService,
  academicYearId: string,
  today: string,
  periodId?: string,
) {
  const periods = await prismaService.period.findMany({
    where: { academicYearId, children: { none: {} } },
    orderBy: [{ startsAt: 'asc' }, { order: 'asc' }],
  });
  const period = periodId
    ? periods.find((p) => p.id === periodId)
    : ([...periods].reverse().find((p) => p.startsAt <= toDbDate(today)) ??
      periods[0]);
  if (periodId && !period) {
    throw new NotFoundException({
      code: ErrorCode.NOT_FOUND,
      message: 'Period not found in this academic year',
    });
  }
  return { periods, period };
}
