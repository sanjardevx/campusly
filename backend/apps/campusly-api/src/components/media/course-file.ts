import type { Prisma } from '../../../../../generated/prisma/client';
import { CourseFile } from '../../libs/dto/media/media';

/** The asset columns a course page shows (never the S3 key) */
export const COURSE_FILE_SELECT = {
  id: true,
  kind: true,
  status: true,
  originalName: true,
  mimeType: true,
  size: true,
  durationSec: true,
} satisfies Prisma.MediaAssetSelect;

type CourseFileRow = Prisma.MediaAssetGetPayload<{
  select: typeof COURSE_FILE_SELECT;
}>;

export function toCourseFile(asset: CourseFileRow): CourseFile {
  return {
    id: asset.id,
    kind: asset.kind,
    status: asset.status,
    name: asset.originalName,
    mimeType: asset.mimeType,
    size: Number(asset.size),
    durationSec: asset.durationSec,
  };
}

/** Teachers attach only files uploaded for this course: the server-made key starts with raw/{courseId}/ */
export const isCourseUpload = (s3Key: string | null, courseId: string) =>
  !!s3Key?.startsWith(`raw/${courseId}/`);
