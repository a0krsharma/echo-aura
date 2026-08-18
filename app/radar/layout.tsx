import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Radar — Trending Topics & Acoustic Telemetry",
  description:
    "Real-time acoustic radar and trending topic telemetry on Echo. Track live voice density, viral hashtags, and breaking world events.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/radar",
  },
  openGraph: {
    title: "Radar — Trending Telemetry | Echo Audio Platform",
    description: "Live voice density, trending hashtags, and acoustic radar telemetry.",
    url: "https://echo-aura.vercel.app/radar",
    type: "website",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo Radar Telemetry",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar — Trending Audio Telemetry on Echo",
    description: "Real-time acoustic velocity and trending voice radar.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
};

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
