import type { NextConfig } from 'next';
// Static export (apps/weather/out); live weather comes from the Worker's /api routes at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export' };
export default config;
