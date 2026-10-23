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
  FILE_URL_TTL_SEC,
  MAX_PENDING_UPLOADS,
  MIME_EXTENSIONS,
  UPLOAD_RULES,
  UPLOAD_URL_TTL_SEC,
  VIDEO_URL_TTL_SEC,
} from '../../libs/config';
import {
  FileLink,
  LessonVideo,
  MediaAsset,
  UploadTicket,
} from '../../libs/dto/media/media';
import {
  CreateSubmissionUploadInput,
  CreateUploadInput,
  UploadFileInput,
} from '../../libs/dto/media/media.input';
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

  /** A course file: the course's teachers (or admins) */
  public async createUpload(
    user: AuthUser,
    input: CreateUploadInput,
  ): Promise<UploadTicket> {
    await this.assertCanUpload(user);
    await this.accessPolicy.assertTeacherOf(user, input.courseId);
    return this.startUpload(user, input, `raw/${input.courseId}`, {
      durationSec: input.kind === 'VIDEO' ? input.durationSec : undefined,
    });
  }

  /**
   * A student's file for one assignment. The key holds the assignment id, so the file can only
   * be attached to this assignment (submitAssignment checks the prefix).
   */
  public async createSubmissionUpload(
    user: AuthUser,
    input: CreateSubmissionUploadInput,
  ): Promise<UploadTicket> {
    await this.assertCanUpload(user);
    const assignment = await this.accessPolicy.assertCanViewAssignment(
      user,
      input.assignmentId,
    );
    if (assignment.type === 'EXAM') {
      throw badRequest('An offline exam has no submission');
    }
    if (input.kind !== 'DOCUMENT' && input.kind !== 'IMAGE') {
      throw badRequest('Only documents and images can be submitted');
    }
    const ext = MIME_EXTENSIONS[input.mimeType];
    if (!ext || !assignment.acceptedFileTypes.includes(ext)) {
      throw badRequest(
        `This assignment accepts: ${assignment.acceptedFileTypes.join(', ')}`,
      );
    }
    return this.startUpload(
      user,
      input,
      submissionKeyPrefix(assignment.courseId, assignment.id),
    );
  }

  /** Media on, not a demo account (checked before anything else) */
  private async assertCanUpload(user: AuthUser) {
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
  }

  /** Type/size rules, pending limit, the asset row and the presigned PUT */
  private async startUpload(
    user: AuthUser,
    input: UploadFileInput,
    keyPrefix: string,
    extra: { durationSec?: number } = {},
  ): Promise<UploadTicket> {
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
          durationSec: extra.durationSec,
        },
      });
      const ext = MIME_EXTENSIONS[input.mimeType];
      return tx.mediaAsset.update({
        where: { id: created.id },
        data: { s3Key: `${keyPrefix}/${created.id}.${ext}` },
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

  /**
   * A 15-minute link for a course file (a FILE lesson's document or an assignment attachment).
   * Who may open it follows what they may see: the lesson or the assignment it is attached to
   * (AccessPolicy). The uploader may always open their own file (the drawer, before saving).
   */
  public async getCourseFileUrl(
    user: AuthUser,
    assetId: string,
  ): Promise<FileLink> {
    const asset = await this.prismaService.mediaAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset?.s3Key || asset.status !== 'READY' || asset.kind === 'VIDEO') {
      throw notFound('File not found');
    }

    if (asset.ownerId !== user.id) {
      const [resource, attachment, notice] = await Promise.all([
        this.prismaService.lessonResource.findFirst({
          where: { assetId },
          select: { lessonId: true },
        }),
        this.prismaService.assignmentFile.findFirst({
          where: { assetId, removedAt: null },
          select: { assignmentId: true },
        }),
        this.prismaService.announcementFile.findFirst({
          where: { assetId, removedAt: null },
          select: {
            announcement: {
              select: {
                courseId: true,
                status: true,
                publishedAt: true,
                course: { select: { status: true } },
              },
            },
          },
        }),
      ]);
      // Each check throws NOT_FOUND for users who may not see the lesson / assignment
      if (resource) {
        await this.accessPolicy.assertCanViewLesson(user, resource.lessonId);
      } else if (attachment) {
        await this.accessPolicy.assertCanViewAssignment(
          user,
          attachment.assignmentId,
        );
      } else if (notice) {
        // The same rule as the announcement list: active, published, a course the user may see
        const a = notice.announcement;
        const learner = user.role === 'STUDENT' || user.role === 'PARENT';
        if (a.status !== 'ACTIVE' || a.publishedAt > new Date()) {
          throw notFound('File not found');
        }
        if (a.courseId) {
          await this.accessPolicy.assertCanViewCourse(user, a.courseId);
          if (learner && a.course?.status === 'DRAFT') {
            throw notFound('File not found');
          }
        }
      } else {
        throw notFound('File not found');
      }
    }

    return {
      url: this.storageService.signedUrl(asset.s3Key, FILE_URL_TTL_SEC),
      expiresAt: new Date(Date.now() + FILE_URL_TTL_SEC * 1000),
    };
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
            select: {
              lastPositionSec: true,
              maxPositionSec: true,
              status: true,
            },
          })
        : null,
    ]);
    // Only a student's first watch of a "watch to complete" lesson is locked
    const isLocked =
      user.role === 'STUDENT' &&
      lesson.completionType === 'VIDEO_WATCHED' &&
      progress?.status !== 'COMPLETED';

    return {
      url: this.storageService.signedUrl(asset.s3Key, VIDEO_URL_TTL_SEC),
      expiresAt: new Date(Date.now() + VIDEO_URL_TTL_SEC * 1000),
      resumeAt: progress?.lastPositionSec ?? 0,
      watermark: viewer.loginId,
      isLocked,
      maxSeekSec: isLocked ? (progress?.maxPositionSec ?? 0) : null,
    };
  }
}

/** Where a student's files for one assignment live in S3 */
export function submissionKeyPrefix(courseId: string, assignmentId: string) {
  return `raw/${courseId}/submissions/${assignmentId}`;
}

/** Type and size by kind (UPLOAD_RULES); anything else is refused before S3 is touched */
function assertAllowedFile(input: UploadFileInput) {
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
