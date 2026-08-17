"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Waves, Users, Swords, Compass } from "lucide-react";

/**
 * BottomNav.tsx
 * ─────────────────────────────────────────────────────
 * Mobile 5-button bottom navigation bar.
 * Clean, perfectly aligned padding & typography. No text wrapping.
 * 1. FREQUENCY (Home)
 * 2. WAVES
 * 3. ROOMS
 * 4. STAGE
 * 5. RADAR
 */
export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/",       icon: Radio,   label: "FREQUENCY" },
    { href: "/waves",  icon: Waves,   label: "WAVES font" },
    { href: "/rooms",  icon: Users,   label: "ROOMS"     },
    { href: "/clash",  icon: Swords,  label: "STAGE"     },
    { href: "/radar",  icon: Compass, label: "RADAR"     },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-neutral-900 z-40 pb-safe">
      <div className="flex items-center justify-between h-14 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon     = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
              <span className="text-[9px] font-mono tracking-wider uppercase mt-1 truncate max-w-[64px] text-center leading-none">
                {item.label === "WAVES font" ? "WAVES" : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
