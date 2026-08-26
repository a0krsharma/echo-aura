"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  Compass,
  Mic2,
  Swords,
  Search,
  MessageSquare,
  Bell,
  User,
  Terminal,
  LogOut,
  Waves,
  Users,
  Flame,
  Headphones,
  Cpu,
  Sparkles,
  Gamepad2,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { getStreak } from "@/lib/userDoc";
import { useEffect, useState } from "react";
import OrbitLogo from "@/app/components/OrbitLogo";

export default function LeftSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (user) {
      getStreak(user.uid).then(setStreak);
    }
  }, [user]);

  const navItems = [
    { href: "/",               icon: Radio,        label: "FREQUENCY" },
    { href: "/waves",          icon: Waves,        label: "WAVES" },
    { href: "/studio",         icon: Mic2,         label: "STUDIO" },
    { href: "/arcade",         icon: Gamepad2,     label: "ECHO CLUB" },
    { href: "/rooms",          icon: Users,        label: "ROOMS" },
    { href: "/clash",          icon: Swords,       label: "STAGE" },
    { href: "/radar",          icon: Compass,      label: "RADAR" },
    { href: "/shop",           icon: ShoppingCart, label: "STORE" },
    { href: "/profile",        icon: User,         label: "PROFILE" },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 bg-black border-r border-neutral-900 px-4 py-6 z-40 select-none">
      {/* Brand Header */}
      <div className="mb-6 px-2">
        <OrbitLogo />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase transition-all ${
                isActive
                  ? "bg-white text-black font-black shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-950"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.href === "/arcade" && (
                <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Telemetry Strip */}
      <div className="pt-4 border-t border-neutral-900 font-mono text-xs space-y-2">
        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              {user?.handle || "@ANON_GUEST"}
            </span>
            <button
              onClick={() => signOut()}
              className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer p-1"
              title="Sign Out"
            >
              <LogOut size={12} />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-yellow-400 flex items-center gap-1">
              🏆 {user?.auraScore || 0} AURA
            </span>
            {streak > 0 && (
              <span className="text-amber-500 flex items-center gap-1">
                <Flame size={11} className="fill-amber-500" />
                {streak}D
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
