import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search & Discover — Hashtags, Voices & World News Audio",
  description:
    "Search and discover trending hashtags (#), creator voices (@), live audio rooms, and real-time world news audio dispatches on Echo.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/search",
  },
  openGraph: {
    title: "Search & Discover — Echo Audio Platform",
    description: "Find voices, hashtags, live rooms, and breaking audio news.",
    url: "https://echo-aura.vercel.app/search",
    type: "website",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Search on Echo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Search & Discover on Echo",
    description: "Find voices, hashtags, and breaking audio discussions.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
