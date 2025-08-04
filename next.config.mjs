/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Enable standalone output for Docker production builds
  output: 'standalone',
}

export default nextConfig
