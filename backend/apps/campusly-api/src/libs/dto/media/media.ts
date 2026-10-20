import { Field, Float, ObjectType } from '@nestjs/graphql';
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
