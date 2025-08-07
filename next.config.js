/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig 