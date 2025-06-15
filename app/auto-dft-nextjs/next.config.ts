/** @type {import('next').NextConfig} */
const nextConfig = {

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['www.aganitha.ai'],
  },
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./app/**/*.{css,js,ts,tsx}', './public/**/*'],
    },
  },
};

module.exports = nextConfig;