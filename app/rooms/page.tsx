"use client";

/**
 * ECHO — Echo Rooms ( /rooms )
 * Live group audio listening sessions & stage relays.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic2, Volume2, Users, Lock, Radio, Swords, Plus, X, Trash2, Share2 } from "lucide-react";
import { subscribeToClashes, type ClashItem } from "@/lib/clashes";
import { subscribeToPublicRooms, getTrendingRooms, getRoomsByCategory, type Room, addParticipant, deleteRoom } from "@/lib/rooms";
import { useAuth } from "@/app/components/AuthProvider";

function CreateRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: (roomId: string) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const CATEGORIES = ["GENERAL", "TECH", "MUSIC", "DEBATE", "CASUAL", "PROFESSIONAL"];

  const canCreate = name.trim().length >= 3 && user;

  const handleCreate = async () => {
    if (!canCreate || !user) return;
    setLoading(true);
    try {
      console.log("Creating room with data:", {
        name: name.trim(),
        description: description.trim(),
        hostUid: user.uid,
        hostHandle: user.handle || "@ANON",
        maxParticipants,
        isPublic,
        category,
        tags: tags.split(",").map(t => t.trim()).filter(t => t),
      });

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          hostUid: user.uid,
          hostHandle: user.handle || "@ANON",
          maxParticipants,
          isPublic,
          category,
          tags: tags.split(",").map(t => t.trim()).filter(t => t),
          scheduledFor: scheduleMode && scheduledFor ? new Date(scheduledFor).toISOString() : null,
        }),
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        console.error("API error:", data.error);
        alert(`Error: ${data.error || "Failed to create room"}`);
        return;
      }

      if (data.success) {
        onCreate(data.roomId);
        router.push(`/room/${data.roomId}`);
      } else {
        console.error("Creation failed:", data.error);
        alert(`Error: ${data.error || "Failed to create room"}`);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Error: Failed to create room. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-black border border-neutral-700 p-6 md:p-8 animate-slide-up space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest text-neutral-500 mb-1">// CREATE NEW ROOM</p>
            <p className="font-serif italic text-white text-lg">Start a live frequency.</p>
          </div>
          <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">ROOM NAME</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Late Night Vibes"
            className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-xs text-white py-1 tracking-widest"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">DESCRIPTION</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's this room about?"
            rows={2}
            className="w-full bg-transparent border border-neutral-800 focus:border-neutral-600 outline-none font-serif italic text-white p-2 text-sm leading-relaxed resize-none"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">CATEGORY</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-transparent border border-neutral-800 p-2 font-mono text-xs text-white focus:outline-none focus:border-white"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="bg-black">{cat}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[9px] tracking-widest text-neutral-600 block mb-1">MAX PARTICIPANTS</label>
            <input
              type="number"
              value={maxParticipants}
              onChange={e => setMaxParticipants(parseInt(e.target.value) || 50)}
              min="2"
              max="100"
              className="w-full bg-transparent border border-neutral-800 p-2 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] tracking-widest text-neutral-600 block mb-1">VISIBILITY</label>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-full border p-2 font-mono text-xs uppercase transition-colors ${
                isPublic ? "border-white text-white" : "border-neutral-800 text-neutral-500"
              }`}
            >
              {isPublic ? "PUBLIC" : "PRIVATE"}
            </button>
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">TAGS (comma separated)</label>
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="e.g. music, chill, talk"
            className="w-full bg-transparent border border-neutral-800 p-2 font-mono text-xs text-white placeholder-neutral-700"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setScheduleMode(!scheduleMode)}
            className={`flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase transition-colors ${
              scheduleMode ? "text-white" : "text-neutral-600 hover:text-white"
            }`}
          >
            <Radio size={12} /> {scheduleMode ? "SCHEDULED MODE" : "SCHEDULE FOR LATER"}
          </button>
        </div>

        {scheduleMode && (
          <div>
            <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">SCHEDULED DATE & TIME</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className="w-full bg-transparent border border-neutral-800 p-2 font-mono text-xs text-white focus:outline-none focus:border-white"
            />
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            disabled={!canCreate || loading}
            onClick={handleCreate}
            className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-black bg-white px-5 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-30"
          >
            <Radio size={12} strokeWidth={2} /> [ CREATE ROOM ]
          </button>
          <button onClick={onClose} className="font-mono text-xs tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clashes, setClashes] = useState<ClashItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [trendingRooms, setTrendingRooms] = useState<Room[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loadingTrending, setLoadingTrending] = useState(true);

  const CATEGORIES = ["ALL", "GENERAL", "TECH", "MUSIC", "DEBATE", "CASUAL", "PROFESSIONAL"];

  useEffect(() => {
    const unsubClashes = subscribeToClashes((list) => {
      setClashes(list);
    });
    const unsubRooms = subscribeToPublicRooms((list) => {
      setRooms(list);
    });
    
    // Load trending rooms
    const loadTrending = async () => {
      setLoadingTrending(true);
      try {
        const trending = await getTrendingRooms(5);
        setTrendingRooms(trending);
      } catch (error) {
        console.error("Error loading trending rooms:", error);
      } finally {
        setLoadingTrending(false);
      }
    };
    loadTrending();
    
    return () => {
      unsubClashes();
      unsubRooms();
    };
  }, []);

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;
    try {
      await addParticipant(roomId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        isSpeaker: false,
      });
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this room?")) return;
    try {
      await deleteRoom(roomId);
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  const handleShareRoom = async (roomId: string) => {
    const shareUrl = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Room link copied to clipboard!");
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 flex flex-col font-sans">
      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={() => {}} />}

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">LIVE ROOMS</span>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-10 w-full flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase">// LIVE AUDIO ROOMS & RELAYS</p>
            <h1 className="font-serif italic text-3xl text-white">
              Listen in. Zero filter.
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-black bg-white px-4 py-2.5 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Plus size={11} strokeWidth={2} />
            CREATE
          </button>
        </div>

        {/* Trending Rooms Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-widest text-white">// 🔥 TRENDING ROOMS</p>
            <div className="flex items-center gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 border transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "border-white text-white"
                      : "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {loadingTrending ? (
            <div className="border border-neutral-900 p-6 text-center">
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase animate-pulse">LOADING TRENDING ROOMS...</p>
            </div>
          ) : trendingRooms.length === 0 ? (
            <div className="border border-neutral-900 p-6 text-center">
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">NO TRENDING ROOMS</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-900 border border-neutral-900">
              {trendingRooms.map((room) => (
                <div key={room.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">🔥</span>
                      <span className="text-white font-bold">{room.name}</span>
                      {!room.isPublic && <Lock size={12} className="text-neutral-600" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">{room.participantCount} LISTENERS</span>
                      <span className="px-2 py-0.5 border border-neutral-800 text-neutral-600 text-[10px] uppercase">{room.category}</span>
                    </div>
                  </div>
                  {room.description && (
                    <p className="font-serif italic text-neutral-300 text-sm">{room.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      className="flex-1 font-mono text-xs border border-white px-3 py-1.5 text-white hover:bg-white hover:text-black uppercase transition-colors cursor-pointer"
                    >
                      [ 🎧 JOIN ]
                    </button>
                    {user && room.hostUid === user.uid && (
                      <>
                        <button onClick={() => handleShareRoom(room.id)} title="Share room">
                          <Share2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} title="Delete room">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live Rooms Section */}
        <section className="space-y-4">
          <p className="font-mono text-xs tracking-widest text-white">// LIVE ROOMS</p>
          {rooms.length === 0 ? (
            <div className="border border-neutral-900 p-6 text-center space-y-3">
              <Radio className="w-6 h-6 text-neutral-700 mx-auto" />
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                NO LIVE ROOMS ACTIVE
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-900 border border-neutral-900">
              {rooms.map((room) => (
                <div key={room.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span className="text-white font-bold">{room.name}</span>
                      {!room.isPublic && <Lock size={12} className="text-neutral-600" />}
                    </div>
                    <div className="flex items-center gap-3 text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {room.participantCount}/{room.maxParticipants}
                      </span>
                      <span className="text-neutral-600">{room.category}</span>
                    </div>
                  </div>
                  {room.description && (
                    <p className="font-serif italic text-neutral-400 text-sm">"{room.description}"</p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-neutral-600">{room.hostHandle}</span>
                      <span className="font-mono text-[10px] text-neutral-700">HOST</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user && room.hostUid === user.uid && (
                        <>
                          <button
                            onClick={() => handleShareRoom(room.id)}
                            className="font-mono text-[10px] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            title="Share room"
                          >
                            <Share2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="font-mono text-[10px] text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete room"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      <Link
                        href={`/room/${room.id}`}
                        onClick={() => handleJoinRoom(room.id)}
                        className="font-mono text-xs border border-white px-3 py-1.5 text-white hover:bg-white hover:text-black uppercase transition-colors inline-block"
                      >
                        [ 🎧 JOIN ROOM ]
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Stage Debates Section */}
        <section className="space-y-4">
          <p className="font-mono text-xs tracking-widest text-white">// STAGE DEBATES</p>
          {clashes.length === 0 ? (
            <div className="border border-neutral-900 p-6 text-center space-y-3">
              <Swords className="w-6 h-6 text-neutral-700 mx-auto" />
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                NO LIVE DEBATES ON STAGE
              </p>
              <Link
                href="/clash"
                className="inline-block px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
              >
                [ ⚔ LAUNCH DEBATE ]
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-900 border border-neutral-900">
              {clashes.map((c: ClashItem) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span className="text-white font-bold">{c.title}</span>
                    </div>
                    <span className="text-neutral-500">
                      {c.listeners ? `${c.listeners * 12} AUDIENCE` : "1.4K AUDIENCE"}
                    </span>
                  </div>
                  <p className="font-serif italic text-neutral-300">"{c.topic}"</p>
                  <div className="pt-2">
                    <Link
                      href={`/stage/${c.id}`}
                      className="font-mono text-xs border border-white px-3 py-1.5 text-white hover:bg-white hover:text-black uppercase transition-colors inline-block"
                    >
                      [ 🎧 JOIN DEBATE ]
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
