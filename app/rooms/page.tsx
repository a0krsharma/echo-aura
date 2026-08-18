"use client";

/**
 * ECHO — Echo Live Rooms ( /rooms )
 * 1-Tap Tune-In audio frequencies & scheduled transmissions.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Swords, Plus, X, Calendar, Flame, Lock } from "lucide-react";
import { subscribeToClashes, type ClashItem } from "@/lib/clashes";
import { subscribeToPublicRooms, getTrendingRooms, getRoomsByCategory, deleteRoom, type Room } from "@/lib/rooms";
import { useAuth } from "@/app/components/AuthProvider";
import QuickRoomCard from "@/app/components/QuickRoomCard";
import { ScheduledRoomCard } from "@/app/components/ScheduledRoomCard";

function CreateRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: (roomId: string) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("TECH");
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [openMic, setOpenMic] = useState(false);

  const CATEGORIES = ["GENERAL", "TECH", "MARKETS", "MUSIC", "DEBATE", "CRICKET", "CASUAL"];

  const getDefaultScheduledTime = (hoursAhead = 1) => {
    const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getTomorrowTime = (hour = 20) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toggleScheduleMode = () => {
    const nextMode = !scheduleMode;
    setScheduleMode(nextMode);
    if (nextMode && !scheduledFor) {
      setScheduledFor(getDefaultScheduledTime(1));
    }
  };

  const canCreate = name.trim().length >= 3 && user;

  const handleCreate = async () => {
    if (!canCreate || !user) return;

    if (scheduleMode && !scheduledFor) {
      alert("Please select a transmission date & time.");
      return;
    }

    setLoading(true);
    try {
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
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          scheduledFor: scheduleMode && scheduledFor ? new Date(scheduledFor).toISOString() : null,
          openMic,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(`Error: ${data.error || "Failed to create room"}`);
        return;
      }

      onCreate(data.roomId);

      if (scheduleMode) {
        alert("[ TRANSMISSION SCHEDULED ] Your transmission is listed on the scheduled board.");
        onClose();
      } else {
        router.push(`/room/${data.roomId}`);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Error: Failed to create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-black border border-white p-6 md:p-8 animate-slide-up space-y-4 font-mono">
        <div className="flex items-start justify-between border-b border-neutral-900 pb-3">
          <div>
            <p className="text-[10px] tracking-widest text-neutral-500 uppercase">// BROADCAST SETUP</p>
            <h2 className="text-sm font-bold text-white uppercase mt-0.5">LAUNCH LIVE FREQUENCY</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] tracking-widest text-neutral-500 block mb-1">FREQUENCY TITLE</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. OPTIONS EXPIRY & ORDER FLOW"
              className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white placeholder-neutral-700 outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="text-[10px] tracking-widest text-neutral-500 block mb-1">TOPIC / PINNED ARTIFACT</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Thesis or discussion notes for listeners"
              className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white placeholder-neutral-700 outline-none focus:border-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] tracking-widest text-neutral-500 block mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white outline-none focus:border-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] tracking-widest text-neutral-500 block mb-1">MIC ACCESS</label>
              <button
                type="button"
                onClick={() => setOpenMic(!openMic)}
                className={`w-full border p-2.5 text-xs uppercase tracking-wider transition-colors ${
                  openMic ? "border-white bg-white text-black font-bold" : "border-neutral-800 text-neutral-400 bg-neutral-950"
                }`}
              >
                {openMic ? "OPEN MIC" : "HAND RAISE"}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={toggleScheduleMode}
              className={`flex items-center gap-2 text-[10px] tracking-widest uppercase transition-colors cursor-pointer ${
                scheduleMode ? "text-white font-bold" : "text-neutral-500 hover:text-white"
              }`}
            >
              <Calendar size={12} /> {scheduleMode ? "[ SCHEDULED MODE ACTIVE ]" : "[+] SCHEDULE FOR LATER"}
            </button>
          </div>

          {scheduleMode && (
            <div className="space-y-2 border border-neutral-900 bg-neutral-950 p-3">
              <label className="text-[10px] tracking-widest text-neutral-400 block uppercase font-bold">
                TRANSMISSION DATE & TIME
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                min={getDefaultScheduledTime(0)}
                style={{ colorScheme: "dark" }}
                onChange={e => setScheduledFor(e.target.value)}
                className="w-full bg-black border border-neutral-700 p-2.5 text-xs text-white outline-none focus:border-white cursor-pointer"
              />

              {/* Quick 1-Tap Time Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setScheduledFor(getDefaultScheduledTime(1))}
                  className="px-2 py-1 text-[9px] border border-neutral-800 hover:border-white text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
                >
                  +1 HR
                </button>
                <button
                  type="button"
                  onClick={() => setScheduledFor(getDefaultScheduledTime(3))}
                  className="px-2 py-1 text-[9px] border border-neutral-800 hover:border-white text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
                >
                  +3 HRS
                </button>
                <button
                  type="button"
                  onClick={() => setScheduledFor(getTomorrowTime(20))}
                  className="px-2 py-1 text-[9px] border border-neutral-800 hover:border-white text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
                >
                  TOMORROW 8 PM
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-900">
          <button
            onClick={onClose}
            className="text-xs tracking-widest uppercase text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || loading}
            className="text-xs tracking-widest uppercase border border-white bg-white text-black font-bold px-5 py-2.5 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? "INITIALIZING..." : scheduleMode ? "[ SCHEDULE TRANSMISSION ]" : "[ GO LIVE ]"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clashes, setClashes] = useState<ClashItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const CATEGORIES = ["ALL", "TECH", "MARKETS", "DEBATE", "MUSIC", "CRICKET", "GENERAL"];

  useEffect(() => {
    const unsubClashes = subscribeToClashes((list) => setClashes(list));
    const unsubRooms = subscribeToPublicRooms((list) => setRooms(list));
    return () => {
      unsubClashes();
      unsubRooms();
    };
  }, []);

  const liveRooms = rooms.filter(r => !r.scheduledFor);
  const scheduledRooms = rooms.filter(r => Boolean(r.scheduledFor));

  const filteredLiveRooms = selectedCategory === "ALL"
    ? liveRooms
    : liveRooms.filter(r => (r.category || "").toUpperCase() === selectedCategory);

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to end and delete this frequency?")) return;
    try {
      await deleteRoom(roomId);
    } catch (err) {
      alert("Failed to delete room.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={() => {}} />}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8 w-full">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="space-y-1">
            <p className="text-[10px] tracking-widest text-neutral-500 uppercase">// 1-TAP LIVE AUDIO ROOMS</p>
            <h1 className="text-2xl font-bold tracking-widest text-white uppercase">
              [ ROOMS ]
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-black bg-white px-4 py-2.5 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            [ + ROOM ]
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                selectedCategory === cat
                  ? "border-white bg-white text-black font-bold"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-600 bg-neutral-950"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Frequencies (1-Tap Tune-In) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              // ACTIVE LIVE ROOMS ({filteredLiveRooms.length})
            </span>
            <span className="text-[9px] text-neutral-600 uppercase tracking-widest">
              TAP ANY CARD TO INTERCEPT AUDIO
            </span>
          </div>

          {filteredLiveRooms.length === 0 ? (
            <div className="border border-neutral-900 bg-neutral-950 p-8 text-center space-y-3">
              <Radio className="w-6 h-6 text-neutral-700 mx-auto animate-pulse" />
              <p className="text-xs text-neutral-500 tracking-widest uppercase">
                NO LIVE ROOMS IN THIS BAND
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-block px-4 py-2 border border-white text-white text-[11px] tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                [ + START YOUR FIRST ROOM ]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredLiveRooms.map(room => (
                <QuickRoomCard
                  key={room.id}
                  room={room}
                  isHost={user?.uid === room.hostUid}
                  onDelete={() => handleDeleteRoom(room.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Scheduled Transmissions */}
        <section className="space-y-3 pt-4 border-t border-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              // SCHEDULED TRANSMISSIONS ({scheduledRooms.length})
            </span>
            <span className="text-[9px] text-neutral-600 uppercase tracking-widest">
              SYNC CALENDAR & ALARMS
            </span>
          </div>

          {scheduledRooms.length === 0 ? (
            <div className="border border-neutral-900 bg-neutral-950 p-6 text-center">
              <p className="text-xs text-neutral-600 tracking-widest uppercase">
                NO UPCOMING SCHEDULED TRANSMISSIONS
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledRooms.map(room => (
                <ScheduledRoomCard
                  key={room.id}
                  room={room}
                  isHost={user?.uid === room.hostUid}
                  onDelete={() => handleDeleteRoom(room.id)}
                  onStartNow={() => {
                    window.location.href = `/room/${room.id}`;
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Live Stage Debates */}
        {clashes.length > 0 && (
          <section className="space-y-3 pt-4 border-t border-neutral-900">
            <span className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <Swords className="w-3.5 h-3.5" />
              // LIVE STAGE DEBATES ({clashes.length})
            </span>
            <div className="space-y-2">
              {clashes.map((c: ClashItem) => (
                <div key={c.id} className="border border-neutral-800 bg-neutral-950 p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">
                      DEBATE ARENA // {c.listeners || 1} NODES
                    </span>
                    <h3 className="text-xs font-bold text-white uppercase">{c.title}</h3>
                  </div>
                  <Link
                    href={`/stage/${c.id}`}
                    className="px-3 py-1.5 border border-white text-white hover:bg-white hover:text-black text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    [ ENTER STAGE ]
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
