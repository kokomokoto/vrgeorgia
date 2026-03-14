/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production-ზე standalone output Render.com-ისთვის
  output: 'standalone',
  // სურათების დომენი
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.vrgeorgia.ge',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.206',
      },
      {
        protocol: 'https',
        hostname: 'vrgeorgia-api.onrender.com',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
