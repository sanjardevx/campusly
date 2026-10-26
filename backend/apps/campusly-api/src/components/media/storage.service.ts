import { readFileSync } from 'node:fs';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl as signCloudFrontUrl } from '@aws-sdk/cloudfront-signer';
import { getSignedUrl as presignS3 } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type Env,
  UPLOAD_URL_TTL_SEC,
  VIDEO_URL_TTL_SEC,
} from '../../libs/config';
import { ErrorCode } from '../../libs/enums/common.enum';

interface MediaConfig {
  bucket: string;
  cdnDomain: string;
  keyPairId: string;
  privateKey: string;
}

/**
 * The only place that talks to AWS. The rest of the app says "save / check / show this file" and
 * never sees S3. Tests replace this class with a fake, so CI needs no AWS keys.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');
  private readonly s3: S3Client;
  private readonly media: MediaConfig | null;

  constructor(config: ConfigService<Env, true>) {
    // Every media variable is a string; a missing one comes back as ''
    const env = (key: keyof Env): string =>
      String(config.get(key, { infer: true }) ?? '');
    const accessKeyId = env('AWS_ACCESS_KEY_ID');
    // No keys → the SDK finds them itself (EC2 IAM role in production)
    this.s3 = new S3Client({
      region: env('AWS_REGION'),
      credentials: accessKeyId
        ? { accessKeyId, secretAccessKey: env('AWS_SECRET_ACCESS_KEY') }
        : undefined,
    });

    // validateEnv guarantees: all media variables or none
    const bucket = env('S3_BUCKET');
    if (!bucket) {
      this.media = null;
      this.logger.warn(
        'Media is OFF (no S3_BUCKET): uploads and videos are disabled',
      );
      return;
    }
    const keyPath = env('CLOUDFRONT_PRIVATE_KEY_PATH');
    this.media = {
      bucket,
      cdnDomain: env('CLOUDFRONT_DOMAIN'),
      keyPairId: env('CLOUDFRONT_KEY_PAIR_ID'),
      // A wrong path stops the app now, not at the first video
      privateKey: keyPath
        ? readFileSync(keyPath, 'utf8')
        : env('CLOUDFRONT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    };
    this.logger.log(
      `Media is ON (bucket ${bucket}, CDN ${this.media.cdnDomain})`,
    );
  }

  public get isEnabled(): boolean {
    return this.media !== null;
  }

  /**
   * A URL the browser PUTs the file to, valid for 15 minutes. Type and size are signed:
   * S3 rejects a different file than the one we allowed.
   */
  public async presignUpload(
    key: string,
    mimeType: string,
    size: number,
  ): Promise<string> {
    const { bucket } = this.config();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
    });
    return presignS3(this.s3, command, {
      expiresIn: UPLOAD_URL_TTL_SEC,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
  }

  /** What is really stored under the key (null = nothing was uploaded) */
  public async head(
    key: string,
  ): Promise<{ size: number; mimeType: string } | null> {
    const { bucket } = this.config();
    try {
      const object = await this.s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      return {
        size: object.ContentLength ?? 0,
        mimeType: object.ContentType ?? '',
      };
    } catch (err) {
      if (
        err instanceof S3ServiceException &&
        err.$metadata.httpStatusCode === 404
      ) {
        return null;
      }
      throw err;
    }
  }

  /** The file's bytes (the batch reads lesson PDFs for the AI tutor's index) */
  public async download(key: string): Promise<Uint8Array> {
    const { bucket } = this.config();
    const object = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!object.Body) throw new Error(`Empty S3 object ${key}`);
    return object.Body.transformToByteArray();
  }

  public async delete(key: string): Promise<void> {
    const { bucket } = this.config();
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  /** A CloudFront link that stops working after `ttlSec` (default ~3 h) */
  public signedUrl(key: string, ttlSec = VIDEO_URL_TTL_SEC): string {
    const { cdnDomain, keyPairId, privateKey } = this.config();
    return signCloudFrontUrl({
      url: `https://${cdnDomain}/${key}`,
      keyPairId,
      privateKey,
      dateLessThan: new Date(Date.now() + ttlSec * 1000),
    });
  }

  private config(): MediaConfig {
    if (!this.media) {
      throw new ServiceUnavailableException({
        code: ErrorCode.MEDIA_DISABLED,
        message: 'File storage is not configured on this server',
      });
    }
    return this.media;
  }
}
