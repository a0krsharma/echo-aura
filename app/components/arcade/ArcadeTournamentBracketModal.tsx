"use client";

import React, { useState } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  X,
  Trophy,
  Users,
  Swords,
  Crown,
  Sparkles,
  Volume2,
  Mic,
  Play,
  CheckCircle2,
  Moon,
  Flame,
  Radio,
  Share2,
} from "lucide-react";

export interface TournamentMatchNode {
  id: string;
  round: number; // 1: Round of 16, 2: Quarterfinals, 3: Semifinals, 4: Finals
  player1: { uid: string; handle: string; score?: number } | null;
  player2: { uid: string; handle: string; score?: number } | null;
  winnerUid?: string;
  status: "PENDING" | "LIVE" | "COMPLETED";
}

interface ArcadeTournamentBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: string;
  hostUid: string;
  currentUid: string;
}

const MEME_SOUNDS = [
  { name: "AIRHORN 📢", action: () => soundSynth.playAirhorn() },
  { name: "APPLAUSE 👏", action: () => soundSynth.playFanfare() },
  { name: "BUZZER ❌", action: () => soundSynth.playBuzzer() },
  { name: "GONG 🔔", action: () => soundSynth.playGong() },
  { name: "SNARE 🥁", action: () => soundSynth.playSnare() },
];

