import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { MediaKind, MediaStatus } from '../../enums/media.enum';

@ObjectType()
export class MediaAsset {
  @Field(() => String)
  id: string;

  @Field(() => MediaKind)
  kind: MediaKind;

  @Field(() => MediaStatus)
  status: MediaStatus;

  /** Shown in the UI only; the S3 key never uses it */
  @Field(() => String)
  originalName: string;

  @Field(() => String)
  mimeType: string;

  /** Bytes. Float, because a video can be larger than GraphQL's 32-bit Int (2 GB) */
  @Field(() => Float)
  size: number;

  @Field(() => Date)
  createdAt: Date;
}

/** What the browser needs to PUT the file straight to S3 */
@ObjectType()
export class UploadTicket {
  @Field(() => String)
  assetId: string;

  /** PUT the file here with the same Content-Type; valid until expiresAt */
  @Field(() => String)
  uploadUrl: string;

  @Field(() => Date)
  expiresAt: Date;
}

/** What the video player needs. The link is made for every request and is never stored. */
@ObjectType()
export class LessonVideo {
  /** CloudFront signed URL, valid until expiresAt (~3 h) */
  @Field(() => String)
  url: string;

  @Field(() => Date)
  expiresAt: Date;

  /** Seconds: where the student stopped last time (0 for teachers, parents, admins) */
  @Field(() => Int)
  resumeAt: number;

  /** The viewer's login ID, shown over the player: a screen recording shows who shared it */
  @Field(() => String)
  watermark: string;

  /**
   * Sequential watch rule (DECISIONS §11): true until the student completes the lesson.
   * The player then allows only ≤ 1× speed and no seeking past maxSeekSec.
   */
  @Field(() => Boolean)
  isLocked: boolean;

  /** Locked only: the furthest point reached; seeking beyond it is not allowed */
  @Field(() => Int, { nullable: true })
  maxSeekSec: number | null;
}

/** A file on the course page (a lesson video or file, an assignment attachment), without a link */
@ObjectType()
export class CourseFile {
  /** The MediaAsset id: `courseFileUrl(assetId)` gives the link, `lessonVideo` plays a video */
  @Field(() => String)
  id: string;

  @Field(() => MediaKind)
  kind: MediaKind;

  @Field(() => MediaStatus)
  status: MediaStatus;

  @Field(() => String)
  name: string;

  @Field(() => String)
  mimeType: string;

  /** Bytes */
  @Field(() => Float)
  size: number;

  /** Videos: the length read by the teacher's browser */
  @Field(() => Int, { nullable: true })
  durationSec: number | null;
}

/** A short-lived download link, made for each request and never stored */
@ObjectType()
export class FileLink {
  @Field(() => String)
  url: string;

  @Field(() => Date)
  expiresAt: Date;
}
