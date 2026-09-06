"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Shield, Zap, Trophy } from "lucide-react";

interface HandSlapGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

type Role = "attacker" | "defender";

export default function HandSlapGame({
  match,
  currentUid,
  onBack,
}: HandSlapGameProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Scores (First to 5)
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Role, setP1Role] = useState<Role>("attacker");

  // Tension, Feints & Animations
  const [tensionZoom, setTensionZoom] = useState(1);
  const [p1DodgesWithoutAttack, setP1DodgesWithoutAttack] = useState(0);
  const [p2DodgesWithoutAttack, setP2DodgesWithoutAttack] = useState(0);

  // Slap state
  const [isSlapping, setIsSlapping] = useState(false);
  const [isDodging, setIsDodging] = useState(false);
  const [feintTwitch, setFeintTwitch] = useState(false);
  const [redHandprint, setRedHandprint] = useState<{ x: number; y: number; opacity: number } | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>("READY! TENSION RISING...");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);

  const actionLock = useRef(false);
  const roundStartTime = useRef(Date.now());
  const tensionInterval = useRef<NodeJS.Timeout | null>(null);
  const botTimer = useRef<NodeJS.Timeout | null>(null);

  // Tension zoom effect
  useEffect(() => {
    if (inMenu || gameOver) {
      if (tensionInterval.current) clearInterval(tensionInterval.current);
      return;
    }

    roundStartTime.current = Date.now();
    setTensionZoom(1);

    tensionInterval.current = setInterval(() => {
      const elapsed = Date.now() - roundStartTime.current;
      const zoom = 1 + Math.min(elapsed / 8000, 0.25); // slowly zooms up to 1.25x
      setTensionZoom(zoom);
    }, 100);

    return () => {
      if (tensionInterval.current) clearInterval(tensionInterval.current);
    };
  }, [inMenu, gameOver, p1Score, p2Score, p1Role]);

  // Start new match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Score(0);
    setP2Score(0);
    setP1Role("attacker");
    setP1DodgesWithoutAttack(0);
    setP2DodgesWithoutAttack(0);
    setIsSlapping(false);
    setIsDodging(false);
    setFeintTwitch(false);
    setRedHandprint(null);
    setScreenShake(false);
    setStatusBanner("ATTACKER: TAP TO SLAP! DEFENDER: DODGE!");
    setGameOver(false);
    setWinner(null);
    actionLock.current = false;
    setInMenu(false);
  }, []);

  // End match
  const concludeGame = useCallback(
    (wonBy: "p1" | "p2") => {
      setGameOver(true);
      setWinner(wonBy);
      arcadeSfx.playVictory();
      if (wonBy === "p1" && currentUid && match?.id) {
        updateArcadeGameScore(match.id, currentUid, "hand_slap" as any, 50, true);
      }
    },
    [currentUid, match]
  );

  // Trigger Slap by Attacker
  const triggerSlap = useCallback(
    (attacker: "p1" | "p2") => {
      if (actionLock.current || gameOver) return;
      actionLock.current = true;

      setIsSlapping(true);
      const defender = attacker === "p1" ? "p2" : "p1";
      const isDefending = isDodging;

      // Reset dodges without attack
      if (defender === "p1") setP1DodgesWithoutAttack(0);
      else setP2DodgesWithoutAttack(0);

      setTimeout(() => {
        if (!isDefending) {
          // HIT!
          arcadeSfx.playSlap();
          setScreenShake(true);
          setRedHandprint({ x: 160, y: 220, opacity: 1 });
          setStatusBanner(attacker === "p1" ? "💥 DIRECT HIT! +1 POINT!" : "💥 BOT CONNECTED! +1 POINT!");

          if (attacker === "p1") {
            const nextScore = p1Score + 1;
            setP1Score(nextScore);
            if (nextScore >= 5) {
              concludeGame("p1");
              return;
            }
          } else {
            const nextScore = p2Score + 1;
            setP2Score(nextScore);
            if (nextScore >= 5) {
              concludeGame("p2");
              return;
            }
          }
        } else {
          // DODGED! Attacker missed -> Swap Roles!
          arcadeSfx.playWhoosh();
          setStatusBanner("💨 CLEAN DODGE! ROLES SWAP!");
          setP1Role((r) => (r === "attacker" ? "defender" : "attacker"));
        }

        setTimeout(() => {
          setIsSlapping(false);
          setScreenShake(false);
          actionLock.current = false;
        }, 500);
      }, 160);
    },
    [actionLock, gameOver, isDodging, p1Score, p2Score, concludeGame]
  );

  // Trigger Dodge by Defender
  const triggerDodge = useCallback(
    (defender: "p1" | "p2") => {
      if (actionLock.current || gameOver) return;

      arcadeSfx.playWhoosh();
      setIsDodging(true);

      // If dodging while attacker is NOT slapping -> check 3 false retreats
      if (!isSlapping) {
        if (defender === "p1") {
          const count = p1DodgesWithoutAttack + 1;
          setP1DodgesWithoutAttack(count);
          if (count >= 3) {
            arcadeSfx.playPenaltyBuzz();
            setStatusBanner("🚨 3 FALSE RETREATS! FEINT PENALTY TO P2!");
            setP1DodgesWithoutAttack(0);
            const next = p2Score + 1;
            setP2Score(next);
            if (next >= 5) concludeGame("p2");
          }
        } else {
          const count = p2DodgesWithoutAttack + 1;
          setP2DodgesWithoutAttack(count);
          if (count >= 3) {
            arcadeSfx.playPenaltyBuzz();
            setStatusBanner("🚨 3 FALSE RETREATS! FEINT PENALTY TO P1!");
            setP2DodgesWithoutAttack(0);
            const next = p1Score + 1;
            setP1Score(next);
            if (next >= 5) concludeGame("p1");
          }
        }
      }

      setTimeout(() => {
        setIsDodging(false);
      }, 450);
    },
    [actionLock, gameOver, isSlapping, p1DodgesWithoutAttack, p2DodgesWithoutAttack, p1Score, p2Score, concludeGame]
  );

  // Trigger Feint Twitch
  const triggerFeint = useCallback(() => {
    if (actionLock.current || gameOver) return;
    setFeintTwitch(true);
    arcadeSfx.playButtonTap();
    setTimeout(() => {
      setFeintTwitch(false);
    }, 150);
  }, [gameOver]);

  // Bot State Machine
  useEffect(() => {
    if (inMenu || playMode !== "bot" || gameOver) {
      if (botTimer.current) clearTimeout(botTimer.current);
      return;
    }

    const isBotAttacker = p1Role === "defender";

    if (isBotAttacker) {
      // Bot is attacking: delay 1.2s to 3.5s then slap or feint
      const waitMs = 1200 + Math.random() * 2000;
      botTimer.current = setTimeout(() => {
        if (Math.random() < 0.25) {
          // Trigger bluff twitch
          triggerFeint();
        } else {
          triggerSlap("p2");
        }
      }, waitMs);
    } else {
      // Bot is defending: when player slaps, react within human limits (160ms - 320ms)
      if (isSlapping) {
        const reactionMs = botDiff === "hard" ? 170 : botDiff === "medium" ? 230 : 310;
        const willDodge = Math.random() < (botDiff === "hard" ? 0.85 : botDiff === "medium" ? 0.65 : 0.45);

        botTimer.current = setTimeout(() => {
          if (willDodge) {
            triggerDodge("p2");
          }
        }, reactionMs);
      }
    }

    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [inMenu, playMode, gameOver, p1Role, isSlapping, botDiff, triggerSlap, triggerDodge, triggerFeint]);

  // Hero Vector Graphic
  const handSlapHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-50 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Top Hand (Defender) */}
          <path
            d="M 80,20 Q 95,20 100,45 L 105,75 Q 80,85 55,75 L 60,45 Q 65,20 80,20 Z"
            fill="#fbbf24"
            stroke="#b45309"
            strokeWidth="3"
          />
          <line x1="72" y1="35" x2="72" y2="65" stroke="#d97706" strokeWidth="2" />
          <line x1="88" y1="35" x2="88" y2="65" stroke="#d97706" strokeWidth="2" />

          {/* Bottom Hand (Attacker Slapping) */}
          <path
            d="M 80,140 Q 65,140 60,115 L 55,85 Q 80,75 105,85 L 100,115 Q 95,140 80,140 Z"
            fill="#ef4444"
            stroke="#991b1b"
            strokeWidth="3"
          />
          {/* Slap Impact Sparks */}
          <circle cx="80" cy="80" r="14" fill="#fef08a" opacity="0.8" />
          <path d="M 70,70 L 60,60 M 90,70 L 100,60 M 70,90 L 60,100 M 90,90 L 100,100" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Attacker vs. Defender",
      desc: "Attacker tries to slap hands before Defender pulls away. First to 5 points wins!",
      icon: "✋",
    },
    {
      title: "Miss = Roles Swap",
      desc: "If the Attacker strikes and Defender cleanly dodges, roles instantly swap.",
      icon: "🔄",
    },
    {
      title: "Feint Penalty",
      desc: "Defender cannot retreat 3 times without an actual attack—false retreats award a penalty point!",
      icon: "🚨",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-red-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="HAND SLAP"
          subtitle="Red Hands Reflex Duel"
          categoryTag="QUICK-DRAW REFLEX"
          accentColor="#E53935"
          objective="Attacker slaps before Defender dodges! 3 false retreats award a penalty point. First to 5 wins!"
          heroGraphic={handSlapHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans ${screenShake ? "animate-bounce" : ""}`}>
      {/* Top Header & Scoreboard */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Duel Score (P1 vs P2) */}
        <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 rounded-2xl border border-white/15 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-blue-300">YOU</span>
            <span className="text-2xl font-black text-blue-400">{p1Score}</span>
          </div>
          <span className="text-neutral-500 font-bold">:</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-red-300">{playMode === "bot" ? "BOT" : "P2"}</span>
            <span className="text-2xl font-black text-red-400">{p2Score}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
          <Trophy className="w-3.5 h-3.5" />
          <span>FIRST TO 5</span>
        </div>
      </div>

      {/* Tension / Status Banner */}
      <div className="w-full max-w-sm text-center my-2">
        <span className="text-xs font-black tracking-wider uppercase px-3 py-1 rounded-full bg-white/10 border border-white/15 text-emerald-300">
          {statusBanner}
        </span>
      </div>

      {/* Tension Zoom Duel Arena */}
      <div
        className="relative w-full max-w-sm h-[400px] bg-gradient-to-b from-amber-950/30 via-neutral-900 to-red-950/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between items-center p-6 transition-transform duration-300"
        style={{ transform: `scale(${tensionZoom})` }}
      >
        {/* Opponent Hand (Top) */}
        <div className="w-full flex flex-col items-center">
          <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
            {p1Role === "attacker" ? (
              <>
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>DEFENDER (DODGING)</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>ATTACKER (SLAPPING)</span>
              </>
            )}
          </div>

          {/* Top Hand Visual */}
          <div
            className={`w-32 h-24 bg-amber-300 border-4 border-amber-600 rounded-b-3xl shadow-xl flex items-center justify-center transition-all duration-150 ${
              p1Role === "attacker" && isDodging ? "-translate-y-8 opacity-60" : "translate-y-0"
            }`}
          >
            <span className="text-3xl">🖐️</span>
          </div>
        </div>

        {/* Fading Red Handprint Overlay */}
        {redHandprint && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000"
            style={{ opacity: redHandprint.opacity }}
          >
            <div className="w-32 h-32 rounded-full bg-red-600/30 blur-md flex items-center justify-center">
              <span className="text-6xl animate-ping">✋</span>
            </div>
          </div>
        )}

        {/* Player Hand (Bottom) */}
        <div className="w-full flex flex-col items-center">
          {/* Player Hand Visual */}
          <div
            className={`w-32 h-24 bg-red-500 border-4 border-red-700 rounded-t-3xl shadow-xl flex items-center justify-center transition-all duration-100 ${
              p1Role === "attacker" && (isSlapping || feintTwitch) ? "-translate-y-12" : ""
            } ${p1Role === "defender" && isDodging ? "translate-y-8 opacity-60" : ""}`}
          >
            <span className="text-3xl">✋</span>
          </div>

          <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mt-2 flex items-center gap-1">
            {p1Role === "attacker" ? (
              <>
                <Zap className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>YOU ARE ATTACKING</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>YOU ARE DEFENDING ({p1DodgesWithoutAttack}/3 RETREATS)</span>
              </>
            )}
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {winner === "p1" ? "VICTORY!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Final Score: {p1Score} - {p2Score}
            </p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>REMATCH</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
        {p1Role === "attacker" ? (
          <div className="grid grid-cols-3 gap-2">
            {/* Feint Button */}
            <button
              type="button"
              onPointerDown={triggerFeint}
              className="h-16 bg-amber-600 hover:bg-amber-700 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 text-white font-black text-sm rounded-2xl shadow-lg flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-lg">👀</span>
              <span className="text-[10px] uppercase font-bold">FEINT</span>
            </button>

            {/* Slap Strike Button */}
            <button
              type="button"
              onPointerDown={() => triggerSlap("p1")}
              className="col-span-2 h-16 bg-red-600 hover:bg-red-700 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 text-white font-black text-lg rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-2xl">💥</span>
              <span className="uppercase tracking-wider">SLAP!</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={() => triggerDodge("p1")}
            className="w-full h-16 bg-[#1E88E5] hover:bg-[#1976D2] border-b-4 border-[#1565C0] active:border-b-0 active:translate-y-1 text-white font-black text-xl rounded-2xl shadow-lg flex items-center justify-center gap-3 cursor-pointer"
          >
            <Shield className="w-6 h-6" />
            <span className="uppercase tracking-wider">DODGE / PULL BACK</span>
          </button>
        )}
      </div>
    </div>
  );
}
