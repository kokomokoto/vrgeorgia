// Next.js default html-limited bots + Facebot/Messenger/Telegram (OG must be in <head>, not streamed to body)
const HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Facebot|Messenger|meta-external|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|SkypeUriPreview|Viber|Pinterestbot|Yeti|googleweblight|GPTBot|ChatGPT-User|ClaudeBot|PerplexityBot|Bytespider|CCBot|Amazonbot|Google-Extended/i;

const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  htmlLimitedBots: HTML_LIMITED_BOTS,
  reactStrictMode: true,
  webpack: (config) => {
    config.plugins.push(
      new webpack.ProvidePlugin({
        L: 'leaflet',
      })
    );
    return config;
  },
  allowedDevOrigins: [
    '10.0.2.15',
    '*.trycloudflare.com',
    '*.loca.lt',
  ],
  transpilePackages: ['@photo-sphere-viewer/core'],
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
        protocol: 'https',
        hostname: 'vhome.ge',
      },
      {
        protocol: 'https',
        hostname: '*.vhome.ge',
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
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    const api = 'http://127.0.0.1:5000';
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/uploads/:path*', destination: `${api}/uploads/:path*` },
      { source: '/v/:path*', destination: `${api}/v/:path*` },
    ];
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
