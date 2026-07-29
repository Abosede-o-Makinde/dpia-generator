import { Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { config } from '../../common/config';

/**
 * Object storage abstraction: S3-compatible (AWS S3, Cloudflare R2, MinIO,
 * Azure via S3-proxy) when configured, local filesystem fallback for
 * development.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;

  constructor() {
    const cfg = config();
    this.s3 =
      cfg.S3_ACCESS_KEY_ID && cfg.S3_SECRET_ACCESS_KEY
        ? new S3Client({
            region: cfg.S3_REGION,
            endpoint: cfg.S3_ENDPOINT,
            forcePathStyle: cfg.S3_FORCE_PATH_STYLE,
            credentials: {
              accessKeyId: cfg.S3_ACCESS_KEY_ID,
              secretAccessKey: cfg.S3_SECRET_ACCESS_KEY,
            },
          })
        : null;
    if (!this.s3) {
      this.logger.warn('S3 not configured — using local filesystem storage (dev only)');
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.s3) {
      const sse = config().S3_SERVER_SIDE_ENCRYPTION;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: config().S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
          ...(sse ? { ServerSideEncryption: sse } : {}),
        }),
      );
      return;
    }
    const path = this.localPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async get(key: string): Promise<Buffer> {
    if (this.s3) {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: config().S3_BUCKET, Key: key }),
      );
      return Buffer.from(await res.Body!.transformToByteArray());
    }
    return readFile(this.localPath(key));
  }

  /** Presigned download URL (S3) or null when running on local storage. */
  async presignDownload(key: string, expiresIn = 300): Promise<string | null> {
    if (!this.s3) return null;
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: config().S3_BUCKET, Key: key }), {
      expiresIn,
    });
  }

  private localPath(key: string): string {
    // Normalise and confine within the upload dir (no traversal).
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return join(config().UPLOAD_DIR, safe);
  }
}
