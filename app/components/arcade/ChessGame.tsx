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
import { Trophy, Swords, Share2, Sparkles, HelpCircle, Shield, RotateCcw } from "lucide-react";

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
    const piece = board[r][c];

    if (selectedPos) {
      if (selectedPos[0] === r && selectedPos[1] === c) {
        setSelectedPos(null);
        return;
      }
      // If clicking own piece, switch selection
      if (piece && piece.color === myColor) {
        setSelectedPos([r, c]);
        soundSynth.playSubtlePop();
        return;
      }

      // Check if clicked cell is in legal destinations
      const isLegal = legalDestinations.some(([dr, dc]) => dr === r && dc === c);
      if (!isLegal) {
        soundSynth.playBuzzer();
        return;
      }

      // Execute move
      const from = selectedPos;
      const to: [number, number] = [r, c];
      setSelectedPos(null);
      soundSynth.playSnare();
      try {
        const result = await makeChessMove(match.id, currentUid, from, to);
        if (result.won) soundSynth.playFanfare();
      } catch (err) {
        soundSynth.playBuzzer();
      }
    } else {
      if (piece && piece.color === myColor) {
        setSelectedPos([r, c]);
        soundSynth.playSubtlePop();
      }
    }
  };

  const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.15)] relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-white animate-pulse" />
          <span className="font-black uppercase tracking-widest text-white">
            // CHESS PROTOCOL [ GRANDMASTER TERMINAL ]
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
          <span className={`px-2.5 py-1 border-2 font-black uppercase text-[10px] ${
            isMyTurn ? "border-white bg-white text-black animate-pulse" : "border-neutral-700 bg-black text-neutral-400"
          }`}>
            {isMyTurn ? "● YOUR TURN (WHITE)" : "OPPONENT'S TURN (BLACK)"}
          </span>
        </div>
      </div>

      {/* Captured Trays HUD */}
      <div className="flex justify-between items-center text-xs bg-neutral-950 p-2.5 border border-neutral-800 rounded">
        <div className="flex items-center gap-1 text-neutral-400">
          <span className="text-[10px] uppercase font-bold text-white">CAPTURED BLACK:</span>
          <span className="text-white font-black text-sm">{chessState.capturedB.map(t => PIECE_GLYPHS[`${t}b`]).join(" ") || "NONE"}</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <span className="text-[10px] uppercase font-bold text-white">CAPTURED WHITE:</span>
          <span className="text-white font-black text-sm">{chessState.capturedW.map(t => PIECE_GLYPHS[`${t}w`]).join(" ") || "NONE"}</span>
        </div>
      </div>

      {/* 8x8 Pure Monochromatic Chess Board */}
      <div className="relative max-w-[420px] mx-auto border-4 border-white bg-black p-2 shadow-2xl">
        <div className="w-full aspect-square grid grid-cols-8 grid-rows-8 border-2 border-white relative">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
              const isLegalDest = legalDestinations.some(([dr, dc]) => dr === r && dc === c);
              const pieceGlyph = cell ? PIECE_GLYPHS[`${cell.type}${cell.color}`] : null;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center font-black transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-300 ring-4 ring-amber-500 z-10 scale-105"
                      : isDark
                      ? "bg-[#b58863] text-black hover:bg-[#a37955]"
                      : "bg-[#f0d9b5] text-black hover:bg-[#e0c8a3]"
                  }`}
                >
                  {/* Coordinate labels */}
                  {c === 0 && (
                    <span className={`absolute left-1 top-0.5 text-[8px] font-mono pointer-events-none ${isDark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>
                      {ranks[r]}
                    </span>
                  )}
                  {r === 7 && (
                    <span className={`absolute right-1 bottom-0.5 text-[8px] font-mono pointer-events-none ${isDark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>
                      {files[c]}
                    </span>
                  )}

                  {/* Piece Representation */}
                  {pieceGlyph && (
                    <span
                      className={`text-2xl sm:text-3xl transition-transform ${
                        cell?.color === "w" ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                      }`}
                    >
                      {pieceGlyph}
                    </span>
                  )}

                  {/* Valid Move Indicator Dot / Ring */}
                  {isLegalDest && !cell && (
                    <div className="w-3.5 h-3.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  )}
                  {isLegalDest && cell && (
                    <div className="absolute inset-0 border-2 border-white bg-white/20 rounded animate-pulse" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Move History / Action Telemetry */}
      {chessState.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-black">{chessState.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-6 text-center space-y-2 animate-bounce shadow-2xl">
          <Trophy className="w-8 h-8 text-white mx-auto animate-pulse" />
          <h2 className="font-black text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} DELIVERED CHECKMATE!
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
          <span>[ ❓ CHESS RULES ]</span>
        </button>
      </div>

      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType="chess"
      />

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
