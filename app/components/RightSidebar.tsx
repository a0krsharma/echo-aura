"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { subscribeToClashes, type ClashItem } from "@/lib/clashes";
import { EchoUser } from "@/lib/userDoc";

export function RightSidebar() {
  const [topUsers, setTopUsers] = useState<EchoUser[]>([]);
  const [liveClashes, setLiveClashes] = useState<ClashItem[]>([]);

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
      {/* ── RADAR: TOP VOICES ── */}
      <div className="mb-10">
        <p className="font-mono text-xs tracking-widest uppercase text-neutral-700 mb-6">
          // RADAR: TOP VOICES
        </p>

        {topUsers.length === 0 ? (
          <div className="font-mono text-xs text-neutral-700 uppercase tracking-widest">
            NO RANKED VOICES YET.
          </div>
        ) : (
          <div className="space-y-6">
            {topUsers.map((u, i) => (
              <div key={u.uid}>
                <div className="flex items-center justify-between mb-1.5 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-700">0{i + 1}.</span>
                    <span className="text-white tracking-widest">{u.handle}</span>
                  </div>
                  <span className="text-neutral-500 tracking-widest">
                    {u.auraScore || 0}
                  </span>
                </div>
                <div className="w-full h-px bg-neutral-900">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${Math.min(100, Math.max(10, ((u.auraScore || 0) / 100) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-900 mb-8" />

      {/* ── LIVE ON THE STAGE ── */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" aria-hidden="true" />
          <p className="font-mono text-xs tracking-widest uppercase text-white">
            LIVE ON THE STAGE
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
