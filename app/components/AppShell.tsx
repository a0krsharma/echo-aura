"use client";

/**
 * app/components/AppShell.tsx
 * ─────────────────────────────────────────────────────
 * Root application shell.
 * - Wraps everything in <AuthProvider> (Firebase)
 * - Guards every non-/login route: unauthenticated → /login
 * - Renders the responsive layout chrome
 *   · Mobile  : <BottomNav>
 *   · Desktop : <LeftSidebar> + <RightSidebar>
 */

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/app/components/AuthProvider";
import BottomNav   from "@/app/components/BottomNav";
import LeftSidebar from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { Loader2 } from "lucide-react";

// ─── Inner shell (needs AuthProvider above it) ───────────────────
function ShellContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const isPublicRoute = pathname === "/login";

  // Guard: redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      router.replace("/login");
    }
  }, [user, isLoading, isPublicRoute, router]);

  // ── Loading splash ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <span className="font-serif text-4xl italic text-white">Echo.</span>
        <Loader2 className="w-4 h-4 text-neutral-700 animate-spin mt-2" />
      </div>
    );
  }

  // ── Login / public routes — no chrome ────────────────────────
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // ── Still redirecting (user is null but not on login) ─────────
  if (!user) return null;

  // ── Authenticated shell ───────────────────────────────────────
  return (
    <>
      {/* LEFT SIDEBAR — desktop md+ */}
      <LeftSidebar />

      {/*
       * MAIN CONTENT
       * md: offset right by left sidebar width  (w-52 = 208px)
       * lg: also offset left by right sidebar   (w-72 = 288px)
       */}
      <div className="md:ml-52 lg:mr-72 min-h-full">
        {children}
      </div>

      {/* RIGHT SIDEBAR — desktop lg+ */}
      <RightSidebar />

      {/* BOTTOM NAV — mobile only */}
      <BottomNav />
    </>
  );
}

// ─── Public export — wraps in AuthProvider ───────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
