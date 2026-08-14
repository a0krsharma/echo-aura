import ClientPage from "./ClientPage";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  return <ClientPage params={params} />;
}
