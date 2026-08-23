"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { updateSnakeScore, type ArcadeMatch } from "@/lib/arcade";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Play, RefreshCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface SnakeGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

const GRID_SIZE = 20;

export default function SnakeGame({ match, currentUid }: SnakeGameProps) {
  const [snake, setSnake] = useState<[number, number][]>([
    [10, 10],
    [10, 11],
    [10, 12],
  ]);
  const [food, setFood] = useState<[number, number]>([5, 5]);
  const [direction, setDirection] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("UP");
  const [score, setScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const directionRef = useRef(direction);
  directionRef.current = direction;

  const spawnFood = (currentSnake: [number, number][]): [number, number] => {
    while (true) {
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (!currentSnake.some(([sr, sc]) => sr === r && sc === c)) {
        return [r, c];
      }
    }
  };

  const handleStart = () => {
    setSnake([
      [10, 10],
      [10, 11],
      [10, 12],
    ]);
    setFood(spawnFood([[10, 10], [10, 11], [10, 12]]));
    setDirection("UP");
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    soundSynth.playSnare();
  };

  const step = useCallback(() => {
    if (!isPlaying || isGameOver) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const dir = directionRef.current;
      let newHead: [number, number] = [head[0], head[1]];

      if (dir === "UP") newHead[0] -= 1;
      else if (dir === "DOWN") newHead[0] += 1;
      else if (dir === "LEFT") newHead[1] -= 1;
      else if (dir === "RIGHT") newHead[1] += 1;

      // Wall collision
      if (
        newHead[0] < 0 ||
        newHead[0] >= GRID_SIZE ||
        newHead[1] < 0 ||
        newHead[1] >= GRID_SIZE
      ) {
        setIsGameOver(true);
        setIsPlaying(false);
        soundSynth.playBuzzer();
        updateSnakeScore(match.id, currentUid, score, true);
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some(([sr, sc]) => sr === newHead[0] && sc === newHead[1])) {
        setIsGameOver(true);
        setIsPlaying(false);
        soundSynth.playBuzzer();
        updateSnakeScore(match.id, currentUid, score, true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead[0] === food[0] && newHead[1] === food[1]) {
        soundSynth.playSubtlePop();
        setScore((s) => s + 10);
        setFood(spawnFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [isPlaying, isGameOver, food, score, match.id, currentUid]);

  useEffect(() => {
    if (!isPlaying || isGameOver) return;
    const interval = setInterval(step, 130);
    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, step]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = directionRef.current;
      if (["ArrowUp", "KeyW"].includes(e.code) && dir !== "DOWN") setDirection("UP");
      else if (["ArrowDown", "KeyS"].includes(e.code) && dir !== "UP") setDirection("DOWN");
      else if (["ArrowLeft", "KeyA"].includes(e.code) && dir !== "RIGHT") setDirection("LEFT");
      else if (["ArrowRight", "KeyD"].includes(e.code) && dir !== "LEFT") setDirection("RIGHT");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2 text-xs">
        <span className="font-extrabold uppercase tracking-widest text-white">
          // SNAKE [ PHOSPHOR TERMINAL PROTOCOL ]
        </span>
        <span className="px-2 py-0.5 border border-white bg-white text-black font-extrabold">
          SCORE: {score}
        </span>
      </div>

      {/* Snake Grid */}
      <div className="relative aspect-square max-w-[340px] sm:max-w-[380px] mx-auto border-4 border-white bg-black p-1 shadow-2xl">
        <div
          className="w-full h-full grid bg-black"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: GRID_SIZE }).map((_, r) =>
            Array.from({ length: GRID_SIZE }).map((_, c) => {
              const isHead = snake[0][0] === r && snake[0][1] === c;
              const isBody = snake.slice(1).some(([sr, sc]) => sr === r && sc === c);
              const isFood = food[0] === r && food[1] === c;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`w-full h-full ${
                    isHead
                      ? "bg-white ring-1 ring-white"
                      : isBody
                      ? "bg-neutral-400"
                      : isFood
                      ? "bg-white rounded-full animate-ping"
                      : "bg-black"
                  }`}
                />
              );
            })
          )}
        </div>

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 space-y-3">
            {isGameOver && (
              <p className="text-white font-extrabold text-sm uppercase">
                💥 TERMINAL CRASH // SCORE: {score}
              </p>
            )}
            <button
              type="button"
              onClick={handleStart}
              className="px-6 py-2.5 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-extrabold text-xs uppercase transition-all cursor-pointer shadow-xl"
            >
              {isGameOver ? "[ RETRY PROTOCOL 🔄 ]" : "[ START SNAKE 🐍 ]"}
            </button>
          </div>
        )}
      </div>

      {/* On-Screen D-Pad */}
      <div className="flex flex-col items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => direction !== "DOWN" && setDirection("UP")}
          className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => direction !== "RIGHT" && setDirection("LEFT")}
            className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => direction !== "UP" && setDirection("DOWN")}
            className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => direction !== "LEFT" && setDirection("RIGHT")}
            className="p-3 border border-white bg-neutral-950 hover:bg-white hover:text-black font-bold active:scale-95 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
