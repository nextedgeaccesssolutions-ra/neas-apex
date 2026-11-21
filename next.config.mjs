/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: { GLADOS_BRAND: process.env.GLADOS_BRAND ?? '' },
  serverExternalPackages: ['better-sqlite3', 'node-ical', 'nodemailer'],
  async redirects() {
    return [
      { source: '/ad-engine', destination: '/creative-engine', permanent: true },
      { source: '/ad-engine/:path*', destination: '/creative-engine/:path*', permanent: true },
      { source: '/reference', destination: '/blueprint', permanent: false },
      { source: '/content/lead-magnets', destination: '/lead-magnets', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/ad-engine/:path*', destination: '/api/creative-engine/:path*' },
      { source: '/content-media/ad-engine/:path*', destination: '/content-media/creative-engine/:path*' },
    ];
  },
};

export default nextConfig;
