import type { NextConfig } from 'next';
// Static export for Cloudflare Workers static assets (output in apps/trip/out).
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export' };
export default config;
