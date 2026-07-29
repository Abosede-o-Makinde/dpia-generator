import {
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { RawFinding, Scanner, ScannerContext } from './types';

/**
 * Live AWS posture scan (S3 baseline). Requires read-only credentials in the
 * connector config: { accessKeyId, secretAccessKey, region }.
 *
 * Deliberately scoped to S3 encryption/public-access as the reference
 * implementation of the connector plugin API — IAM/CloudTrail/RDS checks
 * follow the same pattern (see docs/architecture/connectors.md).
 */
export class AwsScanner implements Scanner {
  readonly provider = 'AWS';

  async scan(ctx: ScannerContext): Promise<RawFinding[]> {
    const { accessKeyId, secretAccessKey, region } = ctx.config as {
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
    };
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS connector config requires accessKeyId and secretAccessKey');
    }
    const s3 = new S3Client({
      region: region ?? 'eu-west-2',
      credentials: { accessKeyId, secretAccessKey },
    });

    const findings: RawFinding[] = [];
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));

    for (const bucket of Buckets.slice(0, 50)) {
      const name = bucket.Name!;
      try {
        await s3.send(new GetBucketEncryptionCommand({ Bucket: name }));
      } catch {
        findings.push({
          severity: 'HIGH',
          category: 'encryption',
          resourceId: `s3://${name}`,
          title: 'S3 bucket without default encryption',
          description: `Bucket "${name}" has no default server-side encryption configuration.`,
          remediation: 'Enable SSE-S3 or SSE-KMS default encryption on the bucket.',
          dpiaHints: { encryption_at_rest: false },
        });
      }
      try {
        const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: name }));
        const cfg = pab.PublicAccessBlockConfiguration;
        const fullyBlocked =
          cfg?.BlockPublicAcls &&
          cfg.BlockPublicPolicy &&
          cfg.IgnorePublicAcls &&
          cfg.RestrictPublicBuckets;
        if (!fullyBlocked) {
          findings.push({
            severity: 'HIGH',
            category: 'public-exposure',
            resourceId: `s3://${name}`,
            title: 'S3 public access not fully blocked',
            description: `Bucket "${name}" does not enable all four public access block settings.`,
            remediation:
              'Enable the account- or bucket-level Public Access Block (all four flags).',
          });
        }
      } catch {
        findings.push({
          severity: 'MEDIUM',
          category: 'public-exposure',
          resourceId: `s3://${name}`,
          title: 'S3 public access block not configured',
          description: `Bucket "${name}" has no Public Access Block configuration.`,
          remediation: 'Configure the Public Access Block for the bucket.',
        });
      }
    }
    return findings;
  }
}
