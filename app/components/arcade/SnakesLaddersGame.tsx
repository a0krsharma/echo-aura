"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { rollSnakesLaddersDice, type ArcadeMatch } from "@/lib/arcade";
import { executeSnakesLaddersBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Dices, HelpCircle, Users } from "lucide-react";

interface SnakesLaddersGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

// 8 Ladders (start < end) and 8 Snakes (head > tail)
const LADDERS: [number, number][] = [
  [4, 14],
  [9, 31],
  [20, 38],
  [28, 84],
  [40, 59],
  [51, 67],
  [63, 81],
  [71, 91],
];

const SNAKES: [number, number, string][] = [
  [17, 7, "EMERALD"],
  [54, 34, "CRIMSON"],
  [62, 19, "PURPLE"],
  [64, 60, "AMBER"],
  [87, 24, "EMERALD"],
  [93, 73, "CRIMSON"],
  [95, 75, "PURPLE"],
  [99, 78, "CRIMSON"],
];

const SNAKE_COLORS: Record<string, { body: string; belly: string; glow: string }> = {
  EMERALD: { body: "#10b981", belly: "#065f46", glow: "#34d399" },
  CRIMSON: { body: "#ef4444", belly: "#991b1b", glow: "#f87171" },
  PURPLE: { body: "#a855f7", belly: "#6b21a8", glow: "#c084fc" },
  AMBER: { body: "#f59e0b", belly: "#92400e", glow: "#fbbf24" },
};

const SHORTCUTS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78,
};

const DICE_PIPS: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

/**
 * Converts a cell number (1 to 100) to standard boustrophedon 0-1000 SVG coordinates.
 */
function getCellCenter(cell: number): { x: number; y: number } {
  const index = Math.max(1, Math.min(100, cell)) - 1;
  const row = Math.floor(index / 10); // 0 (bottom) to 9 (top)
  const colInRow = index % 10;
  const col = row % 2 === 0 ? colInRow : 9 - colInRow; // Alternate direction
  const x = (col + 0.5) * 100;
  const y = (9 - row + 0.5) * 100;
  return { x, y };
}

