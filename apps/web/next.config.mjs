import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@shieldwise/shared'],
  typedRoutes: true,
  // Required for `output: 'standalone'` in a pnpm workspace: without this,
  // Next's file tracer doesn't look outside apps/web for the real targets
  // of pnpm's node_modules symlinks (../../.pnpm/...), and copies dangling
  // symlinks into .next/standalone instead of the packages they point to.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
