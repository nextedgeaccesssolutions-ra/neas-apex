/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolate the build output dir via env so a production build can run on its
  // own port without clobbering a concurrent `next dev` (which keeps `.next`).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Which product this deployment shows (lib/brand.ts). Inlined at build so
  // client components read the same value the server does.
  env: { GLADOS_BRAND: process.env.GLADOS_BRAND ?? '' },
  // Ad Engine was renamed Creative Engine (S02). Old bookmarks, history and
  // links keep working: 308, query string carried. S12's /reference rule
  // joins this same function (SPEC §5 C30).
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
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'node-ical', 'nodemailer'],
  },
};

export default nextConfig;
