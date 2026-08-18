import type { Metadata } from "next";
import StageClientWrapper from "./StageClientWrapper";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ clashId: string }>;
}): Promise<Metadata> {
  const { clashId } = await props.params;

  return {
    title: `Live 1v1 Audio Debate Clash (${clashId.slice(0, 8)}) | The Stage Arena`,
    description: `Watch and participate in this live 1v1 voice debate on The Stage. Vote for Side A or Side B in real-time, sway the Tug-of-War battle meter, and drop audience reactions.`,
    alternates: {
      canonical: `https://echo-aura.vercel.app/stage/${clashId}`,
    },
    openGraph: {
      title: `Live 1v1 Audio Clash on The Stage — Echo Audio Platform`,
      description: `Unfiltered 1v1 live voice debate. Vote, switch sides, and decide the winner in real-time.`,
      url: `https://echo-aura.vercel.app/stage/${clashId}`,
      type: "website",
      images: [
        {
          url: "https://echo-aura.vercel.app/og-image.png",
          width: 1200,
          height: 630,
          alt: `Live Voice Debate on The Stage`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Live 1v1 Audio Clash on The Stage`,
      description: `Live voice debate arena. Vote and sway the live audience poll.`,
      images: ["https://echo-aura.vercel.app/og-image.png"],
    },
  };
}

export default async function StagePage(props: { params: Promise<{ clashId: string }> }) {
  const params = await props.params;
  return <StageClientWrapper clashId={params.clashId} />;
}
