import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Echo Studio+ — 1-Shot AI Music, Voice & Shayari Creation",
  description:
    "Generate 100% original songs, classical shayaris, and zero-shot cloned voice tracks on Echo Studio+ with zero server overhead.",
  keywords: [
    "Echo Studio+",
    "AI Music Generator",
    "Shayari Generator",
    "Zero-Shot Voice Cloning",
    "Audio Social Network",
    "Voice AI",
  ],
};

export default function StudioPlusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
