import type { NextConfig } from 'next';
// Static export (apps/parking/out); 주차장 상세·내 주변 주차장·검색 come from the Worker at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
