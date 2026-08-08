import StageClientWrapper from "./StageClientWrapper";

/**
 * app/stage/[clashId]/page.tsx
 * ─────────────────────────────────────────────────────
 * Server Component Page for The Stage Live Arena.
 * Fully dynamic route - renders StageClientWrapper for any clashId.
 */

export default async function StagePage(props: { params: Promise<{ clashId: string }> }) {
  const params = await props.params;
  return <StageClientWrapper clashId={params.clashId} />;
}
