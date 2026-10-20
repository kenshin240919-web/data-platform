import type { NextConfig } from 'next';
// Static export (apps/school/out); 병원 상세·내 주변 병원·검색 come from the Worker at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
