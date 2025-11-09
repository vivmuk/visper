/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    // Disable image optimization for Railway deployment
    // Railway doesn't support Next.js image optimization API by default
    unoptimized: true,
  },
  // Ensure static files are properly served
  trailingSlash: false,
}

module.exports = nextConfig

