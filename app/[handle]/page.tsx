import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await props.params;
  const decodedHandle = decodeURIComponent(handle);
  const cleanHandle = decodedHandle.startsWith("@") ? decodedHandle : `@${decodedHandle}`;

  return {
    title: `${cleanHandle} | Voice Creator Profile`,
    description: `Listen to audio echoes, voice drops, and live discussions by ${cleanHandle} on Echo. Audio-first social platform.`,
    alternates: {
      canonical: `https://echo-aura.vercel.app/${encodeURIComponent(decodedHandle.replace(/^@/, ""))}`,
    },
    openGraph: {
      title: `${cleanHandle} — Voice Creator on Echo`,
      description: `Listen to audio echoes, voice drops, and live discussions by ${cleanHandle} on Echo.`,
      url: `https://echo-aura.vercel.app/${encodeURIComponent(decodedHandle.replace(/^@/, ""))}`,
      type: "profile",
      images: [
        {
          url: "https://echo-aura.vercel.app/og-image.png",
          width: 1200,
          height: 630,
          alt: `${cleanHandle} on Echo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${cleanHandle} on Echo`,
      description: `Listen to unfiltered audio echoes and live voice rooms by ${cleanHandle}.`,
      images: ["https://echo-aura.vercel.app/og-image.png"],
    },
  };
}

export default async function Page(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  return <ClientPage params={params} />;
}
