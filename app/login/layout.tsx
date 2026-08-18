import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In & Join | Echo Audio Platform",
  description:
    "Sign in or create your voice account on Echo. The unfiltered audio-first social platform for real-time discussions, voice reels, and live debates.",
  alternates: {
    canonical: "https://echo-aura.vercel.app/login",
  },
  openGraph: {
    title: "Sign In to Echo — Unfiltered Audio Platform",
    description: "Join the voice revolution. Drop your take and connect in real-time.",
    url: "https://echo-aura.vercel.app/login",
    type: "website",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
