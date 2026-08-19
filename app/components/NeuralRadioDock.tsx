"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, 
  Play, 
  Pause, 
  SkipForward, 
  Zap, 
  Coins, 
  Sparkles, 
  Plus, 
  Flame, 
  Volume2, 
  CheckCircle2,
  Clock,
  Send,
  X,
  Layers
} from "lucide-react";
import { 
  updateNeuralQueue, 
  advanceNeuralTrack, 
  type Room, 
  type NeuralQueueState, 
  type NeuralQueueTrack 
} from "@/lib/rooms";
import { mineVoltsForSession, tipVolts, getUserVoltBalance } from "@/lib/volts";
import { collection, query, where, limit, getDocs, orderBy } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

interface NeuralRadioDockProps {
  room: Room;
  isHost: boolean;
  currentUserUid: string;
  currentUserHandle: string;
}

const DEFAULT_DEMO_QUEUE: NeuralQueueTrack[] = [
  {
    trackId: "demo_synth_01",
    title: "Khamoshiyon Ki Zubaan (Acoustic Ghazal)",
    creatorUid: "demo_shayar",
    creatorHandle: "@poet_node",
    url: "https://res.cloudinary.com/dgu4x5d3y/video/upload/v1718812345/ghazal_demo.mp3",
    durationSec: 85,
    isCloned: true,
  },
  {
    trackId: "demo_synth_02",
    title: "Terminal Midnight Monologue",
    creatorUid: "demo_noir",
    creatorHandle: "@cyber_voice",
    url: "https://res.cloudinary.com/dgu4x5d3y/video/upload/v1718812400/noir_monologue.mp3",
    durationSec: 110,
    isCloned: false,
  },
];

