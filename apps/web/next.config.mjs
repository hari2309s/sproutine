/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@sproutine/ai',
    '@sproutine/db',
    '@sproutine/food',
    '@sproutine/types',
    '@sproutine/ui',
  ],
}

export default nextConfig
