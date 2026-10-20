import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../campusly-api/src/components/media/storage.service';
import { PrismaService } from '../../campusly-api/src/database/prisma.service';
import { STALE_UPLOAD_HOURS } from '../../campusly-api/src/libs/config';
import { errorReason } from '../../campusly-api/src/libs/utils/error-reason';

/** The work behind each cron job (the schedule itself is in BatchCron) */
@Injectable()
export class CampuslyBatchService {
  private readonly logger = new Logger('Batch');

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
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
}
