"use client";

/**
 * app/components/AppShell.tsx
 * ─────────────────────────────────────────────────────
 * Root application shell.
 * - Wraps everything in <AuthProvider> (Firebase)
 * - Guards every non-/login route: unauthenticated → /login
 * - Mobile Top Header with slide-out drawer menu (gives full access to Profile, Terminal, Stage, Radar, etc.)
 * - Desktop LeftSidebar + RightSidebar
 */

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/app/components/AuthProvider";
import BottomNav from "@/app/components/BottomNav";
import LeftSidebar from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { ToastContainer } from "@/app/components/Toast";
import { PWAInstallPrompt } from "@/app/components/PWAInstallPrompt";
import { RoomAudioProvider } from "@/lib/context/RoomAudioContext";
import PersistentRoomDock from "@/app/components/PersistentRoomDock";
import { subscribeToNotifications, markNotificationRead, subscribeToUnreadCount, requestNotificationPermission, dispatchNativeMobileNotification, type EchoNotification } from "@/lib/notifications";
import {
  Loader2,
  Menu,
  X,
  Radio,
  Compass,
  Swords,
  Users,
  Search,
  MessageSquare,
  Bell,
  User,
  Terminal,
  LogOut,
  Mic2,
  Waves,
  Headphones,
  Cpu,
  Sparkles,
  Gamepad2,
  ShoppingCart,
} from "lucide-react";

