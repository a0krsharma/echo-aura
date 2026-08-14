"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Waves, Mic2, Bell, MessageSquare, Users, Compass } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { subscribeToUnreadCount } from "@/lib/notifications";

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Real unread notification count — replaces hardcoded `true`
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const unsub = subscribeToUnreadCount(user.uid, (count) => setUnreadCount(count));
    return () => unsub();
  }, [user]);

  const hasNotifs = unreadCount > 0;

  const navItems = [
    { href: "/",             icon: Radio,          label: "[ FREQUENCY ]"   },
    { href: "/waves",        icon: Waves,          label: "[ WAVES ]"  },
    { href: "/rooms",        icon: Users,          label: "[ ROOMS ]"  },
    { href: "/studio",       icon: Mic2,           label: "[ STUDIO ]", isCenter: true },
    { href: "/whispers",     icon: MessageSquare,  label: "[ WIRE ]"   },
    { href: "/radar",        icon: Compass,        label: "[ RADAR ]"  },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-neutral-900 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon     = item.icon;

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
              className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
                isActive ? "text-white" : "text-neutral-500 hover:text-neutral-400"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
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
