import type { NextConfig } from 'next';
// Static export (apps/school/out); 학교 상세, 급식·학사일정·시간표 and search come from the Worker at runtime.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
