"use client";

/**
 * app/radar/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Radar & Telemetry: Real-time Audio-First Discovery Engine.
 * Features:
 *  - Real-time Acoustic Velocity ranking across 8 categories
 *  - Live Stage / Room interception
 *  - Open for talk radar signals and user discovery
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, MessageSquare, Radio, Users, Plus } from "lucide-react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuth } from "@/app/components/AuthProvider";
import { createRoom } from "@/lib/rooms";
import { createNotification } from "@/lib/notifications";
import { RadarCategoryId } from "@/lib/categories";
import RadarHeader from "./components/RadarHeader";
import LiveRadarFeed from "./components/LiveRadarFeed";

interface OpenUser {
  uid: string;
  handle: string;
  topic: string;
  auraScore: number;
  lastActive: any;
  photoUrl?: string;
}

export default function RadarPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [activeCategory, setActiveCategory] = useState<RadarCategoryId>("trending");
  const [activeRegion, setActiveRegion] = useState<"india" | "world">("india");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"trending" | "open_users">("trending");
  const [openUsers, setOpenUsers] = useState<OpenUser[]>([]);
  const [myTopic, setMyTopic] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to users who are open for talk
  useEffect(() => {
    const db = getFirebaseDb();
    const openUsersRef = collection(db, "openUsers");
    
    const q = query(openUsersRef);
    const unsub = onSnapshot(q, (snapshot) => {
      const users: OpenUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        users.push({
          uid: docSnap.id,
          handle: data.handle,
          topic: data.topic,
          auraScore: data.auraScore || 0,
          lastActive: data.lastActive,
          photoUrl: data.photoUrl || "",
        });
      });
      setOpenUsers(users);
    }, (error) => {
      console.error("[Radar] Error subscribing to open users:", error);
    });

    return () => unsub();
  }, []);

  // Update user's open status
  useEffect(() => {
    if (!user) return;

    const updateOpenStatus = async () => {
      const db = getFirebaseDb();
      const userRef = doc(db, "openUsers", user.uid);
      
      if (isOpen && myTopic.trim()) {
        await setDoc(userRef, {
          uid: user.uid,
          handle: user.handle || "@ANON",
          topic: myTopic.trim(),
          auraScore: user.auraScore || 0,
          lastActive: serverTimestamp(),
          photoUrl: user.photoUrl || "",
        });
      } else {
        try { await deleteDoc(userRef); } catch (e) { /* doc may not exist */ }
      }
    };

    updateOpenStatus();
  }, [user?.uid, isOpen, myTopic]);

  const filteredUsers = searchQuery
    ? openUsers.filter((u) => 
        u.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : openUsers.filter((u) => 
        activeCategory === "trending" || 
        u.topic.toLowerCase().includes(activeCategory.toLowerCase())
      );

  const handleToggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setMyTopic("");
    }
  };

  const handleInviteToRoom = async (targetUid: string, targetHandle: string) => {
    if (!user) return;
    try {
      const roomId = await createRoom({
        name: `${user.handle} × ${targetHandle}`,
        description: `Spontaneous room from Radar`,
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        maxParticipants: 10,
        isPublic: true,
        category: activeCategory.toUpperCase(),
        tags: ["RADAR", activeCategory.toUpperCase()],
      });
      await createNotification(targetUid, {
        type: "stage",
        fromUid: user.uid,
        fromHandle: user.handle || "@ANON",
        roomId,
        roomName: `${user.handle} × ${targetHandle}`,
        text: `${user.handle} invited you to a room.`,
      });
      router.push(`/room/${roomId}`);
    } catch (e) {
      console.error("[Radar] Failed to create room:", e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 font-mono">
      {/* Top Header & Search Bar with Category Scroller */}
      <div className="sticky top-0 z-20 bg-black">
        <RadarHeader
          activeTab={activeCategory}
          onSelectTab={setActiveCategory}
          activeRegion={activeRegion}
          onSelectRegion={setActiveRegion}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* VIEW MODE 1: LIVE ACOUSTIC VELOCITY TELEMETRY FEED */}
        {viewMode === "trending" && (
          <LiveRadarFeed
            category={activeCategory}
            region={activeRegion}
            searchQuery={searchQuery}
          />
        )}

        {/* VIEW MODE 2: OPEN NODES / RADAR SIGNALS */}
        {viewMode === "open_users" && (
          <div className="space-y-6">
            {/* My Status Configuration */}
            {user && (
              <section className="border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900/60 to-neutral-950 p-5 rounded-3xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black tracking-wide uppercase text-white">MY RADAR BEACON</p>
                    <p className="text-[11px] text-neutral-400 font-sans">Broadcast to let others invite you to live voice rooms</p>
                  </div>
                  <button
                    onClick={handleToggleOpen}
                    className={`text-xs font-black uppercase px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md ${
                      isOpen 
                        ? "bg-emerald-500 text-black animate-pulse" 
                        : "bg-white text-black hover:bg-neutral-200"
                    }`}
                  >
                    {isOpen ? "BROADCASTING SIGNAL" : "GO OPEN FOR TALK"}
                  </button>
                </div>
                
                {isOpen && (
                  <div className="space-y-3 pt-3 border-t border-neutral-800">
                    <input
                      type="text"
                      value={myTopic}
                      onChange={(e) => setMyTopic(e.target.value)}
                      placeholder="What topic or frequency are you open to discuss?"
                      className="w-full bg-black border border-neutral-800 focus:border-white rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none font-mono"
                    />
                    <div className="flex flex-wrap gap-2">
                      {["TECH", "STARTUPS", "MARKETS", "MUSIC", "SPORTS", "DEBATE"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setMyTopic(cat)}
                          className="text-[11px] uppercase font-bold px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
                        >
                          #{cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Open Users List */}
            <section className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-1">
                <span className="font-black text-white uppercase tracking-wider">
                  ACTIVE RADAR NODES ({filteredUsers.length})
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SCANNING LIVE
                </span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-14 border border-neutral-900 bg-neutral-950/60 rounded-3xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-white tracking-wide">NO ACTIVE SIGNALS DETECTED</p>
                    <p className="text-[11px] text-neutral-500 font-sans">Be the first to broadcast a radar beacon to connect with voice creators.</p>
                  </div>
                  {user && !isOpen && (
                    <button
                      onClick={handleToggleOpen}
                      className="px-5 py-2.5 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
                    >
                      BROADCAST YOUR SIGNAL
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((u) => (
                    <div key={u.uid} className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-900 hover:border-neutral-700 flex items-center justify-between gap-3 transition-all">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-800 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full border border-neutral-800 flex items-center justify-center bg-neutral-900 shrink-0 font-bold text-white text-xs">
                            {u.handle.replace('@','').slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white truncate">{u.handle}</p>
                            <span className="text-[10px] text-yellow-400 font-bold">🏆 {u.auraScore || 0}</span>
                          </div>
                          <p className="text-xs text-neutral-300 truncate font-sans">Topic: <strong className="text-white font-mono font-normal">#{u.topic}</strong></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user && u.uid !== user.uid && (
                          <button
                            onClick={() => handleInviteToRoom(u.uid, u.handle)}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white text-black rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>START ROOM</span>
                          </button>
                        )}
                        <Link
                          href={`/wire?with=${u.uid}&handle=${encodeURIComponent(u.handle)}`}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WIRE</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
