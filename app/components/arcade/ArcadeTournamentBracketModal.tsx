"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  subscribeActiveTournaments,
  subscribeArcadeTournament,
  joinTournamentSlot,
  leaveTournamentSlot,
  startTournamentNow,
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
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  Award,
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
  gameType = "monopoly",
  hostUid,
  currentUid,
  initialTournamentId,
}: ArcadeTournamentBracketModalProps) {
  const [tournaments, setTournaments] = useState<ArcadeTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(initialTournamentId || null);
  const [activeTournament, setActiveTournament] = useState<ArcadeTournament | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"LIVE" | "SCHEDULED" | "FINISHED">("LIVE");

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
    ? `🏆 Register for my ${activeTournament.title} (${activeTournament.size}-Player Bracket Tournament) on Echo Club! Entry Pot: +${activeTournament.totalPot} Aura. Join the queue: ${tournamentUrl}`
    : `🏆 Join Championship Tournaments on Echo Club! Join here: ${tournamentUrl}`;

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

  const handleLeaveSlot = async () => {
    if (!activeTournament || !currentUid) return;
    soundSynth.playSubtlePop();
    try {
      await leaveTournamentSlot(activeTournament.id, currentUid);
    } catch (err: any) {
      alert(err.message || "Failed to leave tournament");
    }
  };

  const handleStartNow = async () => {
    if (!activeTournament || !currentUid) return;
    soundSynth.playFanfare();
    try {
      await startTournamentNow(activeTournament.id, currentUid);
    } catch (err: any) {
      alert(err.message || "Failed to start tournament");
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
  const registeredCount = Object.keys(activeTournament?.registeredPlayers || {}).length;
  const isRegistered = !!activeTournament?.registeredPlayers?.[currentUid];

  const liveTournaments = tournaments.filter((t) => t.status === "IN_PROGRESS");
  const scheduledTournaments = tournaments.filter((t) => t.status === "REGISTRATION");
  const completedTournaments = tournaments.filter((t) => t.status === "FINISHED");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-neutral-950 border-2 border-neutral-700 p-4 sm:p-6 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] select-none max-h-[94vh] overflow-y-auto rounded-3xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 border border-neutral-800 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer rounded-xl"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tournament Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-xl">
              🏆
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
                <span>ECHO CLUB // CHAMPIONSHIP ARENA</span>
              </h2>
              <p className="text-[10px] text-neutral-400 font-bold uppercase">
                SCHEDULED CUPS • LIVE BRACKET SEEDING • AURA REWARD POOLS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Tournament Button */}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>[ + HOST TOURNAMENT ]</span>
            </button>
          </div>
        </div>

        {/* ── Active Tournament Stage & Browser ── */}
        {activeTournament && (
          <div className="space-y-4 mb-6">
            {/* Active Tournament Hero Banner */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-black border border-neutral-800 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                    {activeTournament.title}
                  </h3>
                  <span className="text-[10px] text-amber-400 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold bg-amber-950/40">
                    {activeTournament.gameType.toUpperCase()}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTournament.status === "IN_PROGRESS"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                      : activeTournament.status === "FINISHED"
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  }`}>
                    {activeTournament.status === "IN_PROGRESS" ? "🔥 LIVE BRACKET" : activeTournament.status === "FINISHED" ? "🏆 FINISHED" : "⏳ QUEUE OPEN"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 flex items-center gap-2 flex-wrap">
                  <span>HOST: {activeTournament.hostHandle}</span>
                  <span>•</span>
                  <span>FORMAT: {activeTournament.format === "DOUBLE_ELIMINATION" ? "DOUBLE ELIMINATION" : "SINGLE KNOCKOUT"}</span>
                  <span>•</span>
                  <span className="text-yellow-400 font-bold">PRIZE POT: +{activeTournament.totalPot} AURA</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappTournamentInvite)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => soundSynth.playAirhorn()}
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>SHARE WHATSAPP</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:border-white text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "COPIED!" : "COPY LINK"}</span>
                </button>

                {activeTournament.status === "REGISTRATION" && (
                  <>
                    {!isRegistered ? (
                      <button
                        type="button"
                        onClick={() => handleJoinSlot()}
                        className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        [ 🎮 JOIN WAITING QUEUE ]
                      </button>
                    ) : (
                      !isHost && (
                        <button
                          type="button"
                          onClick={() => handleLeaveSlot()}
                          className="px-3 py-1.5 border border-red-800 bg-red-950/60 hover:bg-red-800 text-red-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                        >
                          LEAVE QUEUE
                        </button>
                      )
                    )}

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleStartNow()}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        [ ⚡ LAUNCH BRACKET NOW ]
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Waiting Queue View (If Registration Stage) ── */}
            {activeTournament.status === "REGISTRATION" && (
              <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-neutral-300">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>WAITING QUEUE ROSTER ({registeredCount} / {activeTournament.size} SEEDS)</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {registeredCount >= activeTournament.size
                      ? "QUEUE FULL • READY TO LAUNCH"
                      : `${activeTournament.size - registeredCount} SLOTS REMAINING`}
                  </span>
                </div>

                {/* Queue Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeTournament.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        slot
                          ? "bg-neutral-950 border-neutral-700 text-white"
                          : "bg-neutral-950/40 border-neutral-800 border-dashed text-neutral-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                        <span className="font-bold truncate">
                          {slot ? slot.handle : "OPEN QUEUE SLOT"}
                        </span>
                      </div>
                      {slot?.uid === currentUid && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-400 text-black font-black rounded">
                          YOU
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Visual Bracket Tree (If In Progress or Finished) ── */}
            {(activeTournament.status === "IN_PROGRESS" || activeTournament.status === "FINISHED") && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Column 1: Quarterfinals / Round of 16 */}
                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase text-neutral-400 text-center border-b border-neutral-800 pb-1">
                      {activeTournament.size === 16 ? "ROUND OF 16" : "QUARTERFINALS"}
                    </div>
                    {(nodes.filter((n) => n.round === (activeTournament.size === 16 ? 1 : 2)).length > 0
                      ? nodes.filter((n) => n.round === (activeTournament.size === 16 ? 1 : 2))
                      : []
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
                        {isHost && activeTournament.status === "IN_PROGRESS" && (
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
                    {nodes.filter((n) => n.round === 3).map((node, idx) => (
                      <div
                        key={node.id}
                        className="p-3 border-2 border-neutral-800 bg-neutral-950 rounded-xl space-y-2"
                      >
                        <div className="text-[10px] font-bold text-neutral-400">SEMI-FINAL {idx + 1}</div>
                        <div className="p-1.5 bg-neutral-900 rounded text-xs font-black text-white flex justify-between">
                          <span>{node.player1?.handle || "WINNER MATCH 1"}</span>
                          {node.winnerUid === node.player1?.uid && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="p-1.5 bg-neutral-900 rounded text-xs font-black text-white flex justify-between">
                          <span>{node.player2?.handle || "WINNER MATCH 2"}</span>
                          {node.winnerUid === node.player2?.uid && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>

                        {isHost && activeTournament.status === "IN_PROGRESS" && (node.player1 || node.player2) && (
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
                      👑 GRAND FINAL &amp; CHAMPION
                    </div>
                    <div className="p-4 border-4 border-amber-400 bg-neutral-950 rounded-2xl text-center space-y-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                      <Trophy className="w-10 h-10 text-yellow-400 mx-auto animate-bounce" />
                      <div className="space-y-1">
                        <div className="text-xs font-black text-yellow-400 uppercase">
                          CHAMPIONSHIP DUEL
                        </div>
                        <div className="p-2 bg-black border border-neutral-800 rounded-xl font-black text-sm text-white">
                          {activeTournament.winnerHandle ? (
                            <span className="text-emerald-400">👑 {activeTournament.winnerHandle} CROWNED CHAMPION!</span>
                          ) : (
                            <span>FINAL MATCH IN PROGRESS</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-neutral-400 uppercase font-bold">
                        Winner takes +{activeTournament.totalPot} Aura Points &amp; Championship Trophy!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spectator Soundboard */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-2xl mb-6 space-y-2">
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
                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 text-white font-black text-[11px] uppercase rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{meme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── World-Class Tournament Browser List (Below Stage) ── */}
        <div className="space-y-3 border-t border-neutral-800 pt-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>ALL TOURNAMENTS &amp; SCHEDULED QUEUES ({tournaments.length})</span>
            </h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("LIVE")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === "LIVE" ? "bg-white text-black font-black shadow" : "text-neutral-400 hover:text-white"
                }`}
              >
                🔥 LIVE ({liveTournaments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("SCHEDULED")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === "SCHEDULED" ? "bg-white text-black font-black shadow" : "text-neutral-400 hover:text-white"
                }`}
              >
                ⏳ QUEUE ({scheduledTournaments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("FINISHED")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === "FINISHED" ? "bg-white text-black font-black shadow" : "text-neutral-400 hover:text-white"
                }`}
              >
                🏆 FINISHED ({completedTournaments.length})
              </button>
            </div>
          </div>

          {/* Tournament Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(activeTab === "LIVE" ? liveTournaments : activeTab === "SCHEDULED" ? scheduledTournaments : completedTournaments).map((tour) => {
              const regCount = Object.keys(tour.registeredPlayers || {}).length;
              const isSelected = selectedTournamentId === tour.id;

              return (
                <div
                  key={tour.id}
                  onClick={() => setSelectedTournamentId(tour.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-neutral-900 border-amber-400 ring-1 ring-amber-400/50 shadow-lg"
                      : "bg-neutral-950/80 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-xs uppercase text-white tracking-wide truncate">
                        {tour.title}
                      </h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        tour.status === "IN_PROGRESS"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : tour.status === "FINISHED"
                          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      }`}>
                        {tour.status === "IN_PROGRESS" ? "LIVE" : tour.status === "FINISHED" ? "FINISHED" : `${regCount}/${tour.size}P`}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 font-mono">
                      Game: <span className="text-white font-bold">{tour.gameType.toUpperCase()}</span> • Pot: <span className="text-yellow-400 font-bold">+{tour.totalPot} Aura</span>
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Host: {tour.hostHandle}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-900 mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold">
                      {tour.format === "DOUBLE_ELIMINATION" ? "DOUBLE ELIM" : "SINGLE KNOCKOUT"}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1 bg-white hover:bg-neutral-200 text-black font-black text-[10px] uppercase rounded-lg transition-all"
                    >
                      {tour.status === "REGISTRATION" ? "JOIN QUEUE" : "VIEW ARENA"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {(activeTab === "LIVE" ? liveTournaments : activeTab === "SCHEDULED" ? scheduledTournaments : completedTournaments).length === 0 && (
            <div className="border border-neutral-800 bg-neutral-950 p-6 text-center rounded-2xl space-y-1">
              <p className="text-xs font-bold text-neutral-400 uppercase">NO TOURNAMENTS IN THIS TAB</p>
              <p className="text-[11px] text-neutral-500">Click &quot;+ HOST TOURNAMENT&quot; to create a new championship queue!</p>
            </div>
          )}
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
