import ClientPage from "./ClientPage";

/**
 * app/[handle]/page.tsx
 * ─────────────────────────────────────────────────────
 * Server Component Page for User Profiles.
 * Fully dynamic route - renders ClientPage for any handle.
 */

export default async function Page(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  return <ClientPage params={params} />;
}
