"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  subscribeActiveTournaments,
  subscribeArcadeTournament,
  joinTournamentSlot,
  advanceTournamentWinner,
  type ArcadeTournament,
  type TournamentMatchNode,
} from "@/lib/arcadeTournaments";
import ArcadeTournamentCreateModal from "@/app/components/arcade/ArcadeTournamentCreateModal";
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
  Plus,
  Copy,
  Check,
  Smartphone,
} from "lucide-react";

interface ArcadeTournamentBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType?: string;
  hostUid: string;
  currentUid: string;
  initialTournamentId?: string;
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
  gameType = "hand_cricket",
  hostUid,
  currentUid,
  initialTournamentId,
}: ArcadeTournamentBracketModalProps) {
  const [tournaments, setTournaments] = useState<ArcadeTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(initialTournamentId || null);
  const [activeTournament, setActiveTournament] = useState<ArcadeTournament | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Subscribe to all live campus tournaments
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeActiveTournaments((list) => {
      setTournaments(list);
      if (!selectedTournamentId && list.length > 0) {
        setSelectedTournamentId(list[0].id);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [isOpen, selectedTournamentId]);

  // Subscribe to selected active tournament details
  useEffect(() => {
    if (!selectedTournamentId) {
      setActiveTournament(null);
      return;
    }
    const unsub = subscribeArcadeTournament(selectedTournamentId, (tour) => {
      setActiveTournament(tour);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [selectedTournamentId]);

  if (!isOpen) return null;

  const isHost = activeTournament ? activeTournament.hostUid === currentUid : currentUid === hostUid;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const tournamentUrl = activeTournament ? `${origin}/arcade?tournamentId=${activeTournament.id}` : origin;
  
  const whatsappTournamentInvite = activeTournament
    ? `🏆 Register for my ${activeTournament.title} (${activeTournament.size}-Player Bracket Tournament) on Echo! Entry Pot: +${activeTournament.totalPot} Aura. Mic is on: ${tournamentUrl}`
    : `🏆 Join Campus Night Battles Tournament on Echo! Mic is on: ${tournamentUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(tournamentUrl);
      setCopied(true);
      soundSynth.playSubtlePop();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleJoinSlot = async (slotIndex?: number) => {
    if (!activeTournament || !currentUid) return;
    soundSynth.playSubtlePop();
    try {
      await joinTournamentSlot(activeTournament.id, {
        uid: currentUid,
        handle: `@PLAYER_${currentUid.slice(0, 5)}`,
      }, slotIndex);
      soundSynth.playGong();
    } catch (err: any) {
      alert(err.message || "Failed to join tournament slot");
    }
  };

  const handleAdvance = async (nodeId: string, winnerUid: string) => {
    if (!activeTournament) return;
    try {
      await advanceTournamentWinner(activeTournament.id, nodeId, winnerUid);
    } catch (err: any) {
      console.error(err);
    }
  };

  const nodes = activeTournament?.nodes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-black border-2 border-white p-4 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.25)] select-none max-h-[94vh] overflow-y-auto">
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
                11 PM – 2 AM HOSTEL TOURNAMENT SUITE • OPEN AUDIO COMMENTARY
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Tournament Button */}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>[ + CREATE TOURNAMENT ]</span>
            </button>

            {activeTournament && (
              <span className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-yellow-400 font-black text-xs uppercase rounded">
                🏆 POT: {activeTournament.totalPot} AURA
              </span>
            )}
          </div>
        </div>

        {/* Active Campus Tournament Selector Tabs */}
        {tournaments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
            <span className="text-[10px] text-neutral-500 font-bold uppercase shrink-0">
              ACTIVE CUPS:
            </span>
            {tournaments.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => setSelectedTournamentId(tour.id)}
                className={`px-3 py-1 text-xs font-black uppercase rounded-lg border transition-all shrink-0 cursor-pointer ${
                  selectedTournamentId === tour.id
                    ? "border-amber-400 bg-amber-950/50 text-white shadow-md"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {tour.title} ({Object.keys(tour.registeredPlayers || {}).length}/{tour.size}P)
              </button>
            ))}
          </div>
        )}

        {/* 1-Tap WhatsApp Tournament Registration & Link Bar */}
        {activeTournament && (
          <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase text-white flex items-center gap-2">
                <span>{activeTournament.title}</span>
                <span className="text-[10px] text-neutral-400 border border-neutral-800 px-1.5 py-0.5 rounded">
                  {activeTournament.gameType.toUpperCase()}
                </span>
                <span className="text-[10px] text-amber-400 font-bold">
                  STATUS: {activeTournament.status}
                </span>
              </span>
              <p className="text-[10px] text-neutral-400 font-bold">
                Host: {activeTournament.hostHandle} • Entry: {activeTournament.stakes} Aura • Prize: +{activeTournament.totalPot} Aura
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappTournamentInvite)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundSynth.playAirhorn()}
                className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>💬 INVITE ON WHATSAPP</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "COPIED!" : "COPY LINK"}</span>
              </button>

              {!activeTournament.registeredPlayers[currentUid] && activeTournament.status === "REGISTRATION" && (
                <button
                  type="button"
                  onClick={() => handleJoinSlot()}
                  className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
                >
                  [ 🎮 CLAIM BRACKET SLOT ]
                </button>
              )}
            </div>
          </div>
        )}

        {/* Spectator Soundboard for Eliminated Players & Audience */}
        <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-neutral-300">
            <span className="flex items-center gap-1.5 uppercase">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span>LIVE SPECTATOR VOICE SOUNDBOARD (MEME DROPS)</span>
            </span>
            <span className="text-[10px] text-neutral-500 uppercase font-bold">
              TAP TO DROP AUDIO MEME INTO LIVE COMMENTARY
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {MEME_SOUNDS.map((meme) => (
              <button
                key={meme.name}
                type="button"
                onClick={() => meme.action()}
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
            {/* Column 1: Quarterfinals / Round of 16 */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase text-neutral-400 text-center border-b border-neutral-800 pb-1">
                {activeTournament?.size === 16 ? "ROUND OF 16" : "QUARTERFINALS"}
              </div>
              {(nodes.filter((n) => n.round === (activeTournament?.size === 16 ? 1 : 2)).length > 0
                ? nodes.filter((n) => n.round === (activeTournament?.size === 16 ? 1 : 2))
                : [
                    { id: "qf1", round: 2, matchIndex: 1, player1: { uid: "p1", handle: "@ROHIT_IIT" }, player2: { uid: "p2", handle: "@ABHISHEK_07" }, status: "COMPLETED" as const, winnerUid: "p2" },
                    { id: "qf2", round: 2, matchIndex: 2, player1: { uid: "p3", handle: "@NEURAL_BOT" }, player2: { uid: "p4", handle: "@PRIYA_HOSTEL" }, status: "COMPLETED" as const, winnerUid: "p4" },
                    { id: "qf3", round: 2, matchIndex: 3, player1: { uid: "p5", handle: "@VIKRAM_NIT" }, player2: { uid: "p6", handle: "@KABIR_99" }, status: "LIVE" as const },
                    { id: "qf4", round: 2, matchIndex: 4, player1: { uid: "p7", handle: "@ANANYA_BITS" }, player2: { uid: "p8", handle: "@RISHI_ROOM4" }, status: "PENDING" as const },
                  ]
              ).map((node, idx) => (
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
                        : "text-white bg-black/40"
                    }`}
                  >
                    <span className="truncate">{node.player1?.handle || "OPEN SLOT"}</span>
                    {node.winnerUid === node.player1?.uid && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </div>

                  {/* Player 2 */}
                  <div
                    className={`flex justify-between items-center p-1.5 rounded text-xs font-black ${
                      node.winnerUid === node.player2?.uid
                        ? "bg-white text-black font-black"
                        : "text-white bg-black/40"
                    }`}
                  >
                    <span className="truncate">{node.player2?.handle || "OPEN SLOT"}</span>
                    {node.winnerUid === node.player2?.uid && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </div>

                  {/* Host Winner Advancement Controls */}
                  {isHost && (
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {node.player1 && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(node.id, node.player1?.uid || "")}
                          className="py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[9px] uppercase rounded cursor-pointer"
                        >
                          ADV P1
                        </button>
                      )}
                      {node.player2 && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(node.id, node.player2?.uid || "")}
                          className="py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[9px] uppercase rounded cursor-pointer"
                        >
                          ADV P2
                        </button>
                      )}
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
              {(nodes.filter((n) => n.round === 3).length > 0
                ? nodes.filter((n) => n.round === 3)
                : [
                    { id: "sf1", round: 3, matchIndex: 1, player1: { uid: "p2", handle: "@ABHISHEK_07" }, player2: { uid: "p4", handle: "@PRIYA_HOSTEL" }, status: "PENDING" as const },
                    { id: "sf2", round: 3, matchIndex: 2, player1: null, player2: null, status: "PENDING" as const },
                  ]
              ).map((node, idx) => (
                <div
                  key={node.id}
                  className="p-3 border-2 border-neutral-800 bg-neutral-950 rounded-xl space-y-2"
                >
                  <div className="text-[10px] font-bold text-neutral-400">SEMI-FINAL {idx + 1}</div>
                  <div className="p-1.5 bg-neutral-900 rounded text-xs font-black text-white flex justify-between">
                    <span>{node.player1?.handle || "WINNER MATCH 1"}</span>
                  </div>
                  <div className="p-1.5 bg-neutral-900 rounded text-xs font-black text-white flex justify-between">
                    <span>{node.player2?.handle || "WINNER MATCH 2"}</span>
                  </div>

                  {isHost && (node.player1 || node.player2) && (
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {node.player1 && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(node.id, node.player1?.uid || "")}
                          className="py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[9px] uppercase rounded cursor-pointer"
                        >
                          ADV P1
                        </button>
                      )}
                      {node.player2 && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(node.id, node.player2?.uid || "")}
                          className="py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[9px] uppercase rounded cursor-pointer"
                        >
                          ADV P2
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Column 3: Grand Final & Champion */}
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
                    {activeTournament?.winnerHandle ? (
                      <span className="text-emerald-400">👑 {activeTournament.winnerHandle} CROWNED CHAMPION!</span>
                    ) : (
                      <span>FINAL MATCH IN PROGRESS</span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400 uppercase font-bold">
                  Winner takes +{activeTournament?.totalPot || 1600} Aura Points & Campus Champion Badge!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Tournament Creator Modal Sub-Component */}
        {createModalOpen && (
          <ArcadeTournamentCreateModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            user={{ uid: currentUid, handle: `@USER_${currentUid.slice(0, 5)}` }}
            onTournamentCreated={(tourId) => {
              setSelectedTournamentId(tourId);
            }}
          />
        )}
      </div>
    </div>
  );
}
