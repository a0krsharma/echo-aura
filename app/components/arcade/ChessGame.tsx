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
  Flame,
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

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

// Calculate all legal destination coordinates for a selected piece
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

  const chessState = match.chessState;
  if (!chessState) return <div className="text-white font-mono p-4">Loading Chess arena...</div>;

  const board: (ChessPiece | null)[][] = JSON.parse(chessState.boardStr || "[]");
  const player = match.players[currentUid];
  const isWhite = player?.team === "WHITE" || isHost;
  const myColor: "w" | "b" = isWhite ? "w" : "b";
  const isMyTurn = chessState.currentTurn === myColor && match.status === "PLAYING";

  // Calculate remaining & captured pieces
  const { capturedByWhite, capturedByBlack, whiteMaterial, blackMaterial } = useMemo(() => {
    const initialCounts: Record<string, number> = {
      pw: 8, nw: 2, bw: 2, rw: 2, qw: 1,
      pb: 8, nb: 2, bb: 2, rb: 2, qb: 1,
    };
    const currentCounts: Record<string, number> = {
      pw: 0, nw: 0, bw: 0, rw: 0, qw: 0,
      pb: 0, nb: 0, bb: 0, rb: 0, qb: 0,
    };

    let wMat = 0;
    let bMat = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r]?.[c];
        if (p && p.type !== "k") {
          const key = `${p.type}${p.color}`;
          currentCounts[key] = (currentCounts[key] || 0) + 1;
          if (p.color === "w") wMat += PIECE_VALUES[p.type] || 0;
          else bMat += PIECE_VALUES[p.type] || 0;
        }
      }
    }

    const capByW: string[] = [];
    const capByB: string[] = [];

    ["p", "n", "b", "r", "q"].forEach((t) => {
      const lostBlack = Math.max(0, initialCounts[`${t}b`] - (currentCounts[`${t}b`] || 0));
      const lostWhite = Math.max(0, initialCounts[`${t}w`] - (currentCounts[`${t}w`] || 0));
      for (let i = 0; i < lostBlack; i++) capByW.push(PIECE_GLYPHS[`${t}b`]);
      for (let i = 0; i < lostWhite; i++) capByB.push(PIECE_GLYPHS[`${t}w`]);
    });

    return {
      capturedByWhite: capByW,
      capturedByBlack: capByB,
      whiteMaterial: wMat,
      blackMaterial: bMat,
    };
  }, [board]);

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
  }, [chessState?.currentTurn, match]);

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
      {/* ── Top Match Header ── */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] text-lg">
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
              Turn:{" "}
              <span className="text-white font-bold">
                {chessState.currentTurn === "w" ? "WHITE" : "BLACK"}
              </span>{" "}
              • {isMyTurn ? "YOUR MOVE" : "OPPONENT THINKING..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundSynth.playSubtlePop();
              setInviteOpen(true);
            }}
            className="px-3 py-1.5 border-2 border-white bg-white text-black font-black text-[10px] uppercase rounded transition-all hover:bg-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Share2 className="w-3 h-3" />
            <span>[ 🔗 INVITE &amp; TALK 🎙️ ]</span>
          </button>
        </div>
      </div>

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />

      {/* ── 1-Tap Empty Seat Availability Banner ── */}
      {!match.players[currentUid] && playersList.length < maxSeats && match.status !== "FINISHED" && (
        <div className="w-full bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 border-2 border-amber-400 p-3 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs truncate">
            <Users className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-black uppercase text-amber-200 truncate">
              🪑 SEAT OPEN ({playersList.length}/{maxSeats} PLAYERS) • TAKE A SEAT TO PLAY ON MIC
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
                  handle: `@GRANDMASTER_${currentUid.slice(0, 4)}`,
                });
                if (match.roomId) {
                  const { promoteToSpeaker } = await import("@/lib/rooms");
                  await promoteToSpeaker(match.roomId, currentUid);
                }
              } catch (e) {
                console.error("Failed to take seat in Chess:", e);
              }
            }}
            className="px-4 py-2 border-2 border-white bg-white text-black font-black text-xs uppercase cursor-pointer rounded-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0 shadow-md"
          >
            [ 🪑 TAKE A SEAT ]
          </button>
        </div>
      )}

      {/* ── Captured Material Trays HUD ── */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Black Player Tray */}
        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
              ♚ BLACK ({blackMaterial} PTS)
            </span>
            <div className="flex items-center gap-1 text-sm tracking-tighter min-h-[20px]">
              {capturedByBlack.map((glyph, i) => (
                <span key={i} className="text-white drop-shadow-sm">{glyph}</span>
              ))}
            </div>
          </div>
          {chessState.currentTurn === "b" && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black rounded animate-pulse">
              ON MOVE
            </span>
          )}
        </div>

        {/* White Player Tray */}
        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
              ♔ WHITE ({whiteMaterial} PTS)
            </span>
            <div className="flex items-center gap-1 text-sm tracking-tighter min-h-[20px]">
              {capturedByWhite.map((glyph, i) => (
                <span key={i} className="text-neutral-400 drop-shadow-sm">{glyph}</span>
              ))}
            </div>
          </div>
          {chessState.currentTurn === "w" && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black rounded animate-pulse">
              ON MOVE
            </span>
          )}
        </div>
      </div>

      {/* Action Telemetry Log */}
      {chessState.lastActionLog && (
        <div className="border border-amber-500/30 bg-neutral-950 px-3.5 py-2 rounded-lg text-xs text-amber-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="truncate font-bold tracking-wide">{chessState.lastActionLog}</span>
        </div>
      )}

      {/* ── 3D Handcrafted Walnut & Maple Chess Board ── */}
      <div className="relative max-w-[420px] mx-auto p-3.5 rounded-2xl bg-gradient-to-br from-[#2b1810] via-[#3d2314] to-[#1a0f0a] border-4 border-[#61381f] shadow-[0_20px_50px_rgba(0,0,0,0.9),_inset_0_2px_10px_rgba(255,255,255,0.2)]">
        <div className="grid grid-cols-8 grid-rows-8 gap-0 border-2 border-[#2b1810] rounded-lg overflow-hidden shadow-inner aspect-square">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const isDarkSquare = (r + c) % 2 === 1;
              const isSelected = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
              const isValidDestination = legalDestinations.some(
                ([tr, tc]) => tr === r && tc === c
              );
              const glyph = piece ? PIECE_GLYPHS[`${piece.type}${piece.color}`] : null;

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center cursor-pointer transition-all duration-75 select-none ${
                    isDarkSquare
                      ? "bg-gradient-to-br from-[#8a532b] to-[#6b3e1e]" // Handcrafted Walnut Wood
                      : "bg-gradient-to-br from-[#f2d8b3] to-[#deb887]" // Smooth Blonde Maple Wood
                  } ${
                    isSelected
                      ? "ring-4 ring-amber-400 ring-inset z-10 brightness-110 shadow-lg"
                      : ""
                  } ${
                    isValidDestination ? "hover:brightness-125" : ""
                  }`}
                >
                  {/* Coordinate Notations on Edge Squares */}
                  {c === 0 && (
                    <span className="absolute top-0.5 left-1 text-[8px] font-bold opacity-40 font-mono text-black">
                      {8 - r}
                    </span>
                  )}
                  {r === 7 && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-40 font-mono text-black">
                      {String.fromCharCode(97 + c)}
                    </span>
                  )}

                  {/* Valid Move Indicator (Green Dot / Red Capture Ring) */}
                  {isValidDestination && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      {piece ? (
                        <div className="w-8 h-8 rounded-full border-2 border-red-500/90 animate-pulse bg-red-500/20" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/90 shadow-[0_0_8px_#10b981]" />
                      )}
                    </div>
                  )}

                  {/* 3D Piece Glyph with Directional Drop Shadow */}
                  {glyph && (
                    <span
                      className={`text-3xl sm:text-4xl transition-transform active:scale-95 ${
                        piece?.color === "w"
                          ? "text-[#ffffff] drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] filter"
                          : "text-[#171717] drop-shadow-[0_4px_6px_rgba(255,255,255,0.3)] filter"
                      } ${isSelected ? "-translate-y-1 scale-110" : ""}`}
                    >
                      {glyph}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Checkmate / Finished Banner ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 CHECKMATE // VICTORY SECURED!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `CHECKMATE! You dominated the grandmaster board and earned +${match.stakes * 2} Aura Points!`
              : `Match concluded! Winner: ${match.winnerHandle || "@GRANDMASTER"}`}
          </p>
        </div>
      )}

      {/* ── Decoupled Social Audio & Reaction Bar ── */}
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
