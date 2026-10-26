import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SITE_IMAGE_URL_TTL_SEC } from '../../libs/config';
import { ErrorCode } from '../../libs/enums/common.enum';
import { SITE_KEY_PREFIX } from '../media/media.service';
import { StorageService } from '../media/storage.service';

/** A row's picture: the uploaded asset (S3) or the demo picture shipped with the frontend */
export interface SiteImage {
  asset: { s3Key: string | null } | null;
  path: string | null;
}

/**
 * Pictures of the public website. Uploads are private S3 objects, so the page gets a CloudFront
 * link signed for a day (the page itself is rebuilt every few minutes). The seeded demo content
 * uses pictures under the frontend's /site folder until an admin uploads real ones.
 */
@Injectable()
export class SiteImages {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  public url({ asset, path }: SiteImage): string | null {
    if (asset?.s3Key && this.storageService.isEnabled) {
      return this.storageService.signedUrl(asset.s3Key, SITE_IMAGE_URL_TTL_SEC);
    }
    return path;
  }

  /** Only a finished website upload may be attached (not a course file or homework) */
  public async assertUsable(assetId: string): Promise<void> {
    const asset = await this.prismaService.mediaAsset.findUnique({
      where: { id: assetId },
      select: { status: true, kind: true, s3Key: true },
    });
    const ok =
      asset?.status === 'READY' &&
      asset.kind === 'IMAGE' &&
      !!asset.s3Key?.startsWith(`${SITE_KEY_PREFIX}/`);
    if (!ok) {
      throw new BadRequestException({
        code: ErrorCode.SITE_IMAGE_INVALID,
        message: 'Upload the picture again',
      });
    }
  }

  /**
   * The new image columns for a save: a new upload replaces the old picture (and the demo path),
   * `remove` clears both, nothing given keeps what is there.
   */
  public async nextImage(
    assetId: string | undefined,
    remove: boolean | undefined,
  ): Promise<{ assetId?: string | null; path?: string | null }> {
    if (assetId) {
      await this.assertUsable(assetId);
      return { assetId, path: null };
    }
    if (remove) return { assetId: null, path: null };
    return {};
  }
}
