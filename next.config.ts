/** @type {import('next').NextConfig} */

const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
}

module.exports = nextConfig