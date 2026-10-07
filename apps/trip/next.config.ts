import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'standalone', outputFileTracingRoot: process.cwd() + '/../..' };
export default config;
