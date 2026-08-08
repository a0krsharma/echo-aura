/**
 * ECHO — Root Layout
 * Universal: Mobile app (bottom nav) ↔ Desktop web (left + right sidebar)
 * SEO & OpenGraph Audio Metadata Hardening
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import AppShell from "@/app/components/AppShell";
import { ChatProvider } from "@/app/components/ChatProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const playfair  = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Echo // Unfiltered Audio",
  description: "Audio-first social platform. Raw audio, real people, no filters. Drop an Echo. Lock in.",
  metadataBase: new URL("https://echo.fm"),
  authors: [{ name: "Echo Audio Network" }],
  keywords: ["audio social network", "voice notes", "unfiltered audio", "podcasts", "live audio debates", "echo fm"],
  openGraph: {
    title: "Echo // Unfiltered Audio",
    description: "Audio-first social platform. Raw audio, real people, no filters.",
    url: "https://echo.fm",
    siteName: "Echo. Audio Network",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Echo // Unfiltered Audio",
    description: "Raw audio. Real people. No filters. Drop an Echo. Lock in.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}>
      <body className="bg-black text-white font-sans antialiased h-full">
        <ChatProvider>
          <AppShell>
            {children}
          </AppShell>
        </ChatProvider>
      </body>
    </html>
  );
}
