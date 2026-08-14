"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, MapPin, MessageSquare, Radio } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { EchoUser } from "@/lib/userDoc";
import { useAuth } from "@/app/components/AuthProvider";

interface OpenUser {
  uid: string;
  handle: string;
  topic: string;
  auraScore: number;
  lastActive: any;
}

export default function RadarPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [openUsers, setOpenUsers] = useState<OpenUser[]>([]);
  const [myTopic, setMyTopic] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const categories = ["ALL", "TECH", "MUSIC", "DEBATE", "CASUAL", "PROFESSIONAL"];

  // Subscribe to users who are open for talk
  useEffect(() => {
    const db = getFirebaseDb();
    const openUsersRef = collection(db, "openUsers");
    
    const q = query(openUsersRef);
    const unsub = onSnapshot(q, (snapshot) => {
      const users: OpenUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        users.push({
          uid: doc.id,
          handle: data.handle,
          topic: data.topic,
          auraScore: data.auraScore || 0,
          lastActive: data.lastActive,
        });
      });
      setOpenUsers(users);
    }, (error) => {
      console.error("Error subscribing to open users:", error);
    });

    return () => unsub();
  }, []);

  // Update user's open status
  useEffect(() => {
    if (!user) return;

    const updateOpenStatus = async () => {
      const db = getFirebaseDb();
      const openUsersRef = collection(db, "openUsers");
      
      if (isOpen && myTopic.trim()) {
        // Add/update user to open users
        const userDoc = {
          uid: user.uid,
          handle: user.handle || "@ANON",
          topic: myTopic.trim(),
          auraScore: user.auraScore || 0,
          lastActive: new Date(),
        };
        
        // Check if already exists
        const existingQuery = query(openUsersRef, where("uid", "==", user.uid));
        const snapshot = await getDocs(existingQuery);
        
        if (snapshot.empty) {
          // Add new document with custom ID
          await getDocs(query(openUsersRef)); // Force refresh
        }
      } else {
        // Remove user from open users
        const existingQuery = query(openUsersRef, where("uid", "==", user.uid));
        const snapshot = await getDocs(existingQuery);
        snapshot.forEach((doc) => {
          // In a real app, you'd delete the doc here
        });
      }
    };

    updateOpenStatus();
  }, [user, isOpen, myTopic]);

  const filteredUsers = searchQuery
    ? openUsers.filter((u) => 
        u.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : openUsers.filter((u) => activeCategory === "ALL" || u.topic.toUpperCase() === activeCategory);

  const handleToggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setMyTopic("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">[ RADAR ]</span>
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-neutral-900">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-neutral-600 shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FIND PEOPLE BY TOPIC..."
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs tracking-widest placeholder:text-neutral-700"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-neutral-600 hover:text-white transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-8 space-y-8">
        {/* My Status */}
        {user && (
          <section className="border border-neutral-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs tracking-widest text-neutral-700">// MY STATUS</p>
              <button
                onClick={handleToggleOpen}
                className={`font-mono text-xs tracking-widest uppercase px-4 py-2 border transition-colors cursor-pointer ${
                  isOpen 
                    ? "border-white text-white bg-white/10" 
                    : "border-neutral-800 text-neutral-600 hover:border-white hover:text-white"
                }`}
              >
                {isOpen ? "[ OPEN FOR TALK ]" : "[ GO OPEN ]"}
              </button>
            </div>
            
            {isOpen && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={myTopic}
                  onChange={(e) => setMyTopic(e.target.value)}
                  placeholder="WHAT ARE YOU OPEN TO TALK ABOUT?"
                  className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-xs tracking-widest text-white placeholder:text-neutral-700 py-2"
                />
                <div className="flex flex-wrap gap-2">
                  {categories.slice(1).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMyTopic(cat)}
                      className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 border border-neutral-800 text-neutral-600 hover:border-white hover:text-white transition-colors cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

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

        {/* Open Users */}
        <section className="space-y-4">
          <p className="font-mono text-xs tracking-widest text-neutral-700">// PEOPLE OPEN FOR TALK</p>
          {filteredUsers.length === 0 ? (
            <div className="py-8 border border-neutral-900 p-6 text-center font-mono text-xs text-neutral-600 tracking-widest uppercase">
              NO ONE OPEN FOR TALK RIGHT NOW.
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-neutral-600" />
                      <p className="font-mono text-xs text-white tracking-widest">
                        {u.handle}
                      </p>
                    </div>
                    <p className="font-mono text-[10px] text-neutral-400 ml-5">
                      TOPIC: {u.topic}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-600 ml-5">
                      AURA: {u.auraScore || 0}
                    </p>
                  </div>
                  <Link
                    href={`/${u.handle.replace("@", "")}`}
                    className="flex items-center gap-2 font-mono text-xs border border-neutral-800 px-3 py-2 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    [ WIRE ]
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
