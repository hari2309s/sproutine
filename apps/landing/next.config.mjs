/* global process */
// Every CTA points at the web app, so a production build without its URL would
// ship links to localhost.
if (process.env.VERCEL_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error('Set NEXT_PUBLIC_APP_URL to the web app URL for production builds')
}

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
