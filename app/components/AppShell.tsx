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

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/app/components/AuthProvider";
import BottomNav from "@/app/components/BottomNav";
import LeftSidebar from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { ToastContainer } from "@/app/components/Toast";
import { subscribeToNotifications, markNotificationRead, subscribeToUnreadCount, type EchoNotification } from "@/lib/notifications";
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
} from "lucide-react";

// ─── Inner shell (needs AuthProvider above it) ───────────────────
function ShellContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<EchoNotification[]>([]);
  const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set());
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

  // Subscribe to notifications for toasts
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToNotifications(user.uid, (notifications) => {
      // Show toasts for new unread notifications
      const newUnread = notifications.filter(n => !n.read && !shownToastIds.has(n.id));
      
      if (newUnread.length > 0) {
        // Add new toasts (limit to 3 at a time)
        setToastNotifications(prev => {
          // Filter out any duplicates that might already exist in prev
          const existingIds = new Set(prev.map(t => t.id));
          const trulyNew = newUnread.filter(n => !existingIds.has(n.id));
          const newToasts = trulyNew.slice(0, 3);
          const combined = [...newToasts, ...prev].slice(0, 3);
          return combined;
        });
        
        // Mark as shown to avoid duplicate toasts (use functional update for consistency)
        setShownToastIds(prev => {
          const newIds = new Set(prev);
          newUnread.forEach(n => newIds.add(n.id));
          return newIds;
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
        <span className="font-serif text-4xl italic text-white">Echo.</span>
        <Loader2 className="w-4 h-4 text-neutral-700 animate-spin mt-2" />
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (!user) return null;

  const mobileNavItems = [
    { label: "[ FREQUENCY ]", href: "/", icon: Radio },
    { label: "[ WAVES ]", href: "/waves", icon: Waves },
    { label: "[ ROOMS ]", href: "/rooms", icon: Users },
    { label: "[ STUDIO ]", href: "/studio", icon: Mic2 },
    { label: "[ STAGE ]", href: "/clash", icon: Swords },
    { label: "[ SEARCH ]", href: "/search", icon: Search },
    { label: "[ WIRE ]", href: "/wire", icon: MessageSquare },
    { label: "[ RADAR ]", href: "/radar", icon: Compass },
    { label: "[ NOTIFS ]", href: "/notifications", icon: Bell },
    { label: "[ PROFILE ]", href: "/profile", icon: User },
    { label: "[ TERMINAL ]", href: "/terminal", icon: Terminal },
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
          <Link href="/" className="font-serif italic text-xl tracking-tight text-white">
            Echo.
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="relative p-2 border border-neutral-800 text-white hover:border-white transition-colors cursor-pointer"
            aria-label="Notifications"
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
            className="font-mono text-xs tracking-widest uppercase text-secondary border border-standard px-2.5 py-1 uppercase hover:border-white hover:text-white transition-colors"
          >
            <span className="font-mono text-xs tracking-widest uppercase text-secondary">LIVE ROOMS</span>
            {user.handle || "@YOU"}
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
                <span className="font-serif italic text-2xl text-white">Echo.</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="font-mono text-xs text-neutral-500 hover:text-white"
                >
                  [ ✕ ]
                </button>
              </div>

              <div className="space-y-1">
                {mobileNavItems.map((item) => {
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
       * lg: also offset left by right sidebar   (w-72 = 288px)
       */}
      <div className="md:ml-52 lg:mr-72 min-h-full">
        {children}
      </div>

      {/* RIGHT SIDEBAR — desktop lg+ */}
      <RightSidebar />

      {/* BOTTOM NAV — mobile only */}
      <BottomNav />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer
        notifications={toastNotifications}
        onDismiss={handleDismissToast}
      />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
