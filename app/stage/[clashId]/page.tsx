import StageClientWrapper from "./StageClientWrapper";

/**
 * app/stage/[clashId]/page.tsx
 * ─────────────────────────────────────────────────────
 * Server Component Page for The Stage Live Arena.
 * Generates static params and renders StageClientWrapper.
 */

export function generateStaticParams() {
  return [
    { clashId: "clash-001" },
    { clashId: "clash-002" },
    { clashId: "clash-003" },
    { clashId: "ai-vs-creativity" },
  ];
}

export default async function StagePage(props: { params: Promise<{ clashId: string }> }) {
  const params = await props.params;
  return <StageClientWrapper clashId={params.clashId} />;
}
