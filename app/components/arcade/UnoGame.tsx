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
  Ban,
  Repeat,
  Plus,
} from "lucide-react";

interface UnoGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
  onRematch?: () => void;
}

const UNO_THEMES: Record<
  string,
  {
    bgGradient: string;
    textColor: string;
    ovalBg: string;
    glowShadow: string;
    borderColor: string;
    accentColor: string;
  }
> = {
  RED: {
    bgGradient: "bg-gradient-to-br from-[#ff2a2a] via-[#e50914] to-[#b30000]",
    textColor: "text-[#e50914]",
    ovalBg: "bg-white",
    glowShadow: "shadow-[0_0_30px_rgba(229,9,20,0.6)] ring-2 ring-red-400/80",
    borderColor: "border-white",
    accentColor: "#e50914",
  },
  BLUE: {
    bgGradient: "bg-gradient-to-br from-[#2980ff] via-[#0062ff] to-[#003db3]",
    textColor: "text-[#0062ff]",
    ovalBg: "bg-white",
    glowShadow: "shadow-[0_0_30px_rgba(0,98,255,0.6)] ring-2 ring-blue-400/80",
    borderColor: "border-white",
    accentColor: "#0062ff",
  },
  GREEN: {
    bgGradient: "bg-gradient-to-br from-[#2ed573] via-[#00b843] to-[#00802b]",
    textColor: "text-[#00b843]",
    ovalBg: "bg-white",
    glowShadow: "shadow-[0_0_30px_rgba(0,184,67,0.6)] ring-2 ring-green-400/80",
    borderColor: "border-white",
    accentColor: "#00b843",
  },
  YELLOW: {
    bgGradient: "bg-gradient-to-br from-[#ffd32a] via-[#ffb100] to-[#d48800]",
    textColor: "text-[#d48800]",
    ovalBg: "bg-white",
    glowShadow: "shadow-[0_0_30px_rgba(255,177,0,0.6)] ring-2 ring-yellow-400/80",
    borderColor: "border-white",
    accentColor: "#ffb100",
  },
  WILD: {
    bgGradient: "bg-gradient-to-br from-[#2f3542] via-[#1e272e] to-[#0a0d10]",
    textColor: "text-white",
    ovalBg: "bg-neutral-900",
    glowShadow: "shadow-[0_0_35px_rgba(255,255,255,0.4)] ring-2 ring-white/80",
    borderColor: "border-white",
    accentColor: "#ffffff",
  },
};

const QUICK_BANTER = [
  "Take this! 💥",
  "Reverse! 🔄",
  "UNO incoming! 🚨",
  "Who gave me +4?! 😭",
  "GG! 🏆",
  "Swap hands! 🤝",
  "Don't you dare! 😈",
  "Checkmate! ⚡",
];

/**
 * Authentic 3D Glossy Uno Card Component
 */
