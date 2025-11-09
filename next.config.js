/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Railway works best with standard Next.js output
  // Remove standalone for Railway deployment
  images: {
    // Disable image optimization for Railway deployment
    // Railway doesn't support Next.js image optimization API by default
    unoptimized: true,
  },
  // Ensure static files are properly served
  trailingSlash: false,
}

module.exports = nextConfig

