import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://echo-aura.vercel.app";
  const lastModified = new Date();

  // Core high-priority platform routes
  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/waves`,
      lastModified,
      changeFrequency: "always",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/clash`,
      lastModified,
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rooms`,
      lastModified,
      changeFrequency: "always",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/radar`,
      lastModified,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/search`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/frequency-plus`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Popular Trending Hashtags
  const popularHashtags = [
    "tech",
    "crypto",
    "ai",
    "startup",
    "music",
    "india",
    "news",
    "debates",
    "voice",
    "aura",
  ];

  const hashtagRoutes: MetadataRoute.Sitemap = popularHashtags.map((tag) => ({
    url: `${baseUrl}/hashtag/${tag}`,
    lastModified,
    changeFrequency: "hourly",
    priority: 0.75,
  }));

  return [...coreRoutes, ...hashtagRoutes];
}
