import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  MAX_PENDING_UPLOADS,
  MIME_EXTENSIONS,
  UPLOAD_RULES,
  UPLOAD_URL_TTL_SEC,
  VIDEO_URL_TTL_SEC,
} from '../../libs/config';
import {
  LessonVideo,
  MediaAsset,
  UploadTicket,
} from '../../libs/dto/media/media';
import { CreateUploadInput } from '../../libs/dto/media/media.input';
import { ErrorCode } from '../../libs/enums/common.enum';
import type { AuthUser } from '../../libs/types/auth';
import { AccessPolicy } from '../auth/policies/access.policy';
import { StorageService } from './storage.service';

/**
 * Upload in two steps. The file never passes through this server:
 *   createUpload  → checks + MediaAsset UPLOADING + presigned PUT URL
 *   (browser PUTs the file to S3)
 *   confirmUpload → HeadObject: the file is really there and is what we allowed → READY
 */
@Injectable()
export class MediaService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly accessPolicy: AccessPolicy,
  ) {}

  public async createUpload(
    user: AuthUser,
    input: CreateUploadInput,
  ): Promise<UploadTicket> {
    if (!this.storageService.isEnabled) {
      throw new HttpException(
        {
          code: ErrorCode.MEDIA_DISABLED,
          message: 'File storage is not configured on this server',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const account = await this.prismaService.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { isDemo: true },
    });
    if (account.isDemo) throw forbidden('Demo accounts cannot upload files');
    await this.accessPolicy.assertTeacherOf(user, input.courseId);

    assertAllowedFile(input);
    const pending = await this.prismaService.mediaAsset.count({
      where: { ownerId: user.id, status: 'UPLOADING' },
    });
    if (pending >= MAX_PENDING_UPLOADS) {
      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message:
            'Too many unfinished uploads. Finish or wait for them first.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // The key is built from our ids only: the user's file name is just metadata
    const asset = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          ownerId: user.id,
          kind: input.kind,
          originalName: cleanFileName(input.fileName),
          mimeType: input.mimeType,
          size: BigInt(input.size),
        },
      });
      const ext = MIME_EXTENSIONS[input.mimeType];
      return tx.mediaAsset.update({
        where: { id: created.id },
        data: { s3Key: `raw/${input.courseId}/${created.id}.${ext}` },
      });
    });

    return {
      assetId: asset.id,
      uploadUrl: await this.storageService.presignUpload(
        asset.s3Key!,
        asset.mimeType,
        input.size,
      ),
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SEC * 1000),
    };
  }

  /** Never trusts the browser's "done": S3 is asked what is really stored */
  public async confirmUpload(
    user: AuthUser,
    assetId: string,
  ): Promise<MediaAsset> {
    const asset = await this.prismaService.mediaAsset.findUnique({
      where: { id: assetId },
    });
    // Someone else's upload "does not exist" for this user
    if (!asset || asset.ownerId !== user.id || !asset.s3Key) {
      throw notFound('Upload not found');
    }
    // A second click (or a retry after a network error) gets the same answer
    if (asset.status === 'READY') return toMediaAsset(asset);
    if (asset.status !== 'UPLOADING') {
      throw badRequest('This upload has failed; start a new one');
    }

    const stored = await this.storageService.head(asset.s3Key);
    if (!stored) throw badRequest('The file has not been uploaded yet');

    const matches =
      stored.size === Number(asset.size) && stored.mimeType === asset.mimeType;
    if (!matches) {
      await this.storageService.delete(asset.s3Key);
    }
    // Only an UPLOADING row changes: two confirms at the same time cannot both win
    await this.prismaService.mediaAsset.updateMany({
      where: { id: asset.id, status: 'UPLOADING' },
      data: { status: matches ? 'READY' : 'FAILED' },
    });
    if (!matches) {
      throw badRequest('The uploaded file is not the one that was allowed');
    }

    const ready = await this.prismaService.mediaAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    return toMediaAsset(ready);
  }

  /** A fresh 3-hour link for a lesson video, only for users who may see the lesson */
  public async getLessonVideo(
    user: AuthUser,
    lessonId: string,
  ): Promise<LessonVideo> {
    const lesson = await this.accessPolicy.assertCanViewLesson(user, lessonId);
    const asset = lesson.videoAssetId
      ? await this.prismaService.mediaAsset.findUnique({
          where: { id: lesson.videoAssetId },
        })
      : null;
    if (!asset?.s3Key || asset.status !== 'READY') {
      throw notFound('This lesson has no video yet');
    }

    const [viewer, progress] = await Promise.all([
      this.prismaService.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { loginId: true },
      }),
      // Only a student's own watching counts (parents and teachers may watch too)
      user.role === 'STUDENT'
        ? this.prismaService.lessonProgress.findUnique({
            where: { studentId_lessonId: { studentId: user.id, lessonId } },
            select: { lastPositionSec: true },
          })
        : null,
    ]);

    return {
      url: this.storageService.signedUrl(asset.s3Key, VIDEO_URL_TTL_SEC),
      expiresAt: new Date(Date.now() + VIDEO_URL_TTL_SEC * 1000),
      resumeAt: progress?.lastPositionSec ?? 0,
      watermark: viewer.loginId,
    };
  }
}

/** Type and size by kind (UPLOAD_RULES); anything else is refused before S3 is touched */
function assertAllowedFile(input: CreateUploadInput) {
  const rule = UPLOAD_RULES[input.kind as keyof typeof UPLOAD_RULES];
  if (!rule) throw badRequest(`${input.kind} files cannot be uploaded`);
  if (!(rule.mimeTypes as readonly string[]).includes(input.mimeType)) {
    throw badRequest(
      `${input.kind} must be one of: ${rule.mimeTypes.join(', ')}`,
    );
  }
  if (input.size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / 1024 ** 2);
    throw badRequest(`${input.kind} must be at most ${mb} MB`);
  }
}

// Newlines, tabs and other invisible characters do not belong in a file name
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** "C:\fakepath\Week 3.mp4" → "Week 3.mp4"; no control characters */
function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(CONTROL_CHARS, '').trim().slice(0, 200) || 'file';
}

function toMediaAsset(asset: {
  id: string;
  kind: MediaAsset['kind'];
  status: MediaAsset['status'];
  originalName: string;
  mimeType: string;
  size: bigint;
  createdAt: Date;
}): MediaAsset {
  return {
    id: asset.id,
    kind: asset.kind,
    status: asset.status,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    size: Number(asset.size),
    createdAt: asset.createdAt,
  };
}

function badRequest(message: string) {
  return new BadRequestException({ code: ErrorCode.BAD_REQUEST, message });
}

function forbidden(message: string) {
  return new ForbiddenException({ code: ErrorCode.FORBIDDEN, message });
}

function notFound(message: string) {
  return new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
}
