import type { Metadata } from "next";
import HashtagClient from "./HashtagClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await props.params;
  const decodedTag = decodeURIComponent(tag);
  const hashtagDisplay = decodedTag.startsWith("#") ? decodedTag : `#${decodedTag}`;

  return {
    title: `${hashtagDisplay} Audio Takes & Echoes | Trending Topics`,
    description: `Explore unfiltered voice takes, audio echoes, and discussions tagged with ${hashtagDisplay} on Echo — the real-time audio platform.`,
    alternates: {
      canonical: `https://echo-aura.vercel.app/hashtag/${encodeURIComponent(decodedTag.replace(/^#/, ""))}`,
    },
    openGraph: {
      title: `${hashtagDisplay} Audio Stream — Echo Audio Platform`,
      description: `Listen to top voice takes and raw audio reactions tagged with ${hashtagDisplay}.`,
      url: `https://echo-aura.vercel.app/hashtag/${encodeURIComponent(decodedTag.replace(/^#/, ""))}`,
      type: "website",
      images: [
        {
          url: "https://echo-aura.vercel.app/og-image.png",
          width: 1200,
          height: 630,
          alt: `${hashtagDisplay} on Echo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${hashtagDisplay} Audio Stream on Echo`,
      description: `Stream voice drops and live audio reactions tagged with ${hashtagDisplay}.`,
      images: ["https://echo-aura.vercel.app/og-image.png"],
    },
  };
}

export default async function Page() {
  return <HashtagClient />;
}
