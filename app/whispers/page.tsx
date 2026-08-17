"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function WhispersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      router.replace(`/wire${search}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs tracking-widest uppercase">
      <div className="border border-neutral-800 p-6 animate-pulse">
        [ REDIRECTING TO WIRE... ]
      </div>
    </div>
  );
}

