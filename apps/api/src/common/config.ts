import { z } from 'zod';

/**
 * Environment configuration, validated once at boot.
 * Fail-fast: the process refuses to start with an invalid configuration.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  RABBITMQ_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().default(900), // seconds
  JWT_REFRESH_TTL: z.coerce.number().default(60 * 60 * 24 * 14),
  MFA_ENCRYPTION_KEY: z.string().min(16),

  ALLOW_SIGNUP: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  OIDC_ISSUER_URL: z.string().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),

  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_RP_NAME: z.string().default('Shieldwise Privacy Platform'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:3000'),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('eu-west-2'),
  S3_BUCKET: z.string().default('shieldwise-evidence'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  /**
   * Server-side encryption mode sent on upload. Leave empty for providers
   * that reject the header and encrypt at rest unconditionally — Cloudflare
   * R2 returns NotImplemented for `x-amz-server-side-encryption`.
   */
  S3_SERVER_SIDE_ENCRYPTION: z.enum(['AES256', 'aws:kms', '']).default('AES256'),
  /** Local uploads dir used when S3 is not configured (dev only). */
  UPLOAD_DIR: z.string().default('storage/uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().default(25 * 1024 * 1024),

  AI_URL: z.string().url().default('http://localhost:8000'),
  AI_SERVICE_TOKEN: z.string().default(''),

  LOG_LEVEL: z.string().default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | undefined;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return parsed.data;
}

export function config(): AppConfig {
  cached ??= loadConfig();
  return cached;
}

/** Test helper. */
export function resetConfigCache(): void {
  cached = undefined;
}
