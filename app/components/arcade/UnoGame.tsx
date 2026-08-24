"use client";

import React, { useState, useEffect, useMemo } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  playUnoCard,
  drawUnoCard,
  jumpInUnoCard,
  swapUnoHands,
  acceptUnoDrawPenalty,
  shoutUno,
  catchUnoPenalty,
  type ArcadeMatch,
  type UnoCard,
} from "@/lib/arcade";
import { executeUnoBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Share2,
  Sparkles,
  Layers,
  HelpCircle,
  Download,
  AlertTriangle,
  RotateCw,
  RotateCcw,
  ArrowUpDown,
  Flame,
  ShieldAlert,
  Zap,
  RefreshCw,
  MessageSquare,
  Users,
} from "lucide-react";

interface UnoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string; label: string }> = {
  RED: {
    bg: "bg-gradient-to-br from-red-600 via-rose-600 to-red-700",
    text: "text-white",
    border: "border-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.6)]",
    label: "RED",
  },
  BLUE: {
    bg: "bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700",
    text: "text-white",
    border: "border-blue-400",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.6)]",
    label: "BLUE",
  },
  GREEN: {
    bg: "bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700",
    text: "text-white",
    border: "border-emerald-400",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.6)]",
    label: "GREEN",
  },
  YELLOW: {
    bg: "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500",
    text: "text-neutral-950",
    border: "border-amber-300",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.6)]",
    label: "YELLOW",
  },
  WILD: {
    bg: "bg-gradient-to-br from-red-500 via-amber-400 via-emerald-500 to-blue-600",
    text: "text-white",
    border: "border-purple-300",
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.7)]",
    label: "WILD",
  },
};

const QUICK_BANTER = [
  "Take this! 💥",
  "Reverse! 🔄",
  "UNO incoming! 🚨",
  "Who gave me +4?! 😭",
  "GG! 🏆",
  "Swap hands! 🤝",
];

