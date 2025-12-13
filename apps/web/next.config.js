/** @type {import('next').NextConfig} */
// PWA disabled for simpler builds - can re-enable when needed
// const withPWA = require('@ducanh2912/next-pwa').default({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development',
// });

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@unmapped/lib'],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/data/packs/:path*',
        destination: '/api/packs/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
