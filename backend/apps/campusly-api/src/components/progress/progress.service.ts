import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PROGRESS } from '../../libs/config';
import { LessonProgress } from '../../libs/dto/progress/progress';
import { LessonProgressInput } from '../../libs/dto/progress/progress.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AccessPolicy } from '../auth/policies/access.policy';

interface ProgressRow {
  id: string;
  lessonId: string;
  status: LessonProgress['status'];
  watchedSeconds: number;
  lastPositionSec: number;
  maxPositionSec: number;
  completedAt: Date | null;
  updatedAt: Date;
}

/**
 * A student's lesson progress. For videos (sequential watch rule, DECISIONS §11) the server never
 * trusts the player: until the lesson is completed, the furthest point grows only as fast as
 * real time at 1×. After that the student may watch at any speed from any point.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  /** Heartbeat from the video player */
  public async updateLessonProgress(
    user: AuthUser,
    input: LessonProgressInput,
  ): Promise<LessonProgress> {
    const lesson = await this.accessPolicy.assertCanViewLesson(
      user,
      input.lessonId,
    );
    const asset = lesson.videoAssetId
      ? await this.prismaService.mediaAsset.findUnique({
          where: { id: lesson.videoAssetId },
          select: { status: true, durationSec: true },
        })
      : null;
    if (lesson.type !== 'VIDEO' || asset?.status !== 'READY') {
      throw badRequest('This lesson has no video');
    }

    const key = { studentId: user.id, lessonId: lesson.id };
    const before = await this.prismaService.lessonProgress.findUnique({
      where: { studentId_lessonId: key },
    });
    // The teacher's upload knows the length; the player's value only fills a gap
    const duration =
      asset.durationSec ??
      (input.durationSec
        ? Math.max(input.durationSec, before?.maxPositionSec ?? 0)
        : null);
    const position = duration
      ? Math.min(input.positionSec, duration)
      : input.positionSec;

    if (!before) {
      // First heartbeat: a fresh start, so the furthest point can only be the very beginning.
      // Two tabs → one row (skipDuplicates).
      const start = Math.min(position, PROGRESS.toleranceSec);
      await this.prismaService.lessonProgress.createMany({
        data: [
          {
            ...key,
            status: 'IN_PROGRESS',
            lastPositionSec: start,
            maxPositionSec: start,
          },
        ],
        skipDuplicates: true,
      });
      return this.get(user.id, lesson.id, duration);
    }

    // Completed: any speed, any position. Only the resume point is kept.
    if (before.status === 'COMPLETED') {
      await this.prismaService.lessonProgress.update({
        where: { id: before.id },
        data: { lastPositionSec: position },
      });
      return this.get(user.id, lesson.id, duration);
    }

    const now = new Date();
    // Real time since the last heartbeat; a longer gap means paused or offline, not watching
    const elapsedSec = Math.min(
      (now.getTime() - before.updatedAt.getTime()) / 1000,
      PROGRESS.heartbeatSec,
    );
    const possible = elapsedSec * PROGRESS.maxSpeed + PROGRESS.toleranceSec;
    // The furthest point moves only by what 1× playback could cover: a jump ahead is cut back
    const maxPosition = Math.max(
      before.maxPositionSec,
      Math.min(position, before.maxPositionSec + possible),
    );
    // Seeking back is fine; a position past the furthest point is not saved (resume stays honest)
    const lastPosition = Math.min(position, maxPosition);
    const watched =
      before.watchedSeconds +
      Math.round(
        Math.max(0, Math.min(lastPosition - before.lastPositionSec, possible)),
      );
    const done =
      lesson.completionType === 'VIDEO_WATCHED' &&
      !!duration &&
      maxPosition >= (duration * PROGRESS.completePercent) / 100;

    // Only if nobody wrote in between (two tabs): the other heartbeat already counted this time
    await this.prismaService.lessonProgress.updateMany({
      where: { id: before.id, updatedAt: before.updatedAt },
      data: {
        watchedSeconds: watched,
        lastPositionSec: Math.round(lastPosition),
        maxPositionSec: Math.round(maxPosition),
        status: done ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: done ? now : null,
      },
    });
    return this.get(user.id, lesson.id, duration);
  }

  /** "Mark as done" (MANUAL) or "opened" (VIEW). A video lesson is completed only by watching. */
  public async completeLesson(
    user: AuthUser,
    lessonId: string,
  ): Promise<LessonProgress> {
    const lesson = await this.accessPolicy.assertCanViewLesson(user, lessonId);
    if (lesson.completionType === 'VIDEO_WATCHED') {
      throw badRequest('This lesson is completed by watching the video');
    }
    const now = new Date();
    const key = { studentId: user.id, lessonId: lesson.id };
    await this.prismaService.lessonProgress.upsert({
      where: { studentId_lessonId: key },
      create: { ...key, status: 'COMPLETED', completedAt: now },
      update: { status: 'COMPLETED' },
    });
    // The first completion time is kept
    await this.prismaService.lessonProgress.updateMany({
      where: { ...key, completedAt: null },
      data: { completedAt: now },
    });
    return this.get(user.id, lesson.id, null);
  }

  private async get(
    studentId: string,
    lessonId: string,
    duration: number | null,
  ): Promise<LessonProgress> {
    const row = await this.prismaService.lessonProgress.findUniqueOrThrow({
      where: { studentId_lessonId: { studentId, lessonId } },
    });
    return toProgress(row, duration);
  }
}

function toProgress(row: ProgressRow, duration: number | null): LessonProgress {
  return {
    lessonId: row.lessonId,
    status: row.status,
    watchedSeconds: row.watchedSeconds,
    lastPositionSec: row.lastPositionSec,
    maxPositionSec: row.maxPositionSec,
    // How far the student got (sequential rule), not the total time spent
    percent: duration
      ? Math.min(100, Math.floor((row.maxPositionSec / duration) * 100))
      : null,
    completedAt: row.completedAt,
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}
