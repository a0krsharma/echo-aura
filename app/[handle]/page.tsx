import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return [
    { handle: "ZARA.IQ" },
    { handle: "OG_VIBE" },
    { handle: "ARYAN.V" },
  ];
}

export default async function Page(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  return <ClientPage params={params} />;
}
