import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neural Synthesis Lab // Zero-Cost AI Voice Studio — Echo",
  description: "Synthesize expressive multi-lingual neural speech, shayari, and monologues layered with ambient backing loops directly in your browser on Echo.",
  openGraph: {
    title: "Neural Synthesis Lab — Echo",
    description: "Zero-cost AI voice synthesis and client-side audio mixing.",
  },
};

export default function SynthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
