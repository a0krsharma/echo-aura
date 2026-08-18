import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequency+ — Premium Audio Feeds & Creator Masterclasses",
  description:
    "Listen to premium voice serials, exclusive creator drops, deep-dive discussions, and unlocked audio masterclasses on Echo Frequency+.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/frequency-plus",
  },
  openGraph: {
    title: "Frequency+ — Premium Audio Feeds | Echo Audio Platform",
    description: "Exclusive creator masterclasses and premium audio feeds.",
    url: "https://echo-aura.vercel.app/frequency-plus",
    type: "website",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo Frequency+ Premium Audio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frequency+ — Premium Audio on Echo",
    description: "Exclusive voice feeds and creator masterclasses.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
};

export default function FrequencyPlusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
