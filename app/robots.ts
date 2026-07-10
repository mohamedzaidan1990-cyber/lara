import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout", "/order", "/track"],
      },
    ],
    sitemap: "https://www.seasonsbyb.co.uk/sitemap.xml",
  };
}
