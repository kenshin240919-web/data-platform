import type { NextConfig } from 'next';
// Static export (apps/traffic/out); live speeds and incidents come from the Worker's /api routes at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export' };
export default config;