export default function ArcadeTournamentBracketModal({
  isOpen,
  onClose,
  gameType,
  hostUid,
  currentUid,
}: ArcadeTournamentBracketModalProps) {
  const [bracketSize, setBracketSize] = useState<8 | 16>(8);
  const isHost = currentUid === hostUid;

  // Initialize tournament bracket state
  const [nodes, setNodes] = useState<TournamentMatchNode[]>([
    // Quarterfinals
    { id: "qf1", round: 2, player1: { uid: "p1", handle: "@ROHIT_IIT" }, player2: { uid: "p2", handle: "@ABHISHEK_07" }, status: "COMPLETED", winnerUid: "p2" },
    { id: "qf2", round: 2, player1: { uid: "p3", handle: "@NEURAL_BOT" }, player2: { uid: "p4", handle: "@PRIYA_HOSTEL" }, status: "COMPLETED", winnerUid: "p4" },
    { id: "qf3", round: 2, player1: { uid: "p5", handle: "@VIKRAM_NIT" }, player2: { uid: "p6", handle: "@KABIR_99" }, status: "LIVE" },
    { id: "qf4", round: 2, player1: { uid: "p7", handle: "@ANANYA_BITS" }, player2: { uid: "p8", handle: "@RISHI_ROOM4" }, status: "PENDING" },
    // Semifinals
    { id: "sf1", round: 3, player1: { uid: "p2", handle: "@ABHISHEK_07" }, player2: { uid: "p4", handle: "@PRIYA_HOSTEL" }, status: "PENDING" },
    { id: "sf2", round: 3, player1: null, player2: null, status: "PENDING" },
    // Grand Final
    { id: "fn1", round: 4, player1: null, player2: null, status: "PENDING" },
  ]);

  if (!isOpen) return null;

  const handleAdvanceWinner = (nodeId: string, winnerUid: string) => {
    soundSynth.playFanfare();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, winnerUid, status: "COMPLETED" };
        }
        return n;
      })
    );
  };

  const handlePlaySoundMeme = (item: { name: string; action: () => void }) => {
    item.action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-black border-2 border-white p-4 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.25)] select-none max-h-[94vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tournament Header */}
        <div className="flex items-center justify-between border-b-2 border-white pb-3 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-widest flex items-center gap-2">
                <span>CAMPUS NIGHT BATTLES // TOURNAMENT BRACKET</span>
              </h2>
              <p className="text-[10px] text-neutral-400 uppercase font-bold">
                11 PM – 2 AM HOSTEL TOURNAMENT EDITION • OPEN AUDIO COMMENTARY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-yellow-400 font-black text-xs uppercase rounded">
              🏆 POT: 2,400 AURA
            </span>
          </div>
        </div>

        {/* Spectator Soundboard for Eliminated Players */}
        <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-neutral-300">
            <span className="flex items-center gap-1.5 uppercase">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span>LIVE SPECTATOR VOICE SOUNDBOARD (MEME DROPS)</span>
            </span>
            <span className="text-[10px] text-neutral-500 uppercase">
              TAP TO DROP AUDIO REACTION INTO ROOM
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {MEME_SOUNDS.map((meme) => (
              <button
                key={meme.name}
                type="button"
                onClick={() => handlePlaySoundMeme(meme)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-white text-white font-black text-[11px] uppercase rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{meme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visual Interactive Bracket Tree */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Column 1: Quarterfinals */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase text-neutral-400 text-center border-b border-neutral-800 pb-1">
                QUARTERFINALS (8P)
              </div>
              {nodes
                .filter((n) => n.round === 2)
                .map((node, idx) => (
                  <div
                    key={node.id}
                    className={`p-2.5 border-2 rounded-xl space-y-1.5 transition-all ${
                      node.status === "LIVE"
                        ? "border-emerald-400 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                        : "border-neutral-800 bg-neutral-950"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400">
                      <span>MATCH {idx + 1}</span>
                      <span className={node.status === "LIVE" ? "text-emerald-400 font-black" : ""}>
                        {node.status}
                      </span>
                    </div>

                    {/* Player 1 */}
                    <div
                      className={`flex justify-between items-center p-1.5 rounded text-xs font-black ${
                        node.winnerUid === node.player1?.uid
                          ? "bg-white text-black font-black"
                          : "text-white"
                      }`}
                    >
                      <span className="truncate">{node.player1?.handle || "TBD"}</span>
                      {node.winnerUid === node.player1?.uid && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>

                    {/* Player 2 */}
                    <div
                      className={`flex justify-between items-center p-1.5 rounded text-xs font-black ${
                        node.winnerUid === node.player2?.uid
                          ? "bg-white text-black font-black"
                          : "text-white"
                      }`}
                    >
                      <span className="truncate">{node.player2?.handle || "TBD"}</span>
                      {node.winnerUid === node.player2?.uid && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>

                    {/* Host Winner Controls */}
                    {isHost && node.status === "LIVE" && (
                      <div className="grid grid-cols-2 gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAdvanceWinner(node.id, node.player1?.uid || "")}
                          className="py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[10px] uppercase rounded cursor-pointer"
                        >
                          ADVANCE P1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdvanceWinner(node.id, node.player2?.uid || "")}
                          className="py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[10px] uppercase rounded cursor-pointer"
                        >
                          ADVANCE P2
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Column 2: Semifinals */}
            <div className="space-y-6">
              <div className="text-xs font-black uppercase text-neutral-400 text-center border-b border-neutral-800 pb-1">
                SEMIFINALS (4P)
              </div>
              {nodes
                .filter((n) => n.round === 3)
                .map((node, idx) => (
                  <div
                    key={node.id}
                    className="p-3 border-2 border-neutral-800 bg-neutral-950 rounded-xl space-y-2"
                  >
                    <div className="text-[10px] font-bold text-neutral-400">SEMI-FINAL {idx + 1}</div>
                    <div className="p-1.5 bg-neutral-900 rounded text-xs font-black text-white flex justify-between">
                      <span>{node.player1?.handle || "WINNER QF1"}</span>
                    </div>
                    <div className="p-1.5 bg-neutral-900 rounded text-xs font-black text-white flex justify-between">
                      <span>{node.player2?.handle || "WINNER QF2"}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Column 3: Grand Final */}
            <div className="space-y-4">
              <div className="text-xs font-black uppercase text-amber-400 text-center border-b border-amber-400/40 pb-1">
                👑 GRAND FINAL & CHAMPION
              </div>
              <div className="p-4 border-4 border-amber-400 bg-neutral-950 rounded-2xl text-center space-y-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <Trophy className="w-10 h-10 text-yellow-400 mx-auto animate-bounce" />
                <div className="space-y-1">
                  <div className="text-xs font-black text-yellow-400 uppercase">
                    CHAMPIONSHIP DUEL
                  </div>
                  <div className="p-2 bg-black border border-neutral-800 rounded font-black text-sm text-white">
                    @ABHISHEK_07 vs @PRIYA_HOSTEL
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400 uppercase font-bold">
                  Winner takes +1,600 Aura Points & Dorm Champion Badge!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