export default function NeuralRadioDock({
  room,
  isHost,
  currentUserUid,
  currentUserHandle,
}: NeuralRadioDockProps) {
  const [sessionVoltsMined, setSessionVoltsMined] = useState<number>(0);
  const [userVoltBalance, setUserVoltBalance] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [showTipModal, setShowTipModal] = useState<{ open: boolean; target: "CREATOR" | "HOST" }>({
    open: false,
    target: "CREATOR",
  });
  const [tipAmount, setTipAmount] = useState<number>(1);
  const [tipStatus, setTipStatus] = useState<string | null>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [availableSynthPosts, setAvailableSynthPosts] = useState<any[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const miningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const queueState = room.neuralQueueState || {
    currentIndex: 0,
    startedAt: Date.now(),
    isPlaying: true,
    queue: DEFAULT_DEMO_QUEUE,
  };

  const currentTrack: NeuralQueueTrack | undefined = queueState.queue[queueState.currentIndex];

  // Fetch initial volt balance
  useEffect(() => {
    if (currentUserUid) {
      getUserVoltBalance(currentUserUid).then(setUserVoltBalance);
    }
  }, [currentUserUid]);

  // ── Synchronized Native Audio Playback ────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const audio = audioRef.current;
    const elapsedSec = Math.max(0, (Date.now() - queueState.startedAt) / 1000);

    if (queueState.isPlaying && elapsedSec < currentTrack.durationSec) {
      if (audio.src !== currentTrack.url) {
        audio.src = currentTrack.url;
      }
      audio.currentTime = elapsedSec;
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn("[NeuralRadio Audio Blocked]:", e);
          setIsPlaying(false);
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, queueState.startedAt, queueState.isPlaying]);

  // ── Track Time Progress & Auto-Advance ────────────────────────────────────
  useEffect(() => {
    if (queueState.isPlaying && currentTrack) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);

      progressTimerRef.current = setInterval(() => {
        const elapsed = Math.max(0, (Date.now() - queueState.startedAt) / 1000);
        setCurrentTimeSec(Math.min(currentTrack.durationSec, Math.round(elapsed)));

        // Host advances queue when track reaches end
        if (isHost && elapsed >= currentTrack.durationSec) {
          const nextIdx = (queueState.currentIndex + 1) % queueState.queue.length;
          advanceNeuralTrack(room.id, nextIdx);
        }
      }, 1000);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [queueState, currentTrack, isHost, room.id]);

  // ── 60-Second Volt Mining Engine ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUserUid || !queueState.isPlaying) return;

    if (miningTimerRef.current) clearInterval(miningTimerRef.current);

    // Run mining cycle every 60 seconds of listening
    miningTimerRef.current = setInterval(async () => {
      const res = await mineVoltsForSession({
        roomId: room.id,
        listenerUid: currentUserUid,
        creatorUid: currentTrack?.creatorUid,
        creatorHandle: currentTrack?.creatorHandle,
        hostUid: room.hostUid,
        hostHandle: room.hostHandle,
        trackId: currentTrack?.trackId,
        trackTitle: currentTrack?.title,
      });

      setSessionVoltsMined((prev) => Number((prev + 0.1).toFixed(2)));
      getUserVoltBalance(currentUserUid).then(setUserVoltBalance);
    }, 60000);

    return () => {
      if (miningTimerRef.current) clearInterval(miningTimerRef.current);
    };
  }, [currentUserUid, queueState.isPlaying, currentTrack, room]);

  // ── Fetch Community Synth Posts for Queue ────────────────────────────────
  const loadCommunitySynthPosts = async () => {
    const db = getFirebaseDb();
    try {
      const q = query(
        collection(db, "posts"),
        where("isNeural", "==", true),
        orderBy("createdAt", "desc"),
        limit(15)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAvailableSynthPosts(items);
    } catch (e) {
      console.warn("Fetch synth posts error:", e);
    }
  };

  // ── Host Add Track to Queue ──────────────────────────────────────────────
  const handleAddToQueue = async (post: any) => {
    const newTrack: NeuralQueueTrack = {
      trackId: post.id,
      title: post.caption || "Community Neural Synthesis",
      creatorUid: post.authorUid,
      creatorHandle: post.authorHandle || "@ANON",
      url: post.audioUrl,
      durationSec: post.durationSec || 60,
      isCloned: post.isCloned,
    };

    const newQueue = [...queueState.queue, newTrack];
    await updateNeuralQueue(room.id, {
      ...queueState,
      queue: newQueue,
    });
    setShowQueueModal(false);
  };

  // ── 1-Click Tip Handler ──────────────────────────────────────────────────
  const handleSendTip = async () => {
    const isCreator = showTipModal.target === "CREATOR";
    const toUid = isCreator ? currentTrack?.creatorUid : room.hostUid;
    const toHandle = isCreator ? currentTrack?.creatorHandle : room.hostHandle;

    if (!toUid || !toHandle) {
      setTipStatus("Target recipient unavailable");
      return;
    }

    try {
      setTipStatus("Transmitting Volt micro-tip...");
      await tipVolts({
        fromUid: currentUserUid,
        fromHandle: currentUserHandle,
        toUid,
        toHandle,
        amount: tipAmount,
        roomId: room.id,
        role: showTipModal.target,
      });

      setTipStatus(`⚡ Transferred ${tipAmount} VOLT to ${toHandle}!`);
      getUserVoltBalance(currentUserUid).then(setUserVoltBalance);
      setTimeout(() => {
        setShowTipModal({ open: false, target: "CREATOR" });
        setTipStatus(null);
      }, 1200);
    } catch (err: any) {
      setTipStatus(`[ERROR]: ${err?.message || "Tip transaction failed"}`);
    }
  };

  // Format seconds to MM:SS
  const fmtSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = currentTrack
    ? Math.min(100, (currentTimeSec / currentTrack.durationSec) * 100)
    : 0;

  return (
    <div className="bg-neutral-950 border border-white p-3.5 font-mono text-white space-y-3 shadow-2xl">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} onEnded={() => isHost && advanceNeuralTrack(room.id, (queueState.currentIndex + 1) % queueState.queue.length)} />

      {/* Top Header & Volt Mining Telemetry */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
          <span className="font-bold tracking-widest uppercase text-white">
            // NEURAL RADIO PROTOCOL
          </span>
          <span className="text-[10px] bg-white text-black font-black px-1.5 py-0.2 uppercase">
            VOLT MINING ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] tabular-nums">
          <span className="text-amber-400 font-bold flex items-center gap-1">
            ⚡ {sessionVoltsMined.toFixed(2)} MINED
          </span>
          <span className="text-neutral-400 border border-neutral-800 px-2 py-0.5 uppercase">
            WALLET: {userVoltBalance.toFixed(2)}⚡
          </span>
        </div>
      </div>

      {/* Now Playing Monitor */}
      {currentTrack ? (
        <div className="bg-black border border-neutral-800 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-neutral-900 border border-white flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>

            <div className="overflow-hidden space-y-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-white uppercase truncate">{currentTrack.title}</p>
                <span className="text-[9px] bg-white text-black font-extrabold px-1.5 uppercase shrink-0">
                  {currentTrack.isCloned ? "[+] CLONE AI" : "[+] SYNTH AI"}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 uppercase">
                CREATOR: <span className="text-white font-bold">{currentTrack.creatorHandle}</span> • CURATOR:{" "}
                <span className="text-white font-bold">{room.hostHandle}</span>
              </p>
            </div>
          </div>

          {/* Action Row: Tipping & Host Skip */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTipModal({ open: true, target: "CREATOR" })}
              className="px-2.5 py-1.5 border border-amber-400 bg-amber-400 text-black font-bold text-[10px] uppercase tracking-wider hover:bg-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <Coins className="w-3 h-3" />
              <span>[ TIP CREATOR ]</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTipModal({ open: true, target: "HOST" })}
              className="px-2.5 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:border-white font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>[ TIP HOST ]</span>
            </button>

            {isHost && (
              <>
                <button
                  type="button"
                  onClick={() => advanceNeuralTrack(room.id, (queueState.currentIndex + 1) % queueState.queue.length)}
                  className="p-1.5 border border-white bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                  title="Skip to next track"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadCommunitySynthPosts();
                    setShowQueueModal(true);
                  }}
                  className="px-2 py-1.5 border border-neutral-800 bg-black text-neutral-400 hover:text-white hover:border-white font-mono text-[10px] uppercase cursor-pointer"
                >
                  <Plus className="w-3 h-3 inline mr-1" /> QUEUE
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-black border border-neutral-900 p-4 text-center text-xs text-neutral-500 uppercase">
          &gt;&gt; NEURAL RADIO STANDBY · NO TRACKS IN QUEUE
        </div>
      )}

      {/* Progress Bar & Timing */}
      {currentTrack && (
        <div className="space-y-1">
          <div className="w-full bg-neutral-900 h-1.5 overflow-hidden border border-neutral-800">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-neutral-500 tabular-nums">
            <span>{fmtSec(currentTimeSec)}</span>
            <span className="text-neutral-400">70% CREATOR / 20% HOST / 10% BURN</span>
            <span>{fmtSec(currentTrack.durationSec)}</span>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {showTipModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-white max-w-sm w-full p-5 font-mono text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                // TIP {showTipModal.target === "CREATOR" ? "AI TRACK CREATOR" : "ROOM HOST"}
              </span>
              <button
                type="button"
                onClick={() => setShowTipModal({ open: false, target: "CREATOR" })}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                [ CLOSE ]
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Send instant ⚡ Volts to{" "}
              <strong className="text-white">
                {showTipModal.target === "CREATOR" ? currentTrack?.creatorHandle : room.hostHandle}
              </strong>
              .
            </p>

            {/* Tip Amount Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 25].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTipAmount(amt)}
                  className={`py-2 text-xs font-bold uppercase border transition-colors cursor-pointer ${
                    tipAmount === amt
                      ? "border-amber-400 bg-amber-400 text-black"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-white hover:text-white"
                  }`}
                >
                  {amt} ⚡
                </button>
              ))}
            </div>

            {tipStatus && (
              <p className="text-[10px] text-amber-400 text-center font-bold">{tipStatus}</p>
            )}

            <button
              type="button"
              onClick={handleSendTip}
              className="w-full py-2.5 border border-white bg-white text-black font-extrabold text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              [ CONFIRM {tipAmount}⚡ VOLT TIP ]
            </button>
          </div>
        </div>
      )}

      {/* Host Queue Management Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-white max-w-lg w-full p-5 font-mono text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                // ADD COMMUNITY SYNTH TRACK TO QUEUE
              </span>
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                [ CLOSE ]
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-neutral-900">
              {availableSynthPosts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddToQueue(p)}
                  className="pt-2 flex items-center justify-between gap-3 hover:bg-neutral-950 p-2 cursor-pointer transition-colors"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white uppercase truncate">{p.caption || "Untitled Synth"}</p>
                    <p className="text-[10px] text-neutral-400 uppercase">
                      BY {p.authorHandle} • {p.duration || "1:00"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="border border-white bg-white text-black font-bold text-[10px] px-2.5 py-1 uppercase tracking-wider shrink-0"
                  >
                    + ADD TO QUEUE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
