"use client";

import React, { useState, useEffect, useMemo } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  makeChessMove,
  type ArcadeMatch,
  type ChessPiece,
} from "@/lib/arcade";
import { executeChessBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import {
  Trophy,
  Swords,
  Share2,
  Sparkles,
  HelpCircle,
  Shield,
  RotateCcw,
  Users,
  Crown,
  Zap,
} from "lucide-react";

interface ChessGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const PIECE_GLYPHS: Record<string, string> = {
  kw: "♔", qw: "♕", rw: "♖", bw: "♗", nw: "♘", pw: "♙",
  kb: "♚", qb: "♛", rb: "♜", bb: "♝", nb: "♞", pb: "♟",
};

// Calculate all pseudo-legal destination coordinates for a selected piece
function getLegalDestinations(
  board: (ChessPiece | null)[][],
  fromR: number,
  fromC: number
): [number, number][] {
  const piece = board[fromR]?.[fromC];
  if (!piece) return [];
  const color = piece.color;
  const oppColor = color === "w" ? "b" : "w";
  const valid: [number, number][] = [];

  const isInside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

  if (piece.type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    // 1 step forward
    if (isInside(fromR + dir, fromC) && !board[fromR + dir][fromC]) {
      valid.push([fromR + dir, fromC]);
      // 2 steps forward from home row
      if (fromR === startRow && isInside(fromR + 2 * dir, fromC) && !board[fromR + 2 * dir][fromC]) {
        valid.push([fromR + 2 * dir, fromC]);
      }
    }

    // Diagonal captures
    [-1, 1].forEach((dc) => {
      const nr = fromR + dir;
      const nc = fromC + dc;
      if (isInside(nr, nc) && board[nr][nc]?.color === oppColor) {
        valid.push([nr, nc]);
      }
    });
  } else if (piece.type === "n") {
    const knightJumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    knightJumps.forEach(([dr, dc]) => {
      const nr = fromR + dr;
      const nc = fromC + dc;
      if (isInside(nr, nc)) {
        const destPiece = board[nr][nc];
        if (!destPiece || destPiece.color === oppColor) {
          valid.push([nr, nc]);
        }
      }
    });
  } else if (piece.type === "b" || piece.type === "r" || piece.type === "q") {
    const rayDirs: [number, number][] = [];
    if (piece.type === "b" || piece.type === "q") {
      rayDirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === "r" || piece.type === "q") {
      rayDirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }

    rayDirs.forEach(([dr, dc]) => {
      let step = 1;
      while (true) {
        const nr = fromR + dr * step;
        const nc = fromC + dc * step;
        if (!isInside(nr, nc)) break;
        const dest = board[nr][nc];
        if (!dest) {
          valid.push([nr, nc]);
        } else {
          if (dest.color === oppColor) valid.push([nr, nc]);
          break;
        }
        step++;
      }
    });
  } else if (piece.type === "k") {
    const kingDirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    kingDirs.forEach(([dr, dc]) => {
      const nr = fromR + dr;
      const nc = fromC + dc;
      if (isInside(nr, nc)) {
        const dest = board[nr][nc];
        if (!dest || dest.color === oppColor) {
          valid.push([nr, nc]);
        }
      }
    });
  }

  return valid;
}

export default function ChessGame({ match, currentUid, isHost }: ChessGameProps) {
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const chessState = match.chessState;
  if (!chessState) return <div className="text-white font-mono p-4">Loading Chess arena...</div>;

  const board: (ChessPiece | null)[][] = JSON.parse(chessState.boardStr || "[]");
  const player = match.players[currentUid];
  const isWhite = player?.team === "WHITE" || isHost;
  const myColor: "w" | "b" = isWhite ? "w" : "b";
  const isMyTurn = chessState.currentTurn === myColor && match.status === "PLAYING";

  // Compute legal moves for selected piece
  const legalDestinations = useMemo(() => {
    if (!selectedPos) return [];
    return getLegalDestinations(board, selectedPos[0], selectedPos[1]);
  }, [board, selectedPos]);

  // Trigger AI Bot Turn
  useEffect(() => {
    if (match.status !== "PLAYING" || !chessState || match.mode !== "VS_COMPUTER") return;
    if (chessState.currentTurn === "b") {
      const botPlayer = Object.values(match.players || {}).find(
        (p) => p.team === "BLACK" && p.isBot
      );
      if (botPlayer) {
        executeChessBotTurn(match);
      }
    }
  }, [chessState?.currentTurn, match.status]);

  const handleCellClick = async (r: number, c: number) => {
    if (!isMyTurn || match.status === "FINISHED") return;

    const clickedPiece = board[r][c];

    // 1. Select our piece
    if (clickedPiece && clickedPiece.color === myColor) {
      soundSynth.playSubtlePop();
      setSelectedPos([r, c]);
      return;
    }

    // 2. Move to destination if valid
    if (selectedPos) {
      const isValid = legalDestinations.some(([tr, tc]) => tr === r && tc === c);
      if (isValid) {
        soundSynth.playSnare();
        try {
          const result = await makeChessMove(
            match.id,
            currentUid,
            [selectedPos[0], selectedPos[1]],
            [r, c]
          );
          if (result.won) {
            soundSynth.playFanfare();
          }
        } catch (e) {
          soundSynth.playBuzzer();
        } finally {
          setSelectedPos(null);
        }
      } else {
        setSelectedPos(null);
      }
    }
  };

  const playersList = Object.values(match.players || {});
  const maxSeats = match.maxPlayers || 2;

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-2 border-amber-500/60 p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_80px_rgba(245,158,11,0.15)] rounded-2xl">
      {/* ── Top Match Control Header ── */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            ♟️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase text-amber-400 tracking-wider">
                GRANDMASTER CHESS
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold rounded">
                DELUXE 3D
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Turn: <span className="text-white font-bold">{chessState.currentTurn === "w" ? "White (♔)" : "Black (♚)"}</span> • {isMyTurn ? "YOUR MOVE" : "OPPONENT'S MOVE"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-700 bg-black hover:border-white text-neutral-300 font-bold text-[10px] uppercase rounded transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>RULES</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] uppercase rounded transition-all hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeGameRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} initialGameType="chess" />

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
                console.error("Failed to take seat in Chess:", e);
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer rounded-lg transition-all active:scale-95 shrink-0 shadow-lg"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Action Telemetry Log ── */}
      {chessState.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950/80 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{chessState.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Deluxe Handcrafted Walnut & Maple Chess Board ── */}
      <div className="relative aspect-square max-w-[420px] sm:max-w-[460px] mx-auto p-3 rounded-2xl bg-gradient-to-br from-[#2b1307] via-[#45220c] to-[#1a0b04] border-4 border-[#6e3713] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        {/* 8x8 Board Grid */}
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-2 border-[#3d200e] rounded-xl overflow-hidden shadow-inner">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const isLight = (r + c) % 2 === 0;
              const isSelected = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
              const isLegal = legalDestinations.some(([tr, tc]) => tr === r && tc === c);
              const pieceKey = piece ? `${piece.type}${piece.color}` : "";
              const glyph = pieceKey ? PIECE_GLYPHS[pieceKey] : "";

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`w-full h-full flex items-center justify-center relative transition-all cursor-pointer ${
                    isLight ? "bg-[#f4ebd0] text-black" : "bg-[#b88b4a] text-black"
                  } ${
                    isSelected
                      ? "ring-4 ring-amber-400 bg-amber-200/80 z-20 shadow-[inset_0_0_15px_#f59e0b]"
                      : ""
                  }`}
                >
                  {/* Legal Destination Highlight */}
                  {isLegal && (
                    <div
                      className={`absolute rounded-full z-10 ${
                        piece
                          ? "w-full h-full border-4 border-red-500/80 bg-red-500/20 animate-pulse"
                          : "w-3.5 h-3.5 bg-emerald-500/80 ring-2 ring-emerald-300 shadow-[0_0_8px_#10b981]"
                      }`}
                    />
                  )}

                  {/* 3D Realistic Piece Glyph */}
                  {glyph && (
                    <span
                      className={`text-2xl sm:text-3xl font-bold select-none transition-transform ${
                        piece?.color === "w"
                          ? "text-[#fafafa] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter"
                          : "text-[#18181b] drop-shadow-[0_2px_3px_rgba(255,255,255,0.4)]"
                      } ${isSelected ? "scale-125 animate-bounce" : ""}`}
                    >
                      {glyph}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 CHECKMATE! GRANDMASTER VICTORY!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You delivered checkmate and won +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
