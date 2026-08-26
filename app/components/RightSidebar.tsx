"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { subscribeToClashes, type ClashItem } from "@/lib/clashes";
import { subscribeToUnreadCount } from "@/lib/notifications";
import { EchoUser } from "@/lib/userDoc";
import { Bell, Search, User } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";

export function RightSidebar() {
  const { user } = useAuth();
  const [topUsers, setTopUsers] = useState<EchoUser[]>([]);
  const [liveClashes, setLiveClashes] = useState<ClashItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchTopUsers() {
      try {
        const db = getFirebaseDb();
        const snap = await getDocs(query(collection(db, "users"), orderBy("auraScore", "desc"), limit(3)));
        const list: EchoUser[] = snap.docs.map((d) => d.data() as EchoUser);
        setTopUsers(list);
      } catch {}
    }
    fetchTopUsers();

    const unsub = subscribeToClashes((clashes) => {
      setLiveClashes(clashes.slice(0, 3));
    });
    return () => unsub();
  }, []);

  // Subscribe to unread notification count
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const unsub = subscribeToUnreadCount(user.uid, (count) => setUnreadCount(count));
    return () => unsub();
  }, [user]);

  return (
    <aside
      className="
        hidden lg:flex flex-col
        fixed right-0 top-0 bottom-0 z-40
        w-72
        bg-black border-l border-neutral-900
        px-6 py-8 overflow-y-auto no-scrollbar
      "
      aria-label="Right panel"
    >
      {/* ── TOP CONTROLS: SEARCH, NOTIFICATIONS, PROFILE ── */}
      <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-neutral-900">
        <p className="font-mono text-[10px] tracking-widest uppercase text-neutral-500 font-bold">
          LIVE FEED
        </p>
        <div className="flex items-center gap-1.5">
          <Link
            href="/search"
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 transition-all cursor-pointer"
            title="Search"
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/notifications"
            className="relative p-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 transition-all cursor-pointer"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center">
                <span className="w-4 h-4 bg-white text-black rounded-full font-mono text-[8px] flex items-center justify-center font-bold">
                  {unreadCount < 10 ? unreadCount : "9+"}
                </span>
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-600 transition-all cursor-pointer flex items-center justify-center"
            title="Profile"
            aria-label="Profile"
          >
            <User className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── LIVE ON STAGE ── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <p className="font-mono text-xs tracking-wider uppercase text-white font-black">
              LIVE STAGE DEBATES
            </p>
          </div>
          <Link href="/clash" className="text-[10px] text-neutral-500 hover:text-white uppercase font-bold">
            VIEW ALL →
          </Link>
        </div>

        {liveClashes.length === 0 ? (
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 text-center space-y-1">
            <p className="font-mono text-xs text-neutral-400 font-bold uppercase">NO ACTIVE CLASH</p>
            <p className="text-[10px] text-neutral-600">Start an audio battle on Stage!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveClashes.map((c) => {
              const totalVotes = (c.sideA?.votes || 0) + (c.sideB?.votes || 0);
              return (
                <Link
                  key={c.id}
                  href="/clash"
                  className="block p-3 rounded-2xl bg-neutral-950/80 border border-neutral-900 hover:border-neutral-700 transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-neutral-400">
                    <span className="text-white group-hover:text-amber-400 transition-colors truncate max-w-[100px]">
                      {c.sideA?.handle || "SIDE A"}
                    </span>
                    <span className="text-neutral-600 font-normal">vs</span>
                    <span className="text-white group-hover:text-amber-400 transition-colors truncate max-w-[100px]">
                      {c.sideB?.handle || "SIDE B"}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                    &ldquo;{c.topic}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[9px] text-neutral-500 font-bold">
                    <span>🔥 {totalVotes} VOTES</span>
                    <span className="text-emerald-400">LISTEN LIVE 🎙️</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
