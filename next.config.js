/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.selfridges.com" },
      { protocol: "https", hostname: "images.selfridges.com" },
      { protocol: "https", hostname: "**.scene7.com" },
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ["playwright", "playwright-core"]
  }
};

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  // Don't ever cache /admin or API responses — they're personal / dynamic.
  publicExcludes: ["!noprecache/**/*"]
});

module.exports = withPWA(nextConfig);