function VibrantUnoCardComponent({
  card,
  isPlayable = false,
  isLarge = false,
  onClick,
}: {
  card: UnoCard;
  isPlayable?: boolean;
  isLarge?: boolean;
  onClick?: () => void;
}) {
  const theme = UNO_THEMES[card.color] || UNO_THEMES.WILD;
  const isWild = card.color === "WILD";
  const isPlus4 = card.value === "+4";
  const isPlus2 = card.value === "+2";
  const isSkip = card.value === "SKIP";
  const isReverse = card.value === "REVERSE";

  const widthClass = isLarge ? "w-28 h-40 sm:w-32 sm:h-44" : "w-16 h-24 sm:w-18 sm:h-28";
  const ovalClass = isLarge ? "w-20 h-24 -rotate-15" : "w-11 h-15 -rotate-15";

  return (
    <button
      type="button"
      disabled={!isPlayable && !onClick}
      onClick={onClick}
      className={`relative ${widthClass} rounded-2xl p-1.5 flex flex-col justify-between items-center transition-all duration-200 border-2 sm:border-3 border-white select-none ${
        theme.bgGradient
      } ${
        isPlayable
          ? "cursor-pointer hover:-translate-y-3.5 hover:scale-110 active:scale-95 shadow-[0_12px_28px_rgba(0,0,0,0.6)] ring-3 ring-white animate-bounce-subtle z-10"
          : onClick
          ? "cursor-pointer hover:scale-105"
          : "opacity-45 grayscale-[30%] cursor-not-allowed shadow-md"
      }`}
      style={{
        boxShadow: isPlayable
          ? `0 15px 30px rgba(0,0,0,0.6), 0 0 20px ${theme.accentColor}88`
          : undefined,
      }}
    >
      {/* Top Left Corner Index */}
      <div className="self-start text-[10px] sm:text-xs font-black text-white leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] flex items-center gap-0.5">
        {isSkip ? (
          <Ban className="w-3 h-3" />
        ) : isReverse ? (
          <Repeat className="w-3 h-3" />
        ) : isPlus2 ? (
          <span>+2</span>
        ) : isPlus4 ? (
          <span>+4</span>
        ) : isWild ? (
          <span>★</span>
        ) : (
          <span>{card.value}</span>
        )}
      </div>

      {/* Center Iconic Oval Emblem */}
      <div
        className={`${ovalClass} bg-white rounded-[50%] flex items-center justify-center shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),0_4px_8px_rgba(0,0,0,0.3)] relative overflow-hidden`}
      >
        {isWild || isPlus4 ? (
          /* 4-Color Vibrant Quadrant Wheel */
          <div className="w-full h-full relative flex items-center justify-center">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div className="bg-[#ff2a2a]" />
              <div className="bg-[#0062ff]" />
              <div className="bg-[#ffb100]" />
              <div className="bg-[#00b843]" />
            </div>
            <div className="relative z-10 bg-black/80 px-2 py-0.5 rounded-full border border-white/60 shadow">
              <span className="font-black text-white italic tracking-wider text-[10px] sm:text-xs drop-shadow">
                {isPlus4 ? "+4" : "WILD"}
              </span>
            </div>
          </div>
        ) : isSkip ? (
          <Ban
            className={`${
              isLarge ? "w-10 h-10" : "w-6 h-6"
            } ${theme.textColor} stroke-[3] drop-shadow`}
          />
        ) : isReverse ? (
          <Repeat
            className={`${
              isLarge ? "w-10 h-10" : "w-6 h-6"
            } ${theme.textColor} stroke-[3] drop-shadow`}
          />
        ) : isPlus2 ? (
          <div className="flex flex-col items-center">
            <span
              className={`${
                isLarge ? "text-3xl" : "text-lg sm:text-xl"
              } font-black italic tracking-tighter ${theme.textColor} drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]`}
            >
              +2
            </span>
          </div>
        ) : (
          <span
            className={`${
              isLarge ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"
            } font-black italic tracking-tighter ${theme.textColor} drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]`}
          >
            {card.value}
          </span>
        )}
      </div>

      {/* Bottom Right Corner Index (Inverted) */}
      <div className="self-end text-[10px] sm:text-xs font-black text-white leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] rotate-180 flex items-center gap-0.5">
        {isSkip ? (
          <Ban className="w-3 h-3" />
        ) : isReverse ? (
          <Repeat className="w-3 h-3" />
        ) : isPlus2 ? (
          <span>+2</span>
        ) : isPlus4 ? (
          <span>+4</span>
        ) : isWild ? (
          <span>★</span>
        ) : (
          <span>{card.value}</span>
        )}
      </div>

      {/* Subtle Card Gloss Sheen */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-2xl pointer-events-none" />
    </button>
  );
}

export default function UnoGame({ match, currentUid, onRematch }: UnoGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
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
    us?.handsStr,
    us?.lastActionLog,
    match.status,
  ]);

  if (!us) return <div className="text-white font-mono p-4">Loading Uno Matrix...</div>;

  const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
  const rawHand = hands[currentUid] || [];
  const isMyTurn = us.currentTurnUid === currentUid && match.status === "PLAYING";
  const isPendingSwap = us.pendingSwapUid === currentUid;
  const direction = us.direction || 1;
  const pendingStack = us.pendingDrawStack || 0;
  const activeColorTheme = UNO_THEMES[us.discardTop?.color] || UNO_THEMES.WILD;

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
    <div className="w-full max-w-2xl mx-auto bg-[#0a0a0f] border-2 border-white/80 p-3 sm:p-6 font-mono text-white space-y-4 select-none shadow-[0_0_60px_rgba(0,0,0,0.8)] relative rounded-3xl overflow-hidden">
      {/* Ambient Table Atmosphere Glow matching active card */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: activeColorTheme.accentColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/20 pb-3 text-xs gap-2 flex-wrap sm:flex-nowrap relative z-10">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
          <div>
            <h1 className="font-black uppercase tracking-wider text-white text-sm sm:text-base flex items-center gap-1.5">
              <span>UNO MASTER ARENA</span>
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                OFFICIAL RULES
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-3 py-1.5 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[11px] transition-all flex items-center gap-1.5 cursor-pointer rounded-xl shadow active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>INVITE 🎙️</span>
          </button>
          <span
            className={`px-3 py-1.5 border-2 font-black uppercase text-[11px] rounded-xl shadow ${
              isMyTurn
                ? "border-emerald-400 bg-emerald-400 text-black animate-pulse font-extrabold"
                : "border-neutral-700 bg-neutral-900 text-neutral-300"
            }`}
          >
            {isMyTurn ? "● YOUR TURN" : "WAITING FOR OPPONENT"}
          </span>
        </div>
      </div>

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players?.[currentUid] &&
        Object.keys(match.players || {}).length < (match.maxPlayers || 4) &&
        match.status !== "FINISHED" && (
          <div className="w-full bg-emerald-950/90 border-2 border-emerald-400 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-lg animate-in fade-in relative z-10">
            <div className="flex items-center gap-2.5 text-xs truncate">
              <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <span className="font-black uppercase text-emerald-200 truncate">
                🪑 SEAT OPEN ({Object.keys(match.players || {}).length}/{match.maxPlayers || 4}{" "}
                SEATED) • TAKE A SEAT TO PLAY &amp; TALK
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!currentUid) return;
                try {
                  const { joinArcadeMatch } = await import("@/lib/arcade");
                  await joinArcadeMatch(match.id, {
                    uid: currentUid,
                    handle: `@PLAYER_${currentUid.slice(0, 4)}`,
                  });
                  if (match.roomId) {
                    const { promoteToSpeaker } = await import("@/lib/rooms");
                    await promoteToSpeaker(match.roomId, currentUid);
                  }
                } catch (e) {
                  console.error("Failed to take seat in Uno:", e);
                }
              }}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-xl transition-all active:scale-95 shrink-0 shadow-md"
            >
              [ 🪑 TAKE A SEAT ]
            </button>
          </div>
        )}

      {/* Opponents Radar & Rotation Direction HUD */}
      <div className="flex items-center justify-between bg-black/80 backdrop-blur-md p-3 border border-white/15 rounded-2xl flex-wrap gap-2 relative z-10 shadow-lg">
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
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl transition-all ${
                  isOppTurn
                    ? "border-emerald-400 bg-emerald-950/60 text-white font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300 font-bold"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white text-black font-black text-[10px] flex items-center justify-center shadow">
                  {p.handle.replace(/^@/, "").charAt(0).toUpperCase() || "P"}
                </div>
                <span className="text-xs truncate max-w-[100px]">{p.handle}:</span>
                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-white font-mono text-xs rounded-lg shadow-inner">
                  🎴 {oppCount}
                </span>
                {oppCount === 1 && (
                  <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[9px] uppercase rounded-full animate-bounce shadow">
                    {hasCalled ? "UNO!" : "1 CARD!"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Direction of Play Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border border-white/20 rounded-xl text-xs font-black text-white shadow">
          {direction === 1 ? (
            <>
              <RotateCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>CLOCKWISE</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4 text-amber-400 animate-spin" />
              <span>COUNTER-CLOCKWISE</span>
            </>
          )}
        </div>
      </div>

      {/* Active Stacked Draw Penalty Alert (+2 / +4 Stacking) */}
      {pendingStack > 0 && (
        <div className="bg-amber-950/90 border-2 border-amber-400 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-pulse shadow-[0_0_35px_rgba(245,158,11,0.5)] relative z-10">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-amber-300">
            <Zap className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
            <span>
              STACKED DRAW PENALTY: +{pendingStack} CARDS ({us.pendingDrawType})! COUNTER WITH +
              {us.pendingDrawType} OR DRAW!
            </span>
          </div>
          {isMyTurn && (
            <button
              type="button"
              onClick={handleDrawOrTakeHit}
              className="px-4 py-2 bg-amber-400 text-black font-black text-xs uppercase border-2 border-white hover:bg-amber-300 transition-all rounded-xl cursor-pointer active:scale-95 shadow-lg shrink-0"
            >
              [ 🛡️ TAKE +{pendingStack} CARDS ]
            </button>
          )}
        </div>
      )}

      {/* Jump-In Notification Action */}
      {jumpInCard && !isMyTurn && (
        <div className="bg-purple-950/95 border-2 border-purple-400 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-bounce shadow-[0_0_35px_rgba(168,85,247,0.6)] relative z-10">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-purple-200">
            <Zap className="w-5 h-5 text-purple-400 shrink-0" />
            <span>EXACT MATCH IN HAND! JUMP-IN READY!</span>
          </div>
          <button
            type="button"
            onClick={handleJumpIn}
            className="px-4 py-2 bg-purple-600 text-white font-black text-xs uppercase border-2 border-white hover:bg-purple-500 transition-all rounded-xl cursor-pointer active:scale-95 shadow-xl shrink-0"
          >
            [ ⚡ JUMP IN NOW! ]
          </button>
        </div>
      )}

      {/* ── Casino Felt Table Arena: Draw Deck & Active Discard Pile ── */}
      <div className="border-2 border-white/40 bg-gradient-to-b from-[#111625] via-[#0c101c] to-[#070913] p-6 sm:p-8 flex items-center justify-center gap-8 sm:gap-14 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Draw Deck Stack */}
        <div className="flex flex-col items-center gap-2.5 relative">
          <span className="text-[10px] sm:text-xs text-neutral-400 font-black uppercase tracking-wider">
            DRAW DECK
          </span>
          <button
            type="button"
            disabled={!isMyTurn || match.status === "FINISHED"}
            onClick={handleDrawOrTakeHit}
            className={`w-24 h-36 sm:w-28 sm:h-40 border-3 border-white rounded-2xl flex flex-col items-center justify-between p-2.5 transition-all relative select-none ${
              isMyTurn
                ? "bg-gradient-to-br from-[#1e272e] via-[#0f1418] to-black cursor-pointer shadow-[0_10px_25px_rgba(255,255,255,0.25)] hover:scale-108 active:scale-95 ring-3 ring-white"
                : "bg-black/80 border-neutral-700 opacity-50 cursor-not-allowed"
            }`}
          >
            {/* Uno Deck Logo Art */}
            <div className="w-full flex justify-between items-center text-[9px] font-black text-neutral-400 uppercase">
              <span>ECHO</span>
              <span>UNO</span>
            </div>

            <div className="w-16 h-20 bg-gradient-to-tr from-[#ff2a2a] via-[#ffb100] to-[#0062ff] rounded-[50%] -rotate-20 flex items-center justify-center shadow-lg border-2 border-white">
              <span className="font-black italic text-white text-base tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                UNO
              </span>
            </div>

            <div className="text-[10px] uppercase font-black text-white bg-white/20 px-2 py-0.5 rounded-full border border-white/40">
              {pendingStack > 0 ? `TAKE +${pendingStack}` : "DRAW +1"}
            </div>
          </button>
        </div>

        {/* Active Discard Top Card */}
        <div className="flex flex-col items-center gap-2.5 relative">
          <span className="text-[10px] sm:text-xs text-neutral-300 font-black uppercase tracking-wider flex items-center gap-1.5">
            <span>ACTIVE TABLE TOP</span>
            <span
              className="w-2.5 h-2.5 rounded-full shadow"
              style={{ backgroundColor: activeColorTheme.accentColor }}
            />
          </span>

          <div className="relative">
            <VibrantUnoCardComponent card={us.discardTop} isLarge={true} />
          </div>
        </div>
      </div>

      {/* 7 Rule Hand Swap Modal */}
      {isPendingSwap && (
        <div className="bg-neutral-900 border-2 border-white p-5 rounded-2xl space-y-3 shadow-2xl animate-in fade-in relative z-20">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-amber-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>7 RULE ACTIVATED: CHOOSE OPPONENT TO SWAP YOUR ENTIRE HAND!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.entries(match.players || {})
              .filter(([uid]) => uid !== currentUid)
              .map(([uid, p]) => (
                <button
                  key={uid}
                  type="button"
                  onClick={() => handleSwapChoice(uid)}
                  className="py-3 px-3 bg-black hover:bg-neutral-800 border-2 border-white text-white font-black text-xs uppercase rounded-xl flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:scale-105 shadow-md active:scale-95"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="truncate">{p.handle}</span>
                  <span className="text-[10px] text-neutral-400 font-bold">
                    ({hands[uid]?.length || 0} CARDS)
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Wild Color Picker Dial */}
      {wildCardToPlay && (
        <div className="bg-neutral-900/95 backdrop-blur-md border-2 border-white p-5 rounded-2xl space-y-3.5 shadow-2xl animate-in fade-in relative z-20">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase text-amber-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span>CHOOSE ACTIVE COLOR FOR THE TABLE:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(["RED", "BLUE", "GREEN", "YELLOW"] as const).map((col) => {
              const theme = UNO_THEMES[col];
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleSelectWildColor(col)}
                  className={`py-4 font-black text-sm uppercase rounded-xl border-2 border-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${theme.bgGradient}`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Catch UNO Callout Alert */}
      {catchableOpponent && (
        <div className="bg-red-950/90 border-2 border-red-500 p-3.5 rounded-2xl flex items-center justify-between gap-3 animate-pulse relative z-10 shadow-[0_0_30px_rgba(239,68,68,0.5)]">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-red-200">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>
              {match.players?.[catchableOpponent[0]]?.handle || "@PLAYER"} HAS 1 CARD WITHOUT
              SHOUTING UNO!
            </span>
          </div>
          <button
            type="button"
            onClick={handleCatchUno}
            className="px-4 py-2 bg-red-600 text-white font-black text-xs uppercase border-2 border-white hover:bg-red-500 transition-all rounded-xl cursor-pointer shadow-lg active:scale-95 shrink-0"
          >
            [ 🎯 CATCH UNO (+2 PENALTY) ]
          </button>
        </div>
      )}

      {/* Player Hand Tray */}
      <div className="space-y-2.5 relative z-10">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white uppercase font-black text-xs sm:text-sm">
              YOUR HAND ({myHand.length} CARDS):
            </span>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === "COLOR" ? "VALUE" : "COLOR")}
              className="px-2.5 py-1 border border-neutral-700 bg-neutral-900 hover:border-white text-[10px] text-neutral-300 uppercase font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow"
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
              className={`px-4 py-1.5 font-black text-xs uppercase border-2 rounded-full transition-all cursor-pointer shadow-lg active:scale-95 ${
                hasCalledUno
                  ? "border-emerald-400 bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                  : "border-white bg-red-600 text-white animate-bounce shadow-[0_0_25px_rgba(239,68,68,0.8)]"
              }`}
            >
              {hasCalledUno ? "✓ UNO SHOUTED!" : "🚨 [ SHOUT UNO! ]"}
            </button>
          )}
        </div>

        {/* Hand Cards Horizontal Scroll Container */}
        <div className="flex flex-wrap gap-2.5 justify-center bg-black/60 backdrop-blur-md p-4 sm:p-5 border-2 border-white/40 rounded-3xl min-h-[140px] items-center shadow-inner">
          {myHand.map((card, i) => {
            const top = us.discardTop;
            const isPlayable =
              isMyTurn &&
              (pendingStack > 0
                ? card.value === us.pendingDrawType
                : card.color === "WILD" || card.color === top.color || card.value === top.value);

            return (
              <VibrantUnoCardComponent
                key={`${card.color}-${card.value}-${i}`}
                card={card}
                isPlayable={isPlayable}
                onClick={isPlayable ? () => handleCardClick(card) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Banter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none relative z-10">
        <MessageSquare className="w-4 h-4 text-neutral-400 shrink-0" />
        {QUICK_BANTER.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => handleSendBanter(phrase)}
            className="px-2.5 py-1 bg-black hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-bold rounded-full whitespace-nowrap cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            {phrase}
          </button>
        ))}
      </div>

      {activeBanter && (
        <div className="bg-neutral-900 border-2 border-white px-4 py-2 text-xs text-center font-black uppercase text-amber-300 animate-in fade-in rounded-xl shadow-lg relative z-10">
          💬 YOU: {activeBanter}
        </div>
      )}

      {/* Action Telemetry */}
      {us.lastActionLog && (
        <div className="border border-white/20 bg-black/80 px-3.5 py-2 text-xs text-white flex items-center gap-2 rounded-xl shadow relative z-10">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate uppercase font-black text-[11px] sm:text-xs">
            {us.lastActionLog}
          </span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 sm:p-8 text-center space-y-3 animate-bounce shadow-2xl rounded-3xl relative z-30">
          <Trophy className="w-10 h-10 text-yellow-400 mx-auto animate-pulse" />
          <h2 className="font-black text-lg uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} EMPTIED THEIR HAND &amp; WON UNO!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 100} AURA POINTS
          </p>
          {onRematch && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRematch}
                className="px-6 py-3 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 mx-auto rounded-2xl shadow-xl active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>[ 🔄 PLAY REMATCH ]</span>
              </button>
            </div>
          )}
        </div>
      )}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
