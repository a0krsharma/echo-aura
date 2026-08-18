import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://echo-aura.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/waves",
          "/clash",
          "/rooms",
          "/radar",
          "/search",
          "/frequency-plus",
          "/hashtag/",
          "/room/",
          "/stage/",
          "/login",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/notifications",
          "/wire",
          "/whispers",
          "/studio",
          "/record",
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Applebot",
          "Twitterbot",
          "facebookexternalhit",
          "LinkedInBot",
          "Discordbot",
        ],
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
