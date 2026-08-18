import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://echo-aura.vercel.app";
  const lastModified = new Date();

  // Core high-priority platform routes for search engine indexing
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
      priority: 0.95,
    },
    {
      url: `${baseUrl}/rooms`,
      lastModified,
      changeFrequency: "always",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/radar`,
      lastModified,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/frequency-plus`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/terminal`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Comprehensive Top Audio & Voice Categories
  const discoveryHashtags = [
    "tech",
    "ai",
    "crypto",
    "startup",
    "music",
    "debates",
    "news",
    "philosophy",
    "gaming",
    "culture",
    "india",
    "global",
    "finance",
    "podcasts",
    "voice",
    "aura",
    "sound",
    "audio",
    "clash",
    "unfiltered",
  ];

  const hashtagRoutes: MetadataRoute.Sitemap = discoveryHashtags.map((tag) => ({
    url: `${baseUrl}/hashtag/${tag}`,
    lastModified,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  return [...coreRoutes, ...hashtagRoutes];
}
