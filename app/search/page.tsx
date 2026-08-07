"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Mic2, Users } from "lucide-react";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { EchoUser } from "@/lib/userDoc";
import { EchoPost } from "@/lib/echoes";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<EchoUser[]>([]);
  const [echoes, setEchoes] = useState<EchoPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function searchFirestore() {
      if (!searchQuery.trim()) {
        setUsers([]);
        setEchoes([]);
        return;
      }

      setLoading(true);
      try {
        const db = getFirebaseDb();
        const usersSnap = await getDocs(query(collection(db, "users"), limit(20)));
        const echoesSnap = await getDocs(query(collection(db, "echoes"), limit(20)));

        const q = searchQuery.toLowerCase();
        const matchedUsers = usersSnap.docs
          .map((d) => d.data() as EchoUser)
          .filter((u) => u.handle?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q));

        const matchedEchoes = echoesSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<EchoPost, "id">) }))
          .filter((e) => e.title?.toLowerCase().includes(q) || e.handle?.toLowerCase().includes(q));

        setUsers(matchedUsers);
        setEchoes(matchedEchoes);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(searchFirestore, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">SEARCH</span>
      </div>

      {/* Search Input */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-600 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH ECHOES, VOICES, HANDLES..."
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs tracking-widest placeholder:text-neutral-700"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-neutral-600 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-10">
        {!searchQuery ? (
          <div className="py-16 text-center space-y-3">
            <Search className="w-8 h-8 text-neutral-700 mx-auto" />
            <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
              TYPE TO SEARCH VOICES AND ECHOES ON THE NETWORK
            </p>
          </div>
        ) : loading ? (
          <div className="py-16 text-center font-mono text-xs text-neutral-600 tracking-widest uppercase">
            SEARCHING FIRESTORE...
          </div>
        ) : users.length === 0 && echoes.length === 0 ? (
          <div className="py-16 text-center font-mono text-xs text-neutral-600 tracking-widest uppercase">
            NO RESULTS FOUND FOR "{searchQuery}"
          </div>
        ) : (
          <div className="space-y-8">
            {/* Users */}
            {users.length > 0 && (
              <section className="space-y-4">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">// MATCHING VOICES</p>
                <div className="divide-y divide-neutral-900 border border-neutral-900 p-4">
                  {users.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-mono text-xs text-white">{u.handle}</p>
                        <p className="font-mono text-[10px] text-neutral-600">AURA: {u.auraScore || 0}</p>
                      </div>
                      <Link
                        href={`/${u.handle.replace("@", "")}`}
                        className="font-mono text-xs border border-neutral-800 px-3 py-1 text-neutral-400 hover:text-white"
                      >
                        VIEW
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Echoes */}
            {echoes.length > 0 && (
              <section className="space-y-4">
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">// MATCHING ECHOES</p>
                <div className="divide-y divide-neutral-900 border border-neutral-900 p-4">
                  {echoes.map((e) => (
                    <div key={e.id} className="py-4 space-y-2">
                      <div className="flex justify-between font-mono text-xs text-neutral-500">
                        <span>{e.handle}</span>
                        <span>{e.duration}</span>
                      </div>
                      <p className="font-serif italic text-white">"{e.title}"</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
