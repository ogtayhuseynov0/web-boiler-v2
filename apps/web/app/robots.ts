import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://memoir.bot";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/settings", "/chapters", "/my-submissions", "/contribute"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
