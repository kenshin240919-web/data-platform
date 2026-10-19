import type { NextConfig } from 'next';
// Static export (apps/academy/out); academy details, search and the nearby list come from the Worker (D1) at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
