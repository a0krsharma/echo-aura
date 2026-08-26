"use client";

import React, { useState, useEffect, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { update2048State, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";

interface Game2048Props {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function Game2048({ match, currentUid }: Game2048Props) {
  const g2048 = match.game2048State;
  const initialGrid: number[][] = g2048
    ? JSON.parse(g2048.gridStr)
    : [
        [0, 0, 0, 0],
        [0, 2, 0, 0],
        [0, 0, 2, 0],
        [0, 0, 0, 0],
      ];

  const [grid, setGrid] = useState<number[][]>(initialGrid);
  const [score, setScore] = useState<number>(g2048?.score || 0);
  const [isGameOver, setIsGameOver] = useState<boolean>(g2048?.isGameOver || false);
  const [isWon, setIsWon] = useState<boolean>(g2048?.isWon || false);

  const addRandomTile = (currentGrid: number[][]): number[][] => {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentGrid[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return currentGrid;
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = currentGrid.map((row) => [...row]);
    newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
  };

  const slideRow = (row: number[]): { newRow: number[]; gained: number } => {
    let arr = row.filter((val) => val !== 0);
    let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        arr[i + 1] = 0;
      }
    }
    arr = arr.filter((val) => val !== 0);
    while (arr.length < 4) arr.push(0);
    return { newRow: arr, gained };
  };

  const handleMove = useCallback(
    (direction: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
      if (isGameOver || match.status === "FINISHED") return;

      let newGrid: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
      let pointsGained = 0;
      let moved = false;

      if (direction === "LEFT") {
        for (let r = 0; r < 4; r++) {
          const { newRow, gained } = slideRow(grid[r]);
          newGrid[r] = newRow;
          pointsGained += gained;
          if (newRow.some((val, i) => val !== grid[r][i])) moved = true;
        }
      } else if (direction === "RIGHT") {
        for (let r = 0; r < 4; r++) {
          const reversed = [...grid[r]].reverse();
          const { newRow, gained } = slideRow(reversed);
          newGrid[r] = newRow.reverse();
          pointsGained += gained;
          if (newGrid[r].some((val, i) => val !== grid[r][i])) moved = true;
        }
      } else if (direction === "UP") {
        for (let c = 0; c < 4; c++) {
          const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
          const { newRow, gained } = slideRow(col);
          pointsGained += gained;
          for (let r = 0; r < 4; r++) {
            newGrid[r][c] = newRow[r];
            if (newRow[r] !== grid[r][c]) moved = true;
          }
        }
      } else if (direction === "DOWN") {
        for (let c = 0; c < 4; c++) {
          const col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
          const { newRow, gained } = slideRow(col);
          pointsGained += gained;
          const rev = newRow.reverse();
          for (let r = 0; r < 4; r++) {
            newGrid[r][c] = rev[r];
            if (rev[r] !== grid[r][c]) moved = true;
          }
        }
      }

      if (moved) {
        soundSynth.playSubtlePop();
        const gridWithTile = addRandomTile(newGrid);
        const newScore = score + pointsGained;
        setGrid(gridWithTile);
        setScore(newScore);

        const won = gridWithTile.some((r) => r.some((c) => c === 2048));
        if (won && !isWon) {
          setIsWon(true);
          soundSynth.playFanfare();
        }

        update2048State(match.id, currentUid, gridWithTile, newScore, won, false);
      }
    },
    [grid, score, isGameOver, isWon, match.id, currentUid, match.status]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        handleMove("UP");
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        handleMove("DOWN");
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault();
        handleMove("LEFT");
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault();
        handleMove("RIGHT");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white">
          // 2048 [ BINARY MERGE MATRIX ]
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold">
            SCORE: {score}
          </span>
        </div>
      </div>

      {/* 4x4 Grid */}
      <div className="relative aspect-square max-w-[340px] sm:max-w-[380px] mx-auto border-4 border-white bg-neutral-950 p-2 shadow-2xl">
        <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-2 bg-black p-2">
          {grid.map((row, r) =>
            row.map((val, c) => (
              <div
                key={`${r}-${c}`}
                className={`w-full h-full border-2 border-neutral-800 flex items-center justify-center font-extrabold text-sm sm:text-base transition-all ${
                  val === 0
                    ? "bg-neutral-950 text-transparent"
                    : val >= 2048
                    ? "bg-white text-black ring-4 ring-white animate-bounce"
                    : val >= 256
                    ? "bg-white text-black"
                    : val >= 32
                    ? "bg-neutral-800 text-white border-white"
                    : "bg-neutral-900 text-white"
                }`}
              >
                {val !== 0 ? val : ""}
              </div>
            ))
          )}
        </div>
      </div>

      {/* On-Screen D-Pad Controls */}
      <div className="flex flex-col items-center gap-1.5 pt-2">
        <button
          type="button"
          onClick={() => handleMove("UP")}
          className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMove("LEFT")}
            className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleMove("DOWN")}
            className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleMove("RIGHT")}
            className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Victory Declaration */}
      {isWon && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 2048 BINARY THRESHOLD REACHED!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +150 AURA POINTS
          </p>
        </div>
      )}

      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
