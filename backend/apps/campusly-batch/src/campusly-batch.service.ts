import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSeedClient, resetDemoClasses } from '../../../prisma/demo-seed';
import { finishQuizAttempt } from '../../campusly-api/src/components/assignment/quiz-grading';
import { StorageService } from '../../campusly-api/src/components/media/storage.service';
import { PrismaService } from '../../campusly-api/src/database/prisma.service';
import {
  QUIZ_GRACE_SEC,
  STALE_UPLOAD_HOURS,
  type Env,
} from '../../campusly-api/src/libs/config';
import { errorReason } from '../../campusly-api/src/libs/utils/error-reason';

/** The work behind each cron job (the schedule itself is in BatchCron) */
@Injectable()
export class CampuslyBatchService {
  private readonly logger = new Logger('Batch');

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Uploads that were started but never confirmed (browser closed, network lost): their files
   * cost money in S3 and they count against the user's pending-upload limit.
   * Safe to run twice: only rows that are still UPLOADING change.
   */
  public async failStaleUploads(now = new Date()): Promise<number> {
    const before = new Date(now.getTime() - STALE_UPLOAD_HOURS * 3_600_000);
    const stale = await this.prismaService.mediaAsset.findMany({
      where: { status: 'UPLOADING', createdAt: { lt: before } },
      select: { id: true, s3Key: true },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    if (stale.length === 0) return 0;

    // A file may or may not be in S3; deleting a missing key is not an error
    if (this.storageService.isEnabled) {
      for (const asset of stale) {
        if (!asset.s3Key) continue;
        try {
          await this.storageService.delete(asset.s3Key);
        } catch (err) {
          // One failed delete must not stop the rest; the next run tries again
          this.logger.warn(
            `Could not delete ${asset.s3Key}: ${errorReason(err)}`,
          );
        }
      }
    }

    const { count } = await this.prismaService.mediaAsset.updateMany({
      where: { id: { in: stale.map((a) => a.id) }, status: 'UPLOADING' },
      data: { status: 'FAILED' },
    });
    return count;
  }

  /**
   * The demo classes (9A / 11A) go back to fresh seed data every night, so one visitor's changes
   * do not stay for the next; the story is moved forward in whole weeks, so deadlines and "this
   * week" stay current. Only 9A / 11A and the demo accounts' traces change: the admin's data and
   * the other classes are never touched (DECISIONS §12, demo v2). BatchCron calls it only when
   * DEMO_MODE=true.
   */
  public async resetDemo(now = new Date()) {
    // Its own short connection: the seed writes columns that PrismaService hides
    const client = createSeedClient(
      this.config.get('DATABASE_URL', { infer: true }),
    );
    try {
      return await resetDemoClasses(client, { shiftTo: now });
    } finally {
      await client.$disconnect();
    }
  }

  /**
   * Quiz attempts whose time ran out while nobody looked (the student closed the tab): graded
   * now from the saved answers, so the teacher sees the score without waiting for a page view.
   */
  public async closeExpiredQuizAttempts(now = new Date()): Promise<number> {
    const before = new Date(now.getTime() - QUIZ_GRACE_SEC * 1000);
    const expired = await this.prismaService.quizAttempt.findMany({
      where: { submittedAt: null, deadlineAt: { lt: before } },
      select: { id: true },
      take: 200,
    });
    let closed = 0;
    for (const { id } of expired) {
      if (await finishQuizAttempt(this.prismaService, id, now)) closed++;
    }
    return closed;
  }
}
