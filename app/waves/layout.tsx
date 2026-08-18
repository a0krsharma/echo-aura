import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waves — Full-Screen Voice Reels & Audio Drops",
  description:
    "Explore Waves on Echo: Full-screen vertical voice reels, unfiltered audio takes, creator sound snippets, and immersive swipe-through audio stories.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/waves",
  },
  openGraph: {
    title: "Waves — Full-Screen Voice Reels | Echo Audio Platform",
    description:
      "Vertical audio reels. Discover viral voices, unfiltered sound drops, and trending audio stories.",
    url: "https://echo-aura.vercel.app/waves",
    type: "website",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo Waves — Full-Screen Voice Reels",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Waves — Full-Screen Voice Reels on Echo",
    description: "Vertical swipe-through voice reels. Pure audio, unfiltered stories.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
};

export default function WavesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
