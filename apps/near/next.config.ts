import type { NextConfig } from 'next';
// Static export (apps/near/out). Live numbers on the home and situation pages come from the sister sites' /api/* in the browser.
const config: NextConfig = { transpilePackages: ['@guidejung/ui'], poweredByHeader: false, output: 'export', trailingSlash: false };
export default config;