export default function SnakesLaddersGame({ match, currentUid }: SnakesLaddersGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolling, setRolling] = useState(false);

  const sl = match.snakesLaddersState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!sl || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === sl.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeSnakesLaddersBotTurn(match);
    }
  }, [match, sl?.currentTurnUid, match.status]);

  if (!sl) return <div className="text-white font-mono p-4">Loading Circuit Jumpers...</div>;

  const positions: Record<string, number> = JSON.parse(sl.positionsStr || "{}");
  const isMyTurn = sl.currentTurnUid === currentUid && match.status === "PLAYING";
  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 4;

  const handleRoll = async () => {
    if (!isMyTurn || rolling || match.status === "FINISHED") return;
    setRolling(true);
    soundSynth.playSnare();

    try {
      const result = await rollSnakesLaddersDice(match.id, currentUid);
      if (result.won) soundSynth.playFanfare();
    } catch (e) {
      soundSynth.playBuzzer();
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // SNAKES & LADDERS [ 1-100 GRAND CIRCUIT ]
          </span>
        </div>
        <div className="flex items-center gap-2">
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
                ? "border-white bg-white text-black animate-pulse shadow-[0_0_15px_#fff]"
                : "border-neutral-700 bg-black text-neutral-400"
            }`}
          >
            {isMyTurn ? "● YOUR ROLL" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-emerald-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-emerald-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY & TALK ON LIVE MIC
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
                console.error("Failed to take seat in Snakes & Ladders:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* Position Telemetry Ticker */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-2.5 border border-neutral-800 rounded">
        {Object.entries(match.players || {}).map(([uid, p], idx) => {
          const pos = positions[uid] || 1;
          const isPlayerTurn = sl.currentTurnUid === uid;
          const pColor = idx === 0 ? "text-cyan-400 border-cyan-400" : "text-amber-400 border-amber-400";
          return (
            <div
              key={uid}
              className={`p-2 border flex items-center justify-between transition-all rounded ${
                isPlayerTurn
                  ? "border-white bg-white/10 text-white font-black ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-300 font-bold"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[8px] font-black ${
                    idx === 0 ? "bg-cyan-500 border-white text-black" : "bg-amber-500 border-white text-black"
                  }`}
                >
                  P{idx + 1}
                </span>
                <span className="truncate">
                  {p.handle} {uid === currentUid ? "(YOU)" : ""}
                </span>
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 border rounded font-black ${pColor}`}>
                TILE #{pos}
              </span>
            </div>
          );
        })}
      </div>

      {/* 10x10 Authentic Visual Board Area with SVG Snakes & Ladders */}
      <div className="relative aspect-square max-w-[440px] sm:max-w-[480px] mx-auto border-4 border-white bg-neutral-950 p-1.5 shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
        {/* 100-Tile Underlying Grid */}
        <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-0.5 border-2 border-neutral-700 bg-black p-0.5 relative">
          {Array.from({ length: 10 }).map((_, rIdx) => {
            const r = 9 - rIdx;
            return Array.from({ length: 10 }).map((_, cIdx) => {
              const c = r % 2 === 1 ? 9 - cIdx : cIdx;
              const cellNum = r * 10 + c + 1;
              const hasLadder = SHORTCUTS[cellNum] && SHORTCUTS[cellNum] > cellNum;
              const hasSnake = SHORTCUTS[cellNum] && SHORTCUTS[cellNum] < cellNum;
              const isTile100 = cellNum === 100;
              const isTile1 = cellNum === 1;

              return (
                <div
                  key={cellNum}
                  className={`w-full h-full border border-neutral-800/80 flex flex-col items-center justify-between p-0.5 text-[8px] sm:text-[9px] relative transition-all ${
                    isTile100
                      ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black"
                      : isTile1
                      ? "bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black"
                      : (r + c) % 2 === 1
                      ? "bg-neutral-900/90 text-white"
                      : "bg-neutral-950 text-neutral-300"
                  }`}
                >
                  <span
                    className={`font-mono text-[7px] self-start leading-none font-bold ${
                      isTile100 ? "text-black font-black" : "text-neutral-500"
                    }`}
                  >
                    {cellNum}
                  </span>

                  {isTile100 && (
                    <span className="text-[9px] leading-none animate-bounce">🏆</span>
                  )}
                  {isTile1 && (
                    <span className="text-[8px] leading-none">🚀</span>
                  )}

                  {/* Corner indicator badges */}
                  {hasLadder && (
                    <span className="text-[6px] text-amber-300 font-bold leading-none self-end bg-amber-950/80 px-0.5 rounded border border-amber-500/50">
                      🪜{SHORTCUTS[cellNum]}
                    </span>
                  )}
                  {hasSnake && (
                    <span className="text-[6px] text-rose-400 font-bold leading-none self-end bg-rose-950/80 px-0.5 rounded border border-rose-500/50">
                      🐍{SHORTCUTS[cellNum]}
                    </span>
                  )}
                </div>
              );
            });
          })}
        </div>

        {/* Full-Board SVG Layer for Authentic Snakes, Cobra Heads & Dual-Rail Ladders */}
        <svg
          viewBox="0 0 1000 1000"
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        >
          <defs>
            <filter id="ladderGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.8" />
            </filter>
            <filter id="snakeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.9" />
            </filter>
            <linearGradient id="ladderGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* Render All Ladders (Dual-Rail with steps/rungs) */}
          {LADDERS.map(([start, end], idx) => {
            const p1 = getCellCenter(start);
            const p2 = getCellCenter(end);
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const perp = angle + Math.PI / 2;
            const railSpacing = 11;
            const dx = Math.cos(perp) * railSpacing;
            const dy = Math.sin(perp) * railSpacing;

            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const numRungs = Math.max(3, Math.floor(dist / 32));

            const rungs: { x1: number; y1: number; x2: number; y2: number }[] = [];
            for (let i = 1; i <= numRungs; i++) {
              const t = i / (numRungs + 1);
              const cx = p1.x + (p2.x - p1.x) * t;
              const cy = p1.y + (p2.y - p1.y) * t;
              rungs.push({
                x1: cx - dx,
                y1: cy - dy,
                x2: cx + dx,
                y2: cy + dy,
              });
            }

            return (
              <g key={`ladder-${idx}`} filter="url(#ladderGlow)">
                {/* Rails */}
                <line
                  x1={p1.x - dx}
                  y1={p1.y - dy}
                  x2={p2.x - dx}
                  y2={p2.y - dy}
                  stroke="url(#ladderGold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <line
                  x1={p1.x + dx}
                  y1={p1.y + dy}
                  x2={p2.x + dx}
                  y2={p2.y + dy}
                  stroke="url(#ladderGold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Rungs */}
                {rungs.map((r, rIdx) => (
                  <line
                    key={rIdx}
                    x1={r.x1}
                    y1={r.y1}
                    x2={r.x2}
                    y2={r.y2}
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            );
          })}

          {/* Render All Snakes (Curved Serpentine Body, Cobra Head, Eyes & Forked Tongue) */}
          {SNAKES.map(([head, tail, colorKey], idx) => {
            const h = getCellCenter(head);
            const t = getCellCenter(tail);
            const colors = SNAKE_COLORS[colorKey] || SNAKE_COLORS.EMERALD;

            // Generate wavy serpentine bezier control points
            const angle = Math.atan2(t.y - h.y, t.x - h.x);
            const perp = angle + Math.PI / 2;
            const dist = Math.hypot(t.x - h.x, t.y - h.y);
            const waveAmp = Math.min(50, dist * 0.25) * (idx % 2 === 0 ? 1 : -1);

            const m1x = h.x + (t.x - h.x) * 0.35 + Math.cos(perp) * waveAmp;
            const m1y = h.y + (t.y - h.y) * 0.35 + Math.sin(perp) * waveAmp;
            const m2x = h.x + (t.x - h.x) * 0.7 - Math.cos(perp) * waveAmp;
            const m2y = h.y + (t.y - h.y) * 0.7 - Math.sin(perp) * waveAmp;

            const pathD = `M ${h.x} ${h.y} C ${m1x} ${m1y}, ${m2x} ${m2y}, ${t.x} ${t.y}`;

            // Tongue direction
            const tongueLen = 16;
            const tx = h.x - Math.cos(angle) * tongueLen;
            const ty = h.y - Math.sin(angle) * tongueLen;

            return (
              <g key={`snake-${idx}`} filter="url(#snakeShadow)">
                {/* Snake Outer Thick Body */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={colors.belly}
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                {/* Snake Inner Body */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={colors.body}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Snake Scale Pattern Center Stripe */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                  opacity="0.75"
                />

                {/* Forked Tongue */}
                <path
                  d={`M ${h.x} ${h.y} L ${tx} ${ty} M ${tx} ${ty} l ${Math.cos(angle + 0.5) * -6} ${Math.sin(angle + 0.5) * -6} M ${tx} ${ty} l ${Math.cos(angle - 0.5) * -6} ${Math.sin(angle - 0.5) * -6}`}
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Cobra Head */}
                <circle cx={h.x} cy={h.y} r="15" fill={colors.body} stroke="#000" strokeWidth="2" />
                <circle cx={h.x} cy={h.y} r="12" fill={colors.belly} />

                {/* Glowing Snake Eyes */}
                <circle
                  cx={h.x + Math.cos(perp) * 6}
                  cy={h.y + Math.sin(perp) * 6}
                  r="3.5"
                  fill="#facc15"
                />
                <circle
                  cx={h.x + Math.cos(perp) * 6}
                  cy={h.y + Math.sin(perp) * 6}
                  r="1.5"
                  fill="#000000"
                />
                <circle
                  cx={h.x - Math.cos(perp) * 6}
                  cy={h.y - Math.sin(perp) * 6}
                  r="3.5"
                  fill="#facc15"
                />
                <circle
                  cx={h.x - Math.cos(perp) * 6}
                  cy={h.y - Math.sin(perp) * 6}
                  r="1.5"
                  fill="#000000"
                />
              </g>
            );
          })}

          {/* Render Active Player Pawns on Board */}
          {Object.entries(positions).map(([uid, pos], pIdx) => {
            const center = getCellCenter(pos);
            const isP1 = uid === match.hostUid;
            const pFill = isP1 ? "#06b6d4" : "#f59e0b";
            const pBorder = "#ffffff";
            const label = isP1 ? "P1" : "P2";

            // Offset if multiple players share the exact same cell
            const offset = (pIdx - 0.5) * 22;

            return (
              <g key={`pawn-${uid}`} transform={`translate(${center.x + offset}, ${center.y})`}>
                {/* Pulsing Aura Ring */}
                <circle cx="0" cy="0" r="22" fill={pFill} opacity="0.3" className="animate-ping" />
                {/* Pawn Base */}
                <circle
                  cx="0"
                  cy="0"
                  r="16"
                  fill={pFill}
                  stroke={pBorder}
                  strokeWidth="3.5"
                  filter="url(#ladderGlow)"
                />
                {/* Pawn Initial Label */}
                <text
                  x="0"
                  y="4.5"
                  textAnchor="middle"
                  fill="#000000"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 3D Dice Roll Control Deck */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-950 p-4 border-2 border-white rounded-lg shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 border-2 border-white bg-black rounded-lg flex items-center justify-center text-4xl font-black shadow-[0_0_20px_rgba(255,255,255,0.25)]">
            {sl.lastDiceRoll ? DICE_PIPS[sl.lastDiceRoll] || sl.lastDiceRoll : "🎲"}
          </div>
          <div>
            <span className="text-xs font-black uppercase text-white block">
              LAST ROLL: {sl.lastDiceRoll ? `${sl.lastDiceRoll} TILES FORWARD` : "READY FOR ROLL"}
            </span>
            <span className="text-[10px] text-neutral-400 font-bold uppercase">
              {isMyTurn ? "TAP BUTTON BELOW TO ROLL 3D DIE" : "WAITING FOR OPPONENT'S TURN"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRoll}
          disabled={!isMyTurn || rolling || match.status === "FINISHED"}
          className={`w-full sm:w-auto px-7 py-3.5 border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-lg cursor-pointer ${
            isMyTurn && match.status !== "FINISHED"
              ? "border-white bg-white text-black hover:bg-neutral-200 shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
              : "border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <Dices className="w-4 h-4" />
          <span>{rolling ? "ROLLING DIE..." : isMyTurn ? "[ 🎲 ROLL 3D DIE NOW ]" : "[ OPPONENT'S TURN ]"}</span>
        </button>
      </div>

      {/* Action Telemetry */}
      {sl.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2 rounded">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{sl.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl rounded-xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} REACHED CELL 100 & WON!
          </h2>
          <p className="text-xs text-neutral-300 uppercase font-bold">
            AWARDED +{match.stakes * 2 || 100} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
