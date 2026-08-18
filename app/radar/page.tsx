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
              <section className="border border-neutral-900 bg-neutral-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs tracking-widest text-neutral-500">// MY RADAR BEACON</p>
                  <button
                    onClick={handleToggleOpen}
                    className={`text-xs tracking-widest uppercase px-3 py-1.5 border transition-colors cursor-pointer ${
                      isOpen 
                        ? "border-white text-white bg-white/10" 
                        : "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                    }`}
                  >
                    {isOpen ? "[ BROADCASTING SIGNAL ]" : "[ GO OPEN ]"}
                  </button>
                </div>
                
                {isOpen && (
                  <div className="space-y-3 pt-2 border-t border-neutral-900">
                    <input
                      type="text"
                      value={myTopic}
                      onChange={(e) => setMyTopic(e.target.value)}
                      placeholder="WHAT FREQUENCY OR TOPIC ARE YOU OPEN TO TALK ABOUT?"
                      className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none text-xs tracking-widest text-white placeholder:text-neutral-700 py-2 font-mono"
                    />
                    <div className="flex flex-wrap gap-2">
                      {["TECH", "STARTUP", "MARKETS", "MUSIC", "SPORTS", "DEBATE"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setMyTopic(cat)}
                          className="text-[10px] tracking-widest uppercase px-2.5 py-1 border border-neutral-800 text-neutral-500 hover:border-white hover:text-white transition-colors cursor-pointer"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Open Users List */}
            <section className="space-y-3">
              <div className="border-b border-neutral-900 pb-2 flex justify-between items-center text-xs text-neutral-500">
                <span>&gt;&gt; ACTIVE RADAR NODES ({filteredUsers.length})</span>
                <span className="text-white">● LIVE SCAN</span>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-12 border border-neutral-900 bg-neutral-950 p-6 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto border border-neutral-800 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs tracking-widest text-neutral-500 uppercase">NO ACTIVE SIGNALS DETECTED</p>
                    <p className="text-[10px] tracking-widest text-neutral-700">BE THE FIRST TO BROADCAST A BEACON AND CONNECT</p>
                  </div>
                  {user && !isOpen && (
                    <button
                      onClick={handleToggleOpen}
                      className="text-xs tracking-widest uppercase px-5 py-2 border border-white text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                    >
                      [ GO OPEN ]
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-neutral-900 border border-neutral-900 bg-black">
                  {filteredUsers.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between p-3.5 gap-2 hover:bg-neutral-950 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-800 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full border border-neutral-800 flex items-center justify-center bg-neutral-900 shrink-0">
                            <span className="text-[10px] text-neutral-500 font-bold">{u.handle.replace('@','').slice(0,2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-neutral-600 shrink-0" />
                            <p className="text-xs text-white tracking-wider truncate font-bold">{u.handle}</p>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">TOPIC: {u.topic}</p>
                          <p className="text-[10px] text-neutral-600">[ AURA ]: {u.auraScore || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {user && u.uid !== user.uid && (
                          <button
                            onClick={() => handleInviteToRoom(u.uid, u.handle)}
                            className="flex items-center gap-1 text-[10px] border border-neutral-800 px-2.5 py-1.5 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors cursor-pointer tracking-wider"
                          >
                            <Radio className="w-3 h-3" />[ ROOM ]
                          </button>
                        )}
                        <Link
                          href={`/wire?with=${u.uid}&handle=${encodeURIComponent(u.handle)}`}
                          className="flex items-center gap-1 text-xs border border-neutral-800 px-2.5 py-1.5 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />[ WIRE ]
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