export default function UnoGame({ match, currentUid }: UnoGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [wildCardToPlay, setWildCardToPlay] = useState<UnoCard | null>(null);
  const [hasCalledUno, setHasCalledUno] = useState(false);
  const [sortBy, setSortBy] = useState<"COLOR" | "VALUE">("COLOR");
  const [activeBanter, setActiveBanter] = useState<string | null>(null);

  const us = match.unoState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!us || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === us.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeUnoBotTurn(match);
    }
  }, [
    match,
    us?.currentTurnUid,
    us?.discardTop?.color,
    us?.discardTop?.value,
    us?.pendingDrawStack,
    us?.pendingSwapUid,
  ]);

  if (!us) return <div className="text-white font-mono p-4">Loading Uno Matrix...</div>;

  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const rawHand = hands[currentUid] || [];
  const isMyTurn = us.currentTurnUid === currentUid && match.status === "PLAYING";
  const isPendingSwap = us.pendingSwapUid === currentUid;
  const direction = us.direction || 1;
  const pendingStack = us.pendingDrawStack || 0;

  // Sort user's hand for premier UX
  const myHand = useMemo(() => {
    const sorted = [...rawHand];
    if (sortBy === "COLOR") {
      const colorOrder: Record<string, number> = { RED: 1, BLUE: 2, GREEN: 3, YELLOW: 4, WILD: 5 };
      sorted.sort(
        (a, b) =>
          (colorOrder[a.color] || 0) - (colorOrder[b.color] || 0) || a.value.localeCompare(b.value)
      );
    } else {
      sorted.sort((a, b) => a.value.localeCompare(b.value) || a.color.localeCompare(b.color));
    }
    return sorted;
  }, [rawHand, sortBy]);

  // Check if any opponent is vulnerable to being caught without shouting UNO
  const catchableOpponent = useMemo(() => {
    return Object.entries(hands).find(([uid, h]) => {
      if (uid === currentUid) return false;
      const called = us.hasCalledUno?.[uid];
      return h.length === 1 && !called;
    });
  }, [hands, us.hasCalledUno, currentUid]);

  // Check for Jump-In card (exact match when it's NOT our turn)
  const jumpInCard = useMemo(() => {
    if (isMyTurn || match.status !== "PLAYING") return null;
    const top = us.discardTop;
    return rawHand.find((c) => c.color === top.color && c.value === top.value) || null;
  }, [rawHand, isMyTurn, us.discardTop, match.status]);

  const handleCardClick = async (card: UnoCard) => {
    if (!isMyTurn || match.status === "FINISHED") return;

    // If stacking is active, you can only play matching penalty card
    if (pendingStack > 0) {
      if (card.value !== us.pendingDrawType) {
        soundSynth.playBuzzer();
        return;
      }
    }

    // If Wild, open color selector dial
    if (card.color === "WILD") {
      setWildCardToPlay(card);
      soundSynth.playSubtlePop();
      return;
    }

    // Validate legal play against discard top
    const top = us.discardTop;
    const isLegal = card.color === top.color || card.value === top.value;
    if (!isLegal) {
      soundSynth.playBuzzer();
      return;
    }

    soundSynth.playSnare();
    try {
      const willHaveOneCard = rawHand.length === 2;
      const result = await playUnoCard(
        match.id,
        currentUid,
        card,
        undefined,
        willHaveOneCard || hasCalledUno
      );
      if (result.won) soundSynth.playFanfare();
      setHasCalledUno(false);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleSelectWildColor = async (chosenColor: "RED" | "BLUE" | "GREEN" | "YELLOW") => {
    if (!wildCardToPlay) return;
    const card = wildCardToPlay;
    setWildCardToPlay(null);
    soundSynth.playSnare();

    try {
      const willHaveOneCard = rawHand.length === 2;
      const result = await playUnoCard(
        match.id,
        currentUid,
        card,
        chosenColor,
        willHaveOneCard || hasCalledUno
      );
      if (result.won) soundSynth.playFanfare();
      setHasCalledUno(false);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleJumpIn = async () => {
    if (!jumpInCard) return;
    soundSynth.playFanfare();
    try {
      const result = await jumpInUnoCard(match.id, currentUid, jumpInCard);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleSwapChoice = async (targetUid: string) => {
    soundSynth.playSnare();
    try {
      await swapUnoHands(match.id, currentUid, targetUid);
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleDrawOrTakeHit = async () => {
    if (!isMyTurn || match.status === "FINISHED") return;
    soundSynth.playSubtlePop();

    try {
      if (pendingStack > 0) {
        await acceptUnoDrawPenalty(match.id, currentUid);
      } else {
        await drawUnoCard(match.id, currentUid);
      }
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const handleShoutUno = async () => {
    setHasCalledUno(true);
    soundSynth.playAirhorn();
    try {
      await shoutUno(match.id, currentUid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCatchUno = async () => {
    if (!catchableOpponent) return;
    soundSynth.playBuzzer();
    try {
      await catchUnoPenalty(match.id, currentUid, catchableOpponent[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendBanter = (msg: string) => {
    setActiveBanter(msg);
    soundSynth.playSubtlePop();
    setTimeout(() => setActiveBanter(null), 3000);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
          <span className="font-black uppercase tracking-widest text-white">
            // FLOW OVERRIDE [ UNO GRANDMASTER ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-black uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>[ ❓ RULES ]</span>
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE 🎙️ ]</span>
          </button>
          <span
            className={`px-2.5 py-1 border-2 font-black uppercase text-[10px] ${
              isMyTurn
                ? "border-white bg-white text-black animate-pulse"
                : "border-neutral-700 bg-black text-neutral-400"
            }`}
          >
            {isMyTurn ? "● YOUR TURN" : "WAITING FOR OPPONENT"}
          </span>
        </div>
      </div>

      {/* Opponents Radar & Rotation Direction HUD */}
      <div className="flex items-center justify-between bg-neutral-950 p-2.5 border border-neutral-800 rounded-lg flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(match.players || {}).map(([uid, p]) => {
            if (uid === currentUid) return null;
            const oppHand = hands[uid] || [];
            const oppCount = oppHand.length;
            const isOppTurn = us.currentTurnUid === uid;
            const hasCalled = us.hasCalledUno?.[uid];

            return (
              <div
                key={uid}
                className={`flex items-center gap-1.5 px-2.5 py-1 border rounded transition-all ${
                  isOppTurn
                    ? "border-white bg-white/10 text-white font-black"
                    : "border-neutral-800 bg-black text-neutral-400 font-bold"
                }`}
              >
                <span className="text-[10px]">{p.handle}:</span>
                <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-white font-mono text-[10px] rounded">
                  🎴 {oppCount}
                </span>
                {oppCount === 1 && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[8px] uppercase rounded animate-pulse">
                    {hasCalled ? "UNO!" : "1 CARD"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Direction Indicator */}
        <div className="flex items-center gap-1 px-2.5 py-1 bg-black border border-neutral-800 rounded text-[10px] font-black text-neutral-300">
          {direction === 1 ? (
            <>
              <RotateCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>CLOCKWISE</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>COUNTER-CLOCKWISE</span>
            </>
          )}
        </div>
      </div>

      {/* Active Stacked Draw Penalty Alert (+2 / +4 Stacking) */}
      {pendingStack > 0 && (
        <div className="bg-amber-950/90 border-2 border-amber-400 p-3 rounded-lg flex items-center justify-between gap-3 animate-pulse shadow-[0_0_25px_rgba(245,158,11,0.4)]">
          <div className="flex items-center gap-2 text-xs font-black text-amber-300">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>
              STACKED DRAW PENALTY: +{pendingStack} CARDS ({us.pendingDrawType})!
            </span>
          </div>
          {isMyTurn && (
            <button
              type="button"
              onClick={handleDrawOrTakeHit}
              className="px-3 py-1.5 bg-amber-500 text-black font-black text-xs uppercase border border-white hover:bg-amber-400 transition-all rounded cursor-pointer active:scale-95"
            >
              [ 🛡️ TAKE +{pendingStack} CARDS ]
            </button>
          )}
        </div>
      )}

      {/* Jump-In Notification Action */}
      {jumpInCard && !isMyTurn && (
        <div className="bg-purple-950/90 border-2 border-purple-400 p-3 rounded-lg flex items-center justify-between gap-3 animate-bounce shadow-[0_0_25px_rgba(168,85,247,0.5)]">
          <div className="flex items-center gap-2 text-xs font-black text-purple-300">
            <Zap className="w-5 h-5 text-purple-400" />
            <span>EXACT MATCH IN HAND! JUMP-IN READY!</span>
          </div>
          <button
            type="button"
            onClick={handleJumpIn}
            className="px-3 py-1.5 bg-purple-600 text-white font-black text-xs uppercase border border-white hover:bg-purple-500 transition-all rounded cursor-pointer active:scale-95 shadow-lg"
          >
            [ ⚡ JUMP IN NOW! ]
          </button>
        </div>
      )}

      {/* Center Table Arena: Draw Deck & Active Discard Card */}
      <div className="border-2 border-white bg-neutral-950 p-6 flex items-center justify-center gap-8 rounded-xl shadow-2xl relative overflow-hidden">
        {/* Draw Deck */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
            DRAW DECK
          </span>
          <button
            type="button"
            disabled={!isMyTurn || match.status === "FINISHED"}
            onClick={handleDrawOrTakeHit}
            className={`w-20 h-28 border-2 rounded-xl flex flex-col items-center justify-between p-2 font-black transition-all cursor-pointer ${
              isMyTurn
                ? "border-white bg-neutral-900 text-white hover:bg-neutral-800 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
                : "border-neutral-800 bg-black text-neutral-600 opacity-40 cursor-not-allowed"
            }`}
          >
            <div className="text-[9px] uppercase font-bold self-start">ECHO</div>
            <Download className="w-6 h-6 text-white my-auto animate-bounce" />
            <div className="text-[9px] uppercase font-black self-end">
              {pendingStack > 0 ? `TAKE +${pendingStack}` : "DRAW +1"}
            </div>
          </button>
        </div>

        {/* Active Discard Top Card */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
            TABLE TOP [{us.discardTop.color}]
          </span>
          <div
            className={`w-22 h-32 border-4 rounded-xl flex flex-col items-center justify-between p-2 font-black shadow-2xl relative transition-transform animate-pulse ${
              COLOR_MAP[us.discardTop.color]?.bg || "bg-black"
            } ${COLOR_MAP[us.discardTop.color]?.border || "border-white"} ${
              COLOR_MAP[us.discardTop.color]?.glow || ""
            }`}
          >
            {/* Top-left Value */}
            <span
              className={`text-xs font-black self-start leading-none ${
                COLOR_MAP[us.discardTop.color]?.text
              }`}
            >
              {us.discardTop.value}
            </span>

            {/* Center Oval Emblem */}
            <div className="w-14 h-16 bg-white/90 rounded-[50%] -rotate-12 border-2 border-neutral-900 flex items-center justify-center shadow-md">
              <span className="text-2xl font-black italic text-black leading-none drop-shadow">
                {us.discardTop.value}
              </span>
            </div>

            {/* Bottom-right Value */}
            <span
              className={`text-xs font-black self-end leading-none ${
                COLOR_MAP[us.discardTop.color]?.text
              }`}
            >
              {us.discardTop.value}
            </span>
          </div>
        </div>
      </div>

      {/* 7 Rule Hand Swap Modal */}
      {isPendingSwap && (
        <div className="bg-neutral-900 border-2 border-white p-4 rounded-xl space-y-3 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>7 RULE ACTIVATED: CHOOSE OPPONENT TO SWAP YOUR ENTIRE HAND!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(match.players || {})
              .filter(([uid]) => uid !== currentUid)
              .map(([uid, p]) => (
                <button
                  key={uid}
                  type="button"
                  onClick={() => handleSwapChoice(uid)}
                  className="py-3 px-2 bg-neutral-950 hover:bg-neutral-800 border-2 border-white text-white font-black text-xs uppercase rounded-lg flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-105"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{p.handle}</span>
                  <span className="text-[10px] text-neutral-400">
                    ({hands[uid]?.length || 0} CARDS)
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Wild Color Picker Dial */}
      {wildCardToPlay && (
        <div className="bg-neutral-900 border-2 border-white p-4 rounded-xl space-y-3 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>CHOOSE ACTIVE COLOR FOR THE TABLE:</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["RED", "BLUE", "GREEN", "YELLOW"] as const).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => handleSelectWildColor(col)}
                className={`py-3.5 font-black text-xs uppercase rounded-lg border-2 shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                  COLOR_MAP[col]?.bg
                } ${COLOR_MAP[col]?.border} ${COLOR_MAP[col]?.text}`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Catch UNO Callout Alert */}
      {catchableOpponent && (
        <div className="bg-red-950/80 border-2 border-red-500 p-3 rounded-lg flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-black text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>
              {match.players?.[catchableOpponent[0]]?.handle || "@PLAYER"} HAS 1 CARD WITHOUT SHOUTING UNO!
            </span>
          </div>
          <button
            type="button"
            onClick={handleCatchUno}
            className="px-3 py-1.5 bg-red-600 text-white font-black text-xs uppercase border border-white hover:bg-red-500 transition-all rounded cursor-pointer shadow-lg active:scale-95"
          >
            [ 🎯 CATCH UNO (+2 PENALTY) ]
          </button>
        </div>
      )}

      {/* Player Hand Tray */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white uppercase font-black">
              YOUR HAND ({myHand.length} CARDS):
            </span>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === "COLOR" ? "VALUE" : "COLOR")}
              className="px-2 py-0.5 border border-neutral-700 bg-neutral-900 hover:border-white text-[10px] text-neutral-300 uppercase font-bold rounded flex items-center gap-1 cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>SORT: {sortBy}</span>
            </button>
          </div>

          {/* Shout UNO Button */}
          {myHand.length <= 2 && (
            <button
              type="button"
              onClick={handleShoutUno}
              className={`px-3.5 py-1 font-black text-xs uppercase border-2 rounded-full transition-all cursor-pointer ${
                hasCalledUno
                  ? "border-emerald-400 bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  : "border-red-400 bg-red-600 text-white animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.7)]"
              }`}
            >
              {hasCalledUno ? "✓ UNO SHOUTED!" : "🚨 [ SHOUT UNO! ]"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center bg-neutral-950 p-4 border-2 border-white rounded-xl min-h-[130px] items-center">
          {myHand.map((card, i) => {
            const top = us.discardTop;
            const isPlayable =
              isMyTurn &&
              (pendingStack > 0
                ? card.value === us.pendingDrawType
                : card.color === "WILD" || card.color === top.color || card.value === top.value);
            const style = COLOR_MAP[card.color] || COLOR_MAP.WILD;

            return (
              <button
                key={`${card.color}-${card.value}-${i}`}
                type="button"
                disabled={!isPlayable || match.status === "FINISHED"}
                onClick={() => handleCardClick(card)}
                className={`w-13 h-22 sm:w-14 sm:h-24 border-2 rounded-lg flex flex-col items-center justify-between p-1.5 transition-all cursor-pointer ${
                  style.bg
                } ${style.border} ${
                  isPlayable
                    ? "-translate-y-2 ring-2 ring-white shadow-2xl scale-105 hover:-translate-y-3"
                    : "opacity-40 grayscale cursor-not-allowed"
                }`}
              >
                {/* Corner Value */}
                <span className={`font-black text-[9px] self-start leading-none ${style.text}`}>
                  {card.value}
                </span>

                {/* Center Badge */}
                <div className="w-8 h-11 bg-white/90 rounded-[50%] -rotate-12 border border-neutral-900 flex items-center justify-center shadow-inner">
                  <span className="text-xs sm:text-sm font-black italic text-black leading-none">
                    {card.value}
                  </span>
                </div>

                {/* Corner Value */}
                <span className={`font-black text-[9px] self-end leading-none ${style.text}`}>
                  {card.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Banter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        {QUICK_BANTER.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => handleSendBanter(phrase)}
            className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold rounded-full whitespace-nowrap cursor-pointer transition-all active:scale-95"
          >
            {phrase}
          </button>
        ))}
      </div>

      {activeBanter && (
        <div className="bg-neutral-800 border border-white px-3 py-1.5 text-xs text-center font-black uppercase text-amber-300 animate-in fade-in rounded">
          💬 YOU: {activeBanter}
        </div>
      )}

      {/* Action Telemetry */}
      {us.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{us.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} EMPTIED THEIR HAND & WON UNO!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 100} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-white text-white hover:bg-white hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
        >
          <HelpCircle className="w-4 h-4" />
          <span>[ ❓ UNO RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="uno"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
