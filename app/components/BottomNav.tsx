"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Search, Mic2, Bell, MessageSquare } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const hasNotifs = true;

  const navItems = [
    { href: "/", icon: Radio, label: "FREQ" },
    { href: "/search", icon: Search, label: "SEARCH" },
    { href: "/studio", icon: Mic2, label: "STUDIO", isCenter: true },
    { href: "/notifications", icon: Bell, label: "NOTIFS", hasNotifDot: hasNotifs },
    { href: "/whispers", icon: MessageSquare, label: "DMS" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-neutral-900 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <div key={item.href} className="relative flex flex-col items-center justify-center -top-3">
                <Link
                  href={item.href}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg border border-neutral-900 active:scale-95 transition-transform"
                >
                  <Icon size={20} />
                </Link>
                <span className="text-[10px] font-mono tracking-widest uppercase mt-1 text-neutral-400">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 gap-1 ${
                isActive ? "text-white" : "text-neutral-500 hover:text-neutral-400"
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {item.hasNotifDot && (
                  <span className="notif-dot absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></span>
                )}
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
