import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Stage — Live 1v1 Voice Debates & Clashes",
  description:
    "Enter The Stage on Echo: Real-time 1v1 audio debates, Tug-of-War audience voting, instant allegiance flipping, and unfiltered arguments on trending topics.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/clash",
  },
  openGraph: {
    title: "The Stage — Live 1v1 Voice Debates | Echo Audio Platform",
    description:
      "Compete in live audio clashes or vote in real-time. Unfiltered 1v1 voice battles.",
    url: "https://echo-aura.vercel.app/clash",
    type: "website",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Stage — Live 1v1 Voice Debates on Echo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Stage — Live 1v1 Voice Debates on Echo",
    description: "Live audio clashes. Real-time voting, fiery debates, and audience judging.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
};

export default function ClashLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
