/** @type {import('next').NextConfig} */

// Backend MedStore mounts routes at the root (e.g. /auth/login, /patients).
// - Local dev: backend on 8001 (see README) unless BACKEND_INTERNAL_URL is set.
// - Docker: compose sets BACKEND_INTERNAL_URL=http://backend:8000.
const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8001';

const nextConfig = {
  reactStrictMode: false,
  experimental: {
    turbo: {},
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }
    return config;
  },
};

export default nextConfig;