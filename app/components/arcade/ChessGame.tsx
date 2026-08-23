"use client";

import React, { useState, useEffect } from "react";
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
import { Trophy, Swords, Share2, Sparkles, RefreshCw, HelpCircle } from "lucide-react";

interface ChessGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const PIECE_GLYPHS: Record<string, string> = {
  kw: "♔", qw: "♕", rw: "♖", bw: "♗", nw: "♘", pw: "♙",
  kb: "♚", qb: "♛", rb: "♜", bb: "♝", nb: "♞", pb: "♟",
};

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

  // Trigger Bot turns
  useEffect(() => {
    if (match.status !== "PLAYING" || !chessState) return;
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

  return (
    <div className="w-full max-w-xl mx-auto bg-black border-2 border-white p-3 sm:p-5 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // CHESS PROTOCOL [ GRID ARENA ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE & TALK 🎙️ ]</span>
          </button>
          <span className="px-2 py-0.5 border-2 border-white bg-white text-black font-extrabold uppercase text-[10px]">
            TURN: {chessState.currentTurn === "w" ? "WHITE" : "BLACK"} {isMyTurn ? "● (YOU)" : ""}
          </span>
        </div>
      </div>

      {/* Captured Trays */}
      <div className="flex justify-between items-center text-xs bg-neutral-950 p-2 border border-neutral-800">
        <div className="flex items-center gap-1 text-neutral-400">
          <span>CAPTURED BY WHITE:</span>
          <span className="text-white font-bold">{chessState.capturedB.join(" ") || "NONE"}</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <span>CAPTURED BY BLACK:</span>
          <span className="text-white font-bold">{chessState.capturedW.join(" ") || "NONE"}</span>
        </div>
      </div>

      {/* 8x8 Chess Board */}
      <div className="relative aspect-square max-w-[400px] sm:max-w-[440px] mx-auto border-4 border-white bg-black p-1">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border border-neutral-800">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
              const pieceGlyph = cell ? PIECE_GLYPHS[`${cell.type}${cell.color}`] : null;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center font-bold text-2xl sm:text-3xl transition-all cursor-pointer ${
                    isDark ? "bg-neutral-900" : "bg-black"
                  } ${
                    isSelected
                      ? "ring-4 ring-white bg-neutral-800 z-10 animate-pulse scale-105 shadow-[0_0_15px_#fff]"
                      : "hover:bg-neutral-800"
                  }`}
                >
                  {/* Coordinate Labels */}
                  {c === 0 && (
                    <span className="absolute top-0.5 left-0.5 text-[8px] text-neutral-600 font-mono">
                      {8 - r}
                    </span>
                  )}
                  {r === 7 && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] text-neutral-600 font-mono">
                      {String.fromCharCode(65 + c)}
                    </span>
                  )}
                  <span className={cell?.color === "w" ? "text-white" : "text-neutral-400"}>
                    {pieceGlyph}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action Telemetry */}
      {chessState.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{chessState.lastActionLog}</span>
        </div>
      )}

      {/* Victory Announcement */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} DELIVERED CHECKMATE!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="px-3.5 py-2 bg-black border-2 border-emerald-400 text-emerald-300 hover:bg-emerald-400 hover:text-black font-black text-xs uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5 rounded-full cursor-pointer hover:scale-105"
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