// ─── Inner shell (needs AuthProvider above it) ───────────────────
function ShellContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<EchoNotification[]>([]);
  const shownToastIdsRef = useRef<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const isPublicRoute = pathname === "/login";

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Subscribe to unread notification count
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const unsub = subscribeToUnreadCount(user.uid, (count) => setUnreadCount(count));
    return () => unsub();
  }, [user]);

  // Request browser/mobile push notification permission when logged in
  useEffect(() => {
    if (user && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        requestNotificationPermission().catch(() => {});
      }
    }
  }, [user]);

  // Subscribe to notifications for toasts & native mobile push
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToNotifications(user.uid, (notifications) => {
      // Show toasts & dispatch mobile notifications for new unread notifications
      const newUnread = notifications.filter(n => !n.read && !shownToastIdsRef.current.has(n.id));
      
      if (newUnread.length > 0) {
        newUnread.forEach(n => {
          shownToastIdsRef.current.add(n.id);
          // Dispatch native browser / mobile status bar notification
          dispatchNativeMobileNotification(n).catch(() => {});
        });

        setToastNotifications(prev => {
          // Filter out any duplicates that might already exist in prev
          const existingIds = new Set(prev.map(t => t.id));
          const trulyNew = newUnread.filter(n => !existingIds.has(n.id));
          const newToasts = trulyNew.slice(0, 3);
          const combined = [...newToasts, ...prev].slice(0, 3);
          return combined;
        });

        // Auto-dismiss after showing
        newUnread.forEach(n => {
          setTimeout(() => {
            setToastNotifications(prev => prev.filter(t => t.id !== n.id));
          }, 5000);
        });
      }
    });

    return () => unsub();
  }, [user]);

  const handleDismissToast = (id: string) => {
    setToastNotifications(prev => prev.filter(t => t.id !== id));
    markNotificationRead(user?.uid || "", id);
  };

  // Guard: redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !user && !isPublicRoute) {
      router.replace("/login");
    }
  }, [user, isLoading, isPublicRoute, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <span className="font-mono text-3xl font-bold text-white uppercase tracking-widest">Echo.</span>
        <Loader2 className="w-4 h-4 text-neutral-700 animate-spin mt-2" />
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!user) return null;

  const drawerNav = [
    { label: "[ FREQUENCY ]",  href: "/",               icon: Radio      },
    { label: "[ WAVES ]",      href: "/waves",          icon: Waves      },
    { label: "[ SHOP ]",       href: "/shop",           icon: ShoppingCart },
    { label: "[ STUDIO ]",     href: "/studio",         icon: Mic2       },
    { label: "[ STAGE ]",      href: "/clash",          icon: Swords     },
    { label: "[ ROOMS ]",      href: "/rooms",          icon: Users      },
    { label: "[ RADAR ]",      href: "/radar",          icon: Compass    },
    { label: "[ FREQUENCY+ ]", href: "/frequency-plus", icon: Headphones },
  ];

  return (
    <>
      {/* ── MOBILE TOP BAR (md:hidden) ── */}
      <header className="md:hidden sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 border border-neutral-800 text-white hover:border-white transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          {pathname === "/" ? (
            <Link href="/" className="font-mono font-bold text-lg tracking-tight text-white uppercase">
              Echo.
            </Link>
          ) : (
            <span className="font-mono text-xs uppercase tracking-widest text-white font-bold">
              {pathname === "/profile"
                ? (user?.handle || "PROFILE")
                : pathname === "/waves"
                ? "WAVES"
                : pathname === "/studio"
                ? "STUDIO"
                : pathname === "/clash"
                ? "STAGE"
                : pathname === "/rooms"
                ? "ROOMS"
                : pathname === "/radar"
                ? "RADAR"
                : pathname === "/terminal"
                ? "TERMINAL"
                : pathname === "/notifications"
                ? "NOTIFICATIONS"
                : pathname === "/search"
                ? "SEARCH"
                : pathname.replace(/^\//, "").toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="p-2 border border-neutral-800 text-white hover:border-white transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Search"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </Link>
          <Link
            href="/notifications"
            className="relative p-2 border border-neutral-800 text-white hover:border-white transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center">
                {unreadCount < 10 ? (
                  <span className="w-4 h-4 bg-white text-black rounded-full font-mono text-[8px] flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                ) : (
                  <span className="w-4 h-4 bg-white text-black rounded-full font-mono text-[8px] flex items-center justify-center font-bold">
                    9+
                  </span>
                )}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className="p-2 border border-neutral-800 text-white hover:border-white transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Profile"
            title="Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT DRAWER ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative w-4/5 max-w-xs bg-black border-r border-standard h-full flex flex-col justify-between p-6 z-10 animate-slide-in">
            <div className="space-y-6">
              <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-standard">
                <span className="font-mono font-bold text-xl text-white uppercase tracking-wider">Echo.</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="font-mono text-xs text-neutral-500 hover:text-white"
                >
                  [ ✕ ]
                </button>
              </div>

              <div className="space-y-1">
                {drawerNav.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-widest uppercase transition-colors ${
                        active
                          ? "border-l-2 border-white text-white bg-secondary"
                          : "text-secondary hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom info + Sign out */}
            <div className="border-t border-neutral-900 pt-4 space-y-4">
              <div className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
                <p>{user.handle}</p>
                <p>[ AURA ]: {user.auraScore || 0}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 border border-neutral-800 text-neutral-500 hover:border-white hover:text-white py-2.5 font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                [ SIGN OUT ]
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* LEFT SIDEBAR — desktop md+ */}
      <LeftSidebar />

      {/*
       * MAIN CONTENT
       * md: offset right by left sidebar width  (w-52 = 208px)
       * lg: also offset left by right sidebar   (w-72 = 288px) (disabled on /room/ and /wire to give chat full focus)
       */}
      <div className={`md:ml-52 ${pathname.startsWith("/room/") || pathname.startsWith("/wire") ? "" : "lg:mr-72"} min-h-full`}>
        {children}
      </div>

      {/* RIGHT SIDEBAR — desktop lg+ (hidden on /room/ and /wire for full focus) */}
      {!pathname.startsWith("/room/") && !pathname.startsWith("/wire") && <RightSidebar />}

      {/* FLOATING SHOP & ARCADE GAME QUICK DOCK */}
      {!pathname.startsWith("/arcade") && !pathname.startsWith("/shop") && !pathname.startsWith("/room") && !pathname.startsWith("/stage") && !pathname.startsWith("/wire") && (
        <div className="fixed bottom-36 md:bottom-20 right-4 md:right-6 z-40 flex flex-col items-end gap-2.5">
          {/* Shop Bar / Button (On top of Game Icon) */}
          <Link
            href="/shop"
            className="bg-neutral-950 text-amber-300 hover:bg-amber-400 hover:text-black border-2 border-amber-400/80 p-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 flex items-center justify-center gap-2 group cursor-pointer"
            title="Aura Rewards Shop & Power-Ups"
          >
            <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-mono text-[11px] font-bold tracking-widest uppercase">
              [ 🛒 SHOP ]
            </span>
          </Link>

          {/* Arcade Game Launcher Icon */}
          <Link
            href="/arcade"
            className="bg-black text-white hover:bg-white hover:text-black border-2 border-white p-3.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 flex items-center justify-center gap-2 group cursor-pointer relative"
            title="Echo Arcade Gaming Lounge"
          >
            <Gamepad2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-mono text-xs font-bold tracking-widest uppercase">
              [ ARCADE ]
            </span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
          </Link>
        </div>
      )}

      {/* FLOATING WIRE CHAT LAUNCHER (Bottom Right Corner - hidden on wire, room, stage, waves) */}
      {!pathname.startsWith("/wire") && !pathname.startsWith("/room") && !pathname.startsWith("/stage") && !pathname.startsWith("/waves") && (
        <Link
          href="/wire"
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 bg-white text-black hover:bg-neutral-200 border border-neutral-800 p-3.5 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 flex items-center justify-center gap-2 group cursor-pointer"
          title="Open Wire Direct Messages"
        >
          <MessageSquare className="w-5 h-5 fill-black text-black" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap font-mono text-xs font-bold tracking-widest uppercase">
            [ WIRE ]
          </span>
        </Link>
      )}

      {/* BOTTOM NAV — mobile only (hidden on /room/ and /wire to prevent overlap with chat/room controls) */}
      {!pathname.startsWith("/room/") && !pathname.startsWith("/wire") && <BottomNav />}

      {/* PWA INSTALL PROMPT */}
      <PWAInstallPrompt />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer
        notifications={toastNotifications}
        onDismiss={handleDismissToast}
      />

      {/* PERSISTENT LIVE AUDIO ROOM DOCK (hidden when already inside /room/[roomId]) */}
      {!pathname.startsWith("/room/") && <PersistentRoomDock />}
    </>
  );
}

// ─── Exported Shell ──────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RoomAudioProvider>
        <ShellContent>{children}</ShellContent>
      </RoomAudioProvider>
    </AuthProvider>
  );
}
