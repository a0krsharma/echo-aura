"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { subscribeToClashes, type ClashItem } from "@/lib/clashes";
import { subscribeToUnreadCount } from "@/lib/notifications";
import { EchoUser } from "@/lib/userDoc";
import { Bell } from "lucide-react";
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
      {/* ── NOTIFICATIONS ── */}
      <div className="flex items-center justify-between mb-6">
        <p className="font-mono text-xs tracking-widest uppercase text-neutral-700">
          // NOTIFICATIONS
        </p>
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
      </div>

      {/* ── LIVE ON THE STAGE ── */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" aria-hidden="true" />
          <p className="font-mono text-xs tracking-widest uppercase text-white">
            LIVE ON [ STAGE ]
          </p>
        </div>

        {liveClashes.length === 0 ? (
          <div className="font-mono text-xs text-neutral-700 uppercase tracking-widest">
            NO LIVE DEBATES.
          </div>
        ) : (
          <div className="space-y-5">
            {liveClashes.map((c) => {
              const totalVotes = (c.sideA?.votes || 0) + (c.sideB?.votes || 0);
              return (
                <Link
                  key={c.id}
                  href="/clash"
                  className="block border-l border-neutral-800 pl-4 hover:border-white transition-colors"
                >
                  <p className="font-mono text-xs text-neutral-400 tracking-widest leading-relaxed">
                    {c.sideA?.handle || "SIDE A"}
                    <span className="text-neutral-700"> vs </span>
                    {c.sideB?.handle || "SIDE B"}
                  </p>
                  <p className="font-serif text-sm italic text-neutral-500 mt-1 leading-snug">
                    "{c.topic}"
                  </p>
                  <p className="font-mono text-[10px] text-neutral-700 tracking-widest mt-1.5">
                    {totalVotes} VOTES LIVE
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
