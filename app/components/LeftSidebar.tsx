"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Compass, Mic2, Swords, Search, MessageSquare, Bell, User, Terminal, LogOut, Waves, Users, Flame } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { getStreak } from "@/lib/userDoc";
import { useEffect, useState } from "react";

import OrbitLogo from "@/app/components/OrbitLogo";

export default function LeftSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const hasNotifs = false;
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (user) {
      getStreak(user.uid).then(setStreak);
    }
  }, [user]);

  const navItems = [
    { href: "/",             icon: Radio,         label: "[ FREQUENCY ]", hasNotifDot: false },
    { href: "/waves",        icon: Waves,         label: "[ WAVES ]",     hasNotifDot: false },
    { href: "/studio",       icon: Mic2,          label: "[ STUDIO ]",    hasNotifDot: false },
    { href: "/clash",        icon: Swords,        label: "[ STAGE ]",     hasNotifDot: false },
    { href: "/rooms",        icon: Users,         label: "[ ROOMS ]",     hasNotifDot: false },
    { href: "/search",       icon: Search,        label: "[ SEARCH ]",    hasNotifDot: false },
    { href: "/radar",        icon: Compass,       label: "[ RADAR ]",     hasNotifDot: false },
    { href: "/profile",      icon: User,          label: "[ PROFILE ]",   hasNotifDot: false },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-52 bg-black border-r border-neutral-900 px-5 py-8 z-40">
      <div className="flex-1">
        <div className="mb-8">
          <OrbitLogo />
        </div>
        
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-widest uppercase transition-colors ${
                  isActive ? "text-white font-bold" : "text-neutral-500 hover:text-white"
                }`}
              >
                <Icon size={14} strokeWidth={1.5} className="shrink-0" />
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.hasNotifDot && (
                    <span className="w-1.5 h-1.5 bg-white rounded-full inline-block"></span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-neutral-900 font-mono text-[10px] text-neutral-500 uppercase tracking-widest space-y-2">
        <div className="flex items-center justify-between">
          <span>YOU</span>
          <button
            onClick={() => signOut()}
            className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={12} />
          </button>
        </div>
        <p className="text-white truncate">{user?.handle || "@ANON_GUEST"}</p>
        <div className="flex items-center gap-2">
          <p className="text-neutral-400">[ AURA ]: {user?.auraScore || 0}</p>
          {streak > 0 && (
            <p className="text-yellow-500 flex items-center gap-1">
              <Flame size={10} className="fill-yellow-500" />
              [ STREAK ]: {streak}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
