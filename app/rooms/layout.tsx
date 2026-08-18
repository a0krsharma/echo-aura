import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Audio Rooms — Interactive Voice Broadcasts & Discussions",
  description:
    "Explore active Live Audio Rooms on Echo. Join live interactive conversations, listen to expert panels, request the mic, or host your own voice broadcast.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/rooms",
  },
  openGraph: {
    title: "Live Audio Rooms — Echo Audio Platform",
    description:
      "Real-time voice rooms. Join live interactive discussions and broadcast audio to a global audience.",
    url: "https://echo-aura.vercel.app/rooms",
    type: "website",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo Live Audio Rooms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Audio Rooms on Echo",
    description: "Interactive voice broadcasts, live podcast panels, and global open stages.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
