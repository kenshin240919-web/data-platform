import type { NextConfig } from 'next';
// Static export (apps/oil/out); 내 주변 주유소 come from the Worker at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
