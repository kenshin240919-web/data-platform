import type { NextConfig } from 'next';
// Static export (apps/service/out); 상세·내 주변·검색·상세 사이트맵 come from the Worker at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
