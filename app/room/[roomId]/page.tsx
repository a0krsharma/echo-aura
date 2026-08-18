import type { Metadata } from "next";
import RoomClientWrapper from "./RoomClientWrapper";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await props.params;

  return {
    title: `Live Audio Room (${roomId.slice(0, 8)}) | Echo Audio Rooms`,
    description: `Join this live interactive audio room on Echo. Listen in, request the mic, and speak in real-time with creators and audiences worldwide.`,
    alternates: {
      canonical: `https://echo-aura.vercel.app/room/${roomId}`,
    },
    openGraph: {
      title: `Live Audio Room on Echo — Unfiltered Audio Platform`,
      description: `Join this real-time voice broadcast. Connect with live speakers and listeners now.`,
      url: `https://echo-aura.vercel.app/room/${roomId}`,
      type: "website",
      images: [
        {
          url: "https://echo-aura.vercel.app/og-image.png",
          width: 1200,
          height: 630,
          alt: `Live Audio Room on Echo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Live Audio Room on Echo`,
      description: `Join this live interactive voice room. Listen, request to speak, and debate.`,
      images: ["https://echo-aura.vercel.app/og-image.png"],
    },
  };
}

export default async function RoomPage() {
  return <RoomClientWrapper />;
}
