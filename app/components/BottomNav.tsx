"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Waves, Users, Swords, Mic2 } from "lucide-react";

/**
 * BottomNav.tsx
 * ─────────────────────────────────────────────────────
 * Mobile 5-button bottom navigation bar.
 * Center raised white button: STUDIO
 * 1. FREQUENCY (Home)
 * 2. WAVES
 * 3. STUDIO (Center Raised White FAB)
 * 4. ROOMS
 * 5. STAGE
 */
export default function BottomNav() {
  const pathname = usePathname();

  // Hide BottomNav on active chat / wire screens, stage clash arena, and live rooms
  if (
    pathname.startsWith("/room/") ||
    pathname.startsWith("/stage/") ||
    pathname.startsWith("/wire")
  ) {
    return null;
  }

  const navItems = [
    { href: "/",        icon: Radio,  label: "FEED",      isCenter: false },
    { href: "/waves",   icon: Waves,  label: "WAVES",     isCenter: false },
    { href: "/studio",  icon: Mic2,   label: "RECORD",    isCenter: true  },
    { href: "/arcade",  icon: Users,  label: "CLUB",      isCenter: false },
    { href: "/clash",   icon: Swords, label: "STAGE",     isCenter: false },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-md border-t border-neutral-900 z-40 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon     = item.icon;
          const label    = item.label;

          if (item.isCenter) {
            return (
              <div key={item.href} className="flex-1 flex flex-col items-center justify-center relative -top-3">
                <Link
                  href={item.href}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] border border-neutral-800 active:scale-95 transition-transform"
                  aria-label="Studio"
                >
                  <Icon size={20} className="stroke-[2.5]" />
                </Link>
                <span className="text-[9px] font-mono tracking-wider uppercase mt-1 text-white font-black leading-none">
                  {label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.6} className="shrink-0" />
              <span className="text-[9px] font-mono tracking-wider uppercase mt-1 truncate max-w-[64px] text-center leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
