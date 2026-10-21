import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MyPeriodGrades, PeriodGradeRow } from '../../libs/dto/grade/grade';
import {
  PublishPeriodGradesInput,
  SetPeriodFinalScoreInput,
} from '../../libs/dto/grade/grade.input';
import { AuditAction } from '../../libs/enums/audit.enum';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { toMark } from '../../libs/utils/grade';
import { AuditService } from '../audit/audit.service';
import { AccessPolicy } from '../auth/policies/access.policy';
import { SchoolService } from '../school/school.service';
import { GradeService, STUDENT_SELECT, StudentRef } from './grade.service';

type SnapshotRow = {
  computedScore: Prisma.Decimal | null;
  finalScore: Prisma.Decimal | null;
  publishedAt: Date | null;
};

const num = (d: Prisma.Decimal | null | undefined) =>
  d === null || d === undefined ? null : Number(d);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Period grades (DECISIONS §10): live until the teacher publishes, then a snapshot
 * (`computedScore`) that does not change by itself; `finalScore` is a manual override.
 * The annual grade = the override, or the average of the published periods.
 */
@Injectable()
export class PeriodGradeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
    private readonly auditService: AuditService,
    private readonly gradeService: GradeService,
    private readonly schoolService: SchoolService,
  ) {}

  /** Teacher: snapshot the live % of every active student */
  public async publishPeriodGrades(
    user: AuthUser,
    input: PublishPeriodGradesInput,
  ): Promise<PeriodGradeRow[]> {
    await this.accessPolicy.assertTeacherOf(user, input.courseId);
    await this.findPeriod(input.courseId, input.periodId);
    const students = await this.activeStudents(input.courseId);
    const live = await this.gradeService.compute(
      input.courseId,
      input.periodId,
      students,
    );

    const now = new Date();
    await this.prismaService.$transaction(async (tx) => {
      for (const grade of live) {
        // finalScore (a manual override) is kept when publishing again
        await upsertRow(
          tx,
          {
            studentId: grade.studentId,
            courseId: input.courseId,
            periodId: input.periodId,
          },
          {
            computedScore: grade.percent,
            publishedAt: now,
            publishedById: user.id,
          },
        );
      }
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.PERIOD_GRADES_PUBLISH,
        entityType: 'Course',
        entityId: input.courseId,
        after: { periodId: input.periodId, students: live.length },
      });
    });
    return this.getCoursePeriodGrades(user, input.courseId, input.periodId);
  }

  /** Teacher: a manual period (or annual, periodId null) grade; null removes it */
  public async setPeriodFinalScore(
    user: AuthUser,
    input: SetPeriodFinalScoreInput,
  ): Promise<PeriodGradeRow> {
    await this.accessPolicy.assertTeacherOf(user, input.courseId);
    const periodId = input.periodId ?? null;
    if (periodId) await this.findPeriod(input.courseId, periodId);
    const enrolled = await this.prismaService.enrollment.count({
      where: {
        courseId: input.courseId,
        studentId: input.studentId,
        status: 'ACTIVE',
      },
    });
    if (!enrolled) throw notFound('Student not found in this course');

    const key = {
      studentId: input.studentId,
      courseId: input.courseId,
      periodId,
    };
    const finalScore = input.finalScore ?? null;
    await this.prismaService.$transaction(async (tx) => {
      const before = await tx.periodGrade.findFirst({ where: key });
      const after = await upsertRow(tx, key, {
        finalScore,
        // An annual override is visible at once (there is nothing else to publish)
        ...(periodId === null && finalScore !== null
          ? { publishedAt: new Date(), publishedById: user.id }
          : {}),
      });
      await this.auditService.log(tx, {
        actor: user,
        action: AuditAction.PERIOD_GRADE_OVERRIDE,
        entityType: 'PeriodGrade',
        entityId: after.id,
        before: { finalScore: before?.finalScore ?? null },
        after: { finalScore: after.finalScore },
      });
    });

    if (periodId) {
      const rows = await this.getCoursePeriodGrades(
        user,
        input.courseId,
        periodId,
      );
      return rows.find((r) => r.studentId === input.studentId)!;
    }
    const student = await this.prismaService.user.findUniqueOrThrow({
      where: { id: input.studentId },
      select: STUDENT_SELECT,
    });
    return (await this.build(user, input.courseId, student)).annual;
  }

  /** Teacher screen: live %, snapshot, override and "outdated" for every active student */
  public async getCoursePeriodGrades(
    user: AuthUser,
    courseId: string,
    periodId: string,
  ): Promise<PeriodGradeRow[]> {
    await this.accessPolicy.assertTeacherOf(user, courseId);
    const period = await this.findPeriod(courseId, periodId);
    const students = await this.activeStudents(courseId);
    const [live, snapshots, settings] = await Promise.all([
      this.gradeService.compute(courseId, periodId, students),
      this.prismaService.periodGrade.findMany({
        where: { courseId, periodId },
      }),
      this.schoolService.getSettings(),
    ]);

    return students.map((student) => {
      const now = live.find((g) => g.studentId === student.id)?.percent ?? null;
      const snap = snapshots.find((s) => s.studentId === student.id) ?? null;
      return toRow(student, period, snap, now, true, settings);
    });
  }

  /** Student: own. Parent: a child. Admin: any student of the course. */
  public async getMyPeriodGrades(
    user: AuthUser,
    courseId: string,
    studentId?: string,
  ): Promise<MyPeriodGrades> {
    const id = await this.accessPolicy.resolveStudentScope(user, studentId);
    await this.accessPolicy.assertCanViewCourse(user, courseId);
    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: id } },
      include: {
        student: { select: STUDENT_SELECT },
        course: { select: { status: true } },
      },
    });
    if (!enrollment || enrollment.course.status === 'DRAFT') {
      throw notFound('Course not found');
    }
    return this.build(user, courseId, enrollment.student);
  }

  /** One student's grade in one period, for learner views (overview): snapshot or live */
  public async getStudentPeriodGrade(
    courseId: string,
    period: { id: string; name: string },
    student: StudentRef,
  ): Promise<PeriodGradeRow> {
    const [[live], snap, settings] = await Promise.all([
      this.gradeService.compute(courseId, period.id, [student]),
      this.prismaService.periodGrade.findFirst({
        where: { courseId, periodId: period.id, studentId: student.id },
      }),
      this.schoolService.getSettings(),
    ]);
    return toRow(student, period, snap, live.percent, false, settings);
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Every leaf period of the year (quarters, not the semesters above them) + the annual grade */
  private async build(
    viewer: AuthUser,
    courseId: string,
    student: StudentRef,
  ): Promise<MyPeriodGrades> {
    const staff = viewer.role === 'TEACHER' || viewer.role === 'ADMIN';
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { academicYearId: true },
    });
    const [periods, snapshots, settings] = await Promise.all([
      this.prismaService.period.findMany({
        where: {
          academicYearId: course.academicYearId,
          children: { none: {} },
        },
        orderBy: [{ startsAt: 'asc' }, { order: 'asc' }],
      }),
      this.prismaService.periodGrade.findMany({
        where: { courseId, studentId: student.id },
      }),
      this.schoolService.getSettings(),
    ]);

    const rows: PeriodGradeRow[] = [];
    for (const period of periods) {
      const [live] = await this.gradeService.compute(courseId, period.id, [
        student,
      ]);
      const snap = snapshots.find((s) => s.periodId === period.id) ?? null;
      rows.push(toRow(student, period, snap, live.percent, staff, settings));
    }

    // Annual: the override, or the average of the published periods
    const annualSnap = snapshots.find((s) => s.periodId === null) ?? null;
    const published = rows.filter((r) => r.isPublished && r.score !== null);
    const average = published.length
      ? round2(
          published.reduce((sum, r) => sum + r.score!, 0) / published.length,
        )
      : null;
    const override = num(annualSnap?.finalScore);
    const annualScore = override ?? average;

    return {
      periods: rows,
      annual: {
        periodId: null,
        periodName: 'Annual',
        studentId: student.id,
        loginId: student.loginId,
        firstName: student.firstName,
        lastName: student.lastName,
        score: annualScore,
        mark: toMark(annualScore, settings),
        isPublished: annualScore !== null,
        publishedAt: annualSnap?.publishedAt ?? null,
        livePercent: null,
        computedScore: staff ? average : null,
        finalScore: staff ? override : null,
        isOutdated: false,
      },
    };
  }

  private async findPeriod(courseId: string, periodId: string) {
    const course = await this.prismaService.course.findUniqueOrThrow({
      where: { id: courseId },
      select: { academicYearId: true },
    });
    const period = await this.prismaService.period.findFirst({
      where: { id: periodId, academicYearId: course.academicYearId },
    });
    if (!period) throw notFound('Period not found in this academic year');
    return period;
  }

  private async activeStudents(courseId: string): Promise<StudentRef[]> {
    const enrollments = await this.prismaService.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      include: { student: { select: STUDENT_SELECT } },
      orderBy: [
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });
    return enrollments.map((e) => e.student);
  }
}

