import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../generated/prisma/client';

/**
 * Keeps class membership and course enrollment in step. Rows are never deleted: a student who
 * leaves gets `leftAt` / `DROPPED`, so the old grades and attendance keep their history.
 * Every method runs inside the caller's transaction.
 */
@Injectable()
export class EnrollmentService {
  /** The student joins a class and every whole-class course of it (e.g. "Algebra · 9A") */
  public async joinClass(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    now = new Date(),
  ): Promise<void> {
    // Coming back to a class reuses the old row (unique groupId + studentId)
    await tx.groupMember.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      create: { groupId, studentId, joinedAt: now },
      update: { joinedAt: now, leftAt: null },
    });

    const courses = await tx.course.findMany({
      where: { groupId, isSplitGroup: false, status: { not: 'ARCHIVED' } },
      select: { id: true },
    });
    await this.enroll(
      tx,
      courses.map((c) => ({ courseId: c.id, studentId })),
    );
  }

  /** The student leaves a class: every course of it is dropped (split groups too) */
  public async leaveClass(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    now = new Date(),
  ): Promise<void> {
    await tx.groupMember.updateMany({
      where: { groupId, studentId, leftAt: null },
      data: { leftAt: now },
    });
    await tx.enrollment.updateMany({
      where: { studentId, status: 'ACTIVE', course: { groupId } },
      data: { status: 'DROPPED', droppedAt: now },
    });
  }

  /** A new whole-class course: every current student of the class is enrolled */
  public async enrollClass(
    tx: Prisma.TransactionClient,
    courseId: string,
    groupId: string,
  ): Promise<void> {
    const members = await tx.groupMember.findMany({
      where: { groupId, leftAt: null },
      select: { studentId: true },
    });
    await this.enroll(
      tx,
      members.map((m) => ({ courseId, studentId: m.studentId })),
    );
  }

  /** New rows are created, DROPPED rows come back to ACTIVE (same row, same history) */
  private async enroll(
    tx: Prisma.TransactionClient,
    pairs: { courseId: string; studentId: string }[],
  ): Promise<void> {
    if (pairs.length === 0) return;
    await tx.enrollment.updateMany({
      where: { OR: pairs, status: 'DROPPED' },
      data: { status: 'ACTIVE', droppedAt: null },
    });
    await tx.enrollment.createMany({ data: pairs, skipDuplicates: true });
  }
}
