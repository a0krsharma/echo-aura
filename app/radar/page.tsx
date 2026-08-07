"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Play, Square, Swords, Users, Radio } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { subscribeToEchoes, type EchoPost } from "@/lib/echoes";
import { EchoUser } from "@/lib/userDoc";

interface LiveRoom {
  id: string;
  title: string;
  host: string;
  listeners: number;
  topic: string;
}

interface StageConfig {
  topic: string;
  title: string;
  handleA: string;
  handleB: string;
  posA: string;
  posB: string;
}

function StageSetupModal({
  room,
  onClose,
  onLaunch,
}: {
  room: LiveRoom;
  onClose: () => void;
  onLaunch: (config: StageConfig) => void;
}) {
  const [posA, setPosA] = useState("");
  const [posB, setPosB] = useState("");
  const [handleA, setHandleA] = useState(room.host);
  const [handleB, setHandleB] = useState("@YOU");

  const canLaunch = posA.trim().length > 5 && posB.trim().length > 5;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-black border border-neutral-700 p-6 md:p-8 animate-slide-up">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-widest text-neutral-500 mb-1">// PUT ON THE STAGE</p>
            <h2 className="font-serif text-2xl italic text-white leading-snug max-w-xs">
              "{room.title}"
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-white transition-colors cursor-pointer shrink-0 ml-4"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-l-2 border-white pl-4 mb-8">
          <p className="font-mono text-xs text-neutral-500 mb-1 tracking-widest">DEBATE TOPIC</p>
          <p className="font-serif italic text-neutral-300 text-base leading-snug">{room.topic}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-neutral-500 tracking-widest">SIDE A —</span>
            <input
              value={handleA}
              onChange={(e) => setHandleA(e.target.value)}
              className="font-mono text-xs text-white bg-transparent border-b border-neutral-800 focus:border-white outline-none py-0.5 w-32 transition-colors"
              placeholder="@HANDLE"
            />
          </div>
          <textarea
            value={posA}
            onChange={(e) => setPosA(e.target.value.slice(0, 160))}
            placeholder="Their stance on this topic..."
            rows={2}
            className="w-full bg-transparent border border-neutral-800 focus:border-neutral-600 outline-none font-serif italic text-white placeholder:text-neutral-700 placeholder:not-italic p-3 text-sm leading-relaxed resize-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-neutral-900" />
          <div className="flex items-center gap-2">
            <Swords size={14} strokeWidth={1.5} className="text-neutral-600" />
            <span className="font-mono text-xs tracking-widest text-neutral-600">VS</span>
          </div>
          <div className="flex-1 h-px bg-neutral-900" />
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-neutral-500 tracking-widest">SIDE B —</span>
            <input
              value={handleB}
              onChange={(e) => setHandleB(e.target.value)}
              className="font-mono text-xs text-white bg-transparent border-b border-neutral-800 focus:border-white outline-none py-0.5 w-32 transition-colors"
              placeholder="@HANDLE"
            />
          </div>
          <textarea
            value={posB}
            onChange={(e) => setPosB(e.target.value.slice(0, 160))}
            placeholder="Your counter-stance..."
            rows={2}
            className="w-full bg-transparent border border-neutral-800 focus:border-neutral-600 outline-none font-serif italic text-white placeholder:text-neutral-700 placeholder:not-italic p-3 text-sm leading-relaxed resize-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            disabled={!canLaunch}
            onClick={() => onLaunch({ topic: room.topic, title: room.title, handleA, handleB, posA, posB })}
            className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-black bg-white px-5 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Swords size={12} strokeWidth={2} />
            [ LAUNCH STAGE ]
          </button>
          <button
            onClick={onClose}
            className="font-mono text-xs tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RadarPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [stageRoom, setStageRoom] = useState<LiveRoom | null>(null);
  const [launched, setLaunched] = useState<string | null>(null);

  // Firestore Real Data
  const [users, setUsers] = useState<EchoUser[]>([]);
  const [echoes, setEchoes] = useState<EchoPost[]>([]);

  const categories = ["ALL", "TRENDING", "RISING", "LIVE ROOMS"];

  // Fetch real users and real echoes from Firestore
  useEffect(() => {
    async function fetchUsers() {
      try {
        const db = getFirebaseDb();
        const snap = await getDocs(query(collection(db, "users"), limit(10)));
        const list: EchoUser[] = snap.docs.map((d) => d.data() as EchoUser);
        setUsers(list);
      } catch (e) {
        console.error("Error fetching users for radar:", e);
      }
    }
    fetchUsers();

    const unsub = subscribeToEchoes((liveEchoes) => {
      setEchoes(liveEchoes);
    });
    return () => unsub();
  }, []);

  function handleLaunchStage(config: StageConfig) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("echo_staged_clash", JSON.stringify(config));
    }
    setLaunched(config.title);
    setStageRoom(null);
  }

  const filteredUsers = searchQuery
    ? users.filter((u) => u.handle.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  const filteredEchoes = searchQuery
    ? echoes.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : echoes;

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {stageRoom && (
        <StageSetupModal
          room={stageRoom}
          onClose={() => setStageRoom(null)}
          onLaunch={handleLaunchStage}
        />
      )}

      {launched && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-mono text-xs tracking-widest uppercase px-5 py-3 flex items-center gap-3 animate-slide-up shadow-xl">
          <Swords size={12} strokeWidth={2} />
          STAGE LIVE — GO TO{" "}
          <Link href="/clash" className="underline underline-offset-2 hover:opacity-70 transition-opacity">
            THE STAGE →
          </Link>
          <button onClick={() => setLaunched(null)} className="ml-2 opacity-50 hover:opacity-100 cursor-pointer">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">THE RADAR</span>
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-neutral-900">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-600 shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FIND VOICES, ECHOES..."
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs tracking-widest placeholder:text-neutral-700"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-neutral-600 hover:text-white transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-8 space-y-12">
        {/* Category Tabs */}
        <div className="overflow-x-auto no-scrollbar -mx-5 px-5">
          <div className="flex gap-8 border-b border-neutral-900 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`pb-3 font-mono text-xs tracking-widest transition-colors cursor-pointer whitespace-nowrap ${
                  activeCategory === cat
                    ? "border-b-2 border-white text-white"
                    : "border-b-2 border-transparent text-neutral-600 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Real Users / Voices */}
        {(activeCategory === "ALL" || activeCategory === "TRENDING") && (
          <section className="space-y-4">
            <p className="font-mono text-xs tracking-widest text-neutral-700">// AUTHENTICATED VOICES</p>
            {filteredUsers.length === 0 ? (
              <div className="py-8 border border-neutral-900 p-6 text-center font-mono text-xs text-neutral-600 tracking-widest uppercase">
                NO VOICES ON THE NETWORK YET.
              </div>
            ) : (
              <div className="divide-y divide-neutral-900">
                {filteredUsers.map((u, idx) => (
                  <div key={u.uid} className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-white tracking-widest">
                        #{idx + 1} {u.handle}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-600">
                        AURA SCORE: {u.auraScore || 0}
                      </p>
                    </div>
                    <Link
                      href={`/${u.handle.replace("@", "")}`}
                      className="font-mono text-xs border border-neutral-800 px-3 py-1 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors"
                    >
                      VIEW PROFILE
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Real Echoes Stream */}
        {(activeCategory === "ALL" || activeCategory === "RISING") && (
          <section className="space-y-4">
            <p className="font-mono text-xs tracking-widest text-neutral-700">// RISING ECHOES</p>
            {filteredEchoes.length === 0 ? (
              <div className="py-8 border border-neutral-900 p-6 text-center font-mono text-xs text-neutral-600 tracking-widest uppercase">
                NO RISING ECHOES RECORDED YET.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEchoes.map((echo) => (
                  <div key={echo.id} className="border border-neutral-900 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs text-neutral-500">{echo.handle}</span>
                      <span className="font-mono text-[10px] text-neutral-600">{echo.duration}</span>
                    </div>
                    <p className="font-serif italic text-white text-base leading-snug">"{echo.title}"</p>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-mono text-xs text-neutral-600">{echo.pulses || 0} PULSES</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