/**
 * The one place a period grade becomes output. Students and parents see only the grade itself
 * (snapshot when published, live otherwise), never the snapshot/override details.
 */
function toRow(
  student: StudentRef,
  period: { id: string; name: string },
  snap: SnapshotRow | null,
  livePercent: number | null,
  staff: boolean,
  thresholds: Parameters<typeof toMark>[1],
): PeriodGradeRow {
  const isPublished = !!snap?.publishedAt;
  const computed = num(snap?.computedScore);
  const final = num(snap?.finalScore);
  const score = isPublished ? (final ?? computed) : livePercent;
  return {
    periodId: period.id,
    periodName: period.name,
    studentId: student.id,
    loginId: student.loginId,
    firstName: student.firstName,
    lastName: student.lastName,
    score,
    mark: toMark(score, thresholds),
    isPublished,
    publishedAt: snap?.publishedAt ?? null,
    livePercent: staff ? livePercent : null,
    computedScore: staff ? computed : null,
    finalScore: staff ? final : null,
    isOutdated: staff && isPublished && computed !== livePercent,
  };
}

/**
 * findFirst + create/update instead of upsert: the unique key contains a nullable periodId
 * (annual = null), which Prisma's compound-unique `where` cannot take. The index itself is
 * NULLS NOT DISTINCT, so two parallel creates still cannot make two rows.
 */
async function upsertRow(
  tx: Prisma.TransactionClient,
  key: { studentId: string; courseId: string; periodId: string | null },
  data: Prisma.PeriodGradeUncheckedUpdateInput,
) {
  const existing = await tx.periodGrade.findFirst({ where: key });
  if (existing) {
    return tx.periodGrade.update({ where: { id: existing.id }, data });
  }
  return tx.periodGrade.create({
    data: { ...key, ...(data as Prisma.PeriodGradeUncheckedCreateInput) },
  });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
