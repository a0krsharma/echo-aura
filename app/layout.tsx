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
import { OfflineIndicator } from "@/app/components/OfflineIndicator";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const playfair  = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Echo — Unfiltered Audio Platform | Real-Time Voice Social Network",
    template: "%s | Echo — Unfiltered Audio Platform",
  },
  description:
    "Echo is the world's premier audio-first social platform. Stream unfiltered voice reels (Waves), host live interactive audio rooms, clash in 1v1 voice debates (The Stage), and connect with encrypted voice wire messaging. Real people, raw sound, zero filters.",
  metadataBase: new URL("https://echo-aura.vercel.app"),
  applicationName: "Echo",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Echo Audio",
  },
  authors: [{ name: "Echo Audio Network", url: "https://echo-aura.vercel.app" }],
  creator: "Echo Audio Network",
  publisher: "Echo Audio Network",
  category: "Social Networking & Audio Platform",
  keywords: [
    "echo",
    "echo audio",
    "echo aura",
    "audio platform",
    "voice social network",
    "audio social media",
    "live audio rooms",
    "clubhouse alternative",
    "twitter spaces alternative",
    "voice reels",
    "audio reels",
    "waves audio",
    "voice clips",
    "voice notes",
    "voice debates",
    "live 1v1 debates",
    "the stage debate",
    "audio streaming platform",
    "voice messaging",
    "wire chat",
    "frequency audio",
    "podcasting platform",
    "unfiltered audio",
    "acoustic telemetry",
    "real-time audio",
    "voice creator economy"
  ],
  alternates: {
    canonical: "https://echo-aura.vercel.app",
  },
  openGraph: {
    title: "Echo — Unfiltered Audio Platform | Real-Time Voice Social Network",
    description:
      "Audio-first social platform. Real voices, live audio rooms, full-screen voice reels (Waves), 1v1 live debates, and real-time wire transmissions.",
    url: "https://echo-aura.vercel.app",
    siteName: "Echo Audio Network",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://echo-aura.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo — Unfiltered Audio Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@EchoAura",
    creator: "@EchoAura",
    title: "Echo — Unfiltered Audio Platform",
    description:
      "Raw audio. Real people. No filters. Stream voice reels (Waves), join live audio rooms, and clash in 1v1 voice debates.",
    images: ["https://echo-aura.vercel.app/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        <ErrorBoundary>
          <OfflineIndicator />
          <ChatProvider>
            <AppShell>
              {children}
            </AppShell>
          </ChatProvider>
        </ErrorBoundary>
        {/* ── JSON-LD Structured Data for High-Level Search Engine Indexing (Google, Bing, Apple) ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://echo-aura.vercel.app/#website",
                  "url": "https://echo-aura.vercel.app",
                  "name": "Echo — Unfiltered Audio Platform",
                  "description": "The audio-first real-time voice social network. Live audio rooms, voice reels, 1v1 live debates.",
                  "publisher": {
                    "@id": "https://echo-aura.vercel.app/#organization"
                  },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://echo-aura.vercel.app/search?q={search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://echo-aura.vercel.app/#organization",
                  "name": "Echo Audio Network",
                  "url": "https://echo-aura.vercel.app",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://echo-aura.vercel.app/icon-512.png",
                    "width": 512,
                    "height": 512
                  },
                  "sameAs": [
                    "https://twitter.com/EchoAura"
                  ]
                },
                {
                  "@type": "WebApplication",
                  "@id": "https://echo-aura.vercel.app/#app",
                  "name": "Echo",
                  "url": "https://echo-aura.vercel.app",
                  "applicationCategory": "SocialNetworkingApplication",
                  "operatingSystem": "All",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  }
                }
              ]
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then((reg) => {
                  console.log('[Service Worker] Registered:', reg.scope);
                }).catch((err) => {
                  console.log('[Service Worker] Registration failed:', err);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
