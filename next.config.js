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

module.exports = nextConfig;
