"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Trophy,
  RotateCw,
  Sparkles,
  Volume2,
  Users,
  Play,
  Flame,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { addCash } from "@/lib/spacesEconomy";
import {
  playUnoCardPlay,
  playUnoTurnChime,
  playUnoShout,
  playGameVictory
} from "@/lib/spacesSfx";
import { PartyMusicBar } from "./PartyMusicBar";

export type CardColor = "red" | "blue" | "green" | "yellow" | "wild";
export type CardValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  hand: UnoCard[];
  calledUno: boolean;
  position: "bottom" | "left" | "across" | "right";
}

interface UnoGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceTitle: string;
  localUserName: string;
  localUserAvatar?: string;
  onlineParticipants: Array<{ uid: string; displayName: string; photoURL?: string }>;
}

const COLOR_MAP: Record<CardColor, { bg: string; border: string; text: string; shadow: string }> = {
  red: { bg: "bg-gradient-to-br from-rose-500 to-red-600", border: "border-rose-300", text: "text-white", shadow: "shadow-red-500/40" },
  blue: { bg: "bg-gradient-to-br from-sky-400 to-blue-600", border: "border-sky-200", text: "text-white", shadow: "shadow-blue-500/40" },
  green: { bg: "bg-gradient-to-br from-emerald-400 to-green-600", border: "border-emerald-200", text: "text-white", shadow: "shadow-emerald-500/40" },
  yellow: { bg: "bg-gradient-to-br from-amber-300 to-yellow-500", border: "border-yellow-100", text: "text-slate-900", shadow: "shadow-yellow-500/40" },
  wild: { bg: "bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-400", border: "border-white/50", text: "text-white", shadow: "shadow-purple-500/40" },
};

function generateDeck(): UnoCard[] {
  const colors: Exclude<CardColor, "wild">[] = ["red", "blue", "green", "yellow"];
  const deck: UnoCard[] = [];
  let idCounter = 0;

  for (const color of colors) {
    deck.push({ id: `card_${idCounter++}`, color, value: "0" });
    const numbers: CardValue[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    for (const num of numbers) {
      deck.push({ id: `card_${idCounter++}`, color, value: num });
      deck.push({ id: `card_${idCounter++}`, color, value: num });
    }
    const actions: CardValue[] = ["skip", "reverse", "draw2"];
    for (const act of actions) {
      deck.push({ id: `card_${idCounter++}`, color, value: act });
      deck.push({ id: `card_${idCounter++}`, color, value: act });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card_${idCounter++}`, color: "wild", value: "wild" });
    deck.push({ id: `card_${idCounter++}`, color: "wild", value: "wild4" });
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function renderPlayerAvatar(avatar?: string, fallback: string = "👑", sizeClass: string = "w-8 h-8 text-sm") {
  if (avatar && (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("/") || avatar.startsWith("data:"))) {
    return (
      <img
        src={avatar}
        alt="Player Avatar"
        className={`${sizeClass} rounded-full object-cover border border-white/20 shadow-sm shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-sm shrink-0`}>
      <span className="leading-none">{avatar || fallback}</span>
    </div>
  );
}

export function UnoGameModal({
  isOpen,
  onClose,
  spaceTitle,
  localUserName,
  localUserAvatar,
  onlineParticipants
}: UnoGameModalProps) {
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [turnDirection, setTurnDirection] = useState<1 | -1>(1); // 1 = clockwise, -1 = counter
  const [activeColor, setActiveColor] = useState<CardColor>("red");
  const [gameStatus, setGameStatus] = useState<"lobby" | "playing" | "game_over">("lobby");
  const [winner, setWinner] = useState<Player | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>("Welcome to the Uno Lounge!");
  const [wildPickerOpen, setWildPickerOpen] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [unoCaughtToast, setUnoCaughtToast] = useState<string | null>(null);

  // Initialize game seats with local user at bottom, others placed at Left, Across, Right
  const startNewGame = useCallback(() => {
    const freshDeck = generateDeck();

    // Map other participants or bots
    const others = onlineParticipants.filter(p => p.displayName !== localUserName);
    const guestNames = ["AuraBot 🤖", "Nova_Gamer 🎮", "CyberSam ⚡"];
    const guestAvatars = ["🤖", "🦊", "🐯"];

    const seatPositions: Player["position"][] = ["left", "across", "right"];
    const seatPlayers: Player[] = [];

    // Local Player (Bottom)
    const localHand = freshDeck.splice(0, 7);
    seatPlayers.push({
      id: "local_user",
      name: localUserName || "You",
      avatar: localUserAvatar || "👑",
      isBot: false,
      hand: localHand,
      calledUno: false,
      position: "bottom",
    });

    // 3 Other Seats (Human or Bot)
    for (let i = 0; i < 3; i++) {
      const human = others[i];
      const pHand = freshDeck.splice(0, 7);
      seatPlayers.push({
        id: human ? human.uid : `bot_${i}`,
        name: human ? human.displayName : guestNames[i],
        avatar: human?.photoURL || guestAvatars[i],
        isBot: !human,
        hand: pHand,
        calledUno: false,
        position: seatPositions[i],
      });
    }

    // Top discard card (ensure not wild to start)
    let firstCard = freshDeck.pop()!;
    while (firstCard.color === "wild") {
      freshDeck.unshift(firstCard);
      firstCard = freshDeck.pop()!;
    }

    setDeck(freshDeck);
    setDiscardPile([firstCard]);
    setActiveColor(firstCard.color);
    setPlayers(seatPlayers);
    setCurrentTurnIndex(0);
    setTurnDirection(1);
    setWinner(null);
    setGameStatus("playing");
    setStatusBanner(`Game started! Your turn, ${localUserName || "You"}!`);
    playUnoTurnChime();
  }, [localUserName, localUserAvatar, onlineParticipants]);

  // Current active top card
  const topCard = discardPile[discardPile.length - 1];
  const activePlayer = players[currentTurnIndex];
  const isLocalTurn = activePlayer?.id === "local_user" && gameStatus === "playing";

  // Check valid card play
  const canPlayCard = useCallback((card: UnoCard) => {
    if (!topCard) return false;
    if (card.color === "wild") return true;
    if (card.color === activeColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  }, [topCard, activeColor]);

  // Advance turn helper
  const advanceTurn = useCallback((step: number = 1) => {
    setPlayers(prev => {
      return prev.map((p, idx) => {
        // Reset calledUno if they drew cards above 1
        if (p.hand.length > 1 && p.calledUno) {
          return { ...p, calledUno: false };
        }
        return p;
      });
    });

    setCurrentTurnIndex(prev => {
      const count = 4;
      const next = (prev + step * turnDirection + count * 10) % count;
      return next;
    });
  }, [turnDirection]);

  // Bot logic
  useEffect(() => {
    if (gameStatus !== "playing" || !activePlayer || !activePlayer.isBot) return;

    const timer = setTimeout(() => {
      // Bot turn
      const playableCards = activePlayer.hand.filter(canPlayCard);

      if (playableCards.length > 0) {
        // Pick best card
        const cardToPlay = playableCards[0];
        playCardForPlayer(currentTurnIndex, cardToPlay, "red"); // Bot auto picks red or dominant color
      } else {
        // Bot draws card
        drawCardForPlayer(currentTurnIndex);
      }
    }, 1600);

    return () => clearTimeout(timer);
  }, [gameStatus, currentTurnIndex, activePlayer, canPlayCard]);

  // Draw card handler
  const drawCardForPlayer = useCallback((playerIndex: number) => {
    if (deck.length === 0) {
      setStatusBanner("Deck reshuffled from discard pile!");
      return;
    }

    const newDeck = [...deck];
    const drawn = newDeck.pop();
    if (!drawn) return;

    playUnoCardPlay();

    setPlayers(prev => {
      const next = [...prev];
      const target = next[playerIndex];
      target.hand = [...target.hand, drawn];
      target.calledUno = false;
      return next;
    });

    setDeck(newDeck);
    const pName = players[playerIndex]?.name || "Player";
    setStatusBanner(`${pName} drew a card.`);
    advanceTurn(1);
  }, [deck, players, advanceTurn]);

  // Play card handler
  const playCardForPlayer = useCallback((playerIndex: number, card: UnoCard, chosenColor?: CardColor) => {
    const player = players[playerIndex];
    if (!player) return;

    playUnoCardPlay();

    // Check action effects
    let nextStep = 1;
    let newColor: CardColor = card.color === "wild" ? (chosenColor || "red") : card.color;

    // Remove card from player hand
    const remainingHand = player.hand.filter(c => c.id !== card.id);

    // Check WIN condition
    if (remainingHand.length === 0) {
      setWinner(player);
      setGameStatus("game_over");
      gameVictoryCelebration(player);
      return;
    }

    // Auto shout UNO for bots
    let playerCalledUno = player.calledUno;
    if (remainingHand.length === 1 && player.isBot) {
      playerCalledUno = true;
      playUnoShout();
      setStatusBanner(`🔥 ${player.name} shouts "UNO!"`);
    }

    // Apply special actions
    if (card.value === "skip") {
      nextStep = 2;
      setStatusBanner(`${player.name} played SKIP! Next player missed turn!`);
    } else if (card.value === "reverse") {
      setTurnDirection(d => (d === 1 ? -1 : 1) as 1 | -1);
      setStatusBanner(`${player.name} reversed game order! 🔄`);
    } else if (card.value === "draw2") {
      const nextPlayerIdx = (playerIndex + turnDirection + 4) % 4;
      applyDrawPenalty(nextPlayerIdx, 2);
      nextStep = 2; // skip them as well
      setStatusBanner(`${player.name} played +2! ${players[nextPlayerIdx]?.name} draws 2!`);
    } else if (card.value === "wild4") {
      const nextPlayerIdx = (playerIndex + turnDirection + 4) % 4;
      applyDrawPenalty(nextPlayerIdx, 4);
      nextStep = 2;
      setStatusBanner(`${player.name} played WILD +4! New color: ${newColor.toUpperCase()}`);
    } else if (card.value === "wild") {
      setStatusBanner(`${player.name} changed color to ${newColor.toUpperCase()}!`);
    } else {
      setStatusBanner(`${player.name} played ${card.color.toUpperCase()} ${card.value}`);
    }

    // Update state
    setPlayers(prev => {
      const next = [...prev];
      next[playerIndex] = {
        ...player,
        hand: remainingHand,
        calledUno: playerCalledUno,
      };
      return next;
    });

    setDiscardPile(prev => [...prev, card]);
    setActiveColor(newColor);
    advanceTurn(nextStep);
  }, [players, turnDirection, advanceTurn]);

  // Penalty drawer
  const applyDrawPenalty = (targetPlayerIndex: number, count: number) => {
    setPlayers(prev => {
      const next = [...prev];
      const target = next[targetPlayerIndex];
      const drawnCards = deck.slice(-count);
      target.hand = [...target.hand, ...drawnCards];
      target.calledUno = false;
      return next;
    });
    setDeck(prev => prev.slice(0, -count));
  };

  // Victory handler
  const gameVictoryCelebration = (victor: Player) => {
    playGameVictory();
    if (victor.id === "local_user") {
      addCash(50, "Won Uno Match 🏆");
      setStatusBanner(`🎉 VICTORY! You won the match and received 💵 $50 Echo Cash!`);
    } else {
      setStatusBanner(`🏆 ${victor.name} won the Uno match! Better luck next time.`);
    }
  };

  // Local card click
  const handleLocalCardClick = (card: UnoCard) => {
    if (!isLocalTurn) return;
    if (!canPlayCard(card)) {
      setStatusBanner("❌ That card cannot be played on the current card!");
      return;
    }

    if (card.color === "wild") {
      setPendingWildCard(card);
      setWildPickerOpen(true);
      return;
    }

    playCardForPlayer(0, card);
  };

  // Wild color selected
  const handleSelectWildColor = (c: CardColor) => {
    if (!pendingWildCard) return;
    setWildPickerOpen(false);
    playCardForPlayer(0, pendingWildCard, c);
    setPendingWildCard(null);
  };

  // Call UNO button for local player
  const handleCallUno = () => {
    const local = players[0];
    if (!local) return;
    if (local.hand.length <= 2) {
      setPlayers(prev => {
        const next = [...prev];
        next[0].calledUno = true;
        return next;
      });
      playUnoShout();
      setStatusBanner(`🔥 You shouted "UNO!" with pride!`);
    } else {
      setStatusBanner("⚠️ You can only shout UNO when you have 1 or 2 cards left!");
    }
  };

  // Catch someone who didn't shout UNO
  const handleCatchUno = () => {
    let caught = false;
    players.forEach((p, idx) => {
      if (p.hand.length === 1 && !p.calledUno && idx !== 0) {
        caught = true;
        applyDrawPenalty(idx, 2);
        setUnoCaughtToast(`🚨 CAUGHT ${p.name}! They forgot to shout UNO and drew +2 cards!`);
        setTimeout(() => setUnoCaughtToast(null), 4000);
      }
    });
    if (!caught) {
      setUnoCaughtToast("No players forgot to shout UNO right now!");
      setTimeout(() => setUnoCaughtToast(null), 2500);
    }
  };

  if (!isOpen) return null;

  const localP = players.find(p => p.position === "bottom");
  const leftP = players.find(p => p.position === "left");
  const acrossP = players.find(p => p.position === "across");
  const rightP = players.find(p => p.position === "right");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[760px] bg-slate-950 border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white select-none">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-red-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md">
              🃏
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Multiplayer Uno Table</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Prize: 💵 $50 Cash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Seated in: <span className="text-indigo-300 font-medium">{spaceTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {gameStatus === "playing" && (
              <button
                onClick={handleCatchUno}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-medium text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title="Catch an opponent who didn't shout UNO"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Catch Missed UNO
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Synchronized Host Party Music Bar (Seamless Spotify Player) */}
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80">
          <PartyMusicBar userHandle={localUserName} compact={true} />
        </div>

        {/* Game Arena / Table Canvas */}
        <div className="relative flex-1 bg-radial-at-c from-slate-900 via-slate-950 to-black p-4 flex flex-col items-center justify-between overflow-hidden">
          {/* Subtle Felt Card Table Oval Ring */}
          <div className="absolute inset-8 sm:inset-16 rounded-[120px] sm:rounded-[180px] border-4 border-slate-800/40 bg-gradient-to-b from-emerald-950/20 via-slate-950/40 to-emerald-950/20 pointer-events-none shadow-[inset_0_0_80px_rgba(16,185,129,0.05)]" />

          {/* Toast Notifier */}
          {unoCaughtToast && (
            <div className="absolute top-4 z-40 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xl animate-bounce flex items-center gap-2">
              <Flame className="w-4 h-4" />
              {unoCaughtToast}
            </div>
          )}

          {/* Top Opponent (Across from You) */}
          <div className="z-10 flex flex-col items-center pt-1">
            {acrossP && (
              <div className={`relative px-4 py-2 rounded-2xl flex items-center gap-3 transition duration-300 ${
                activePlayer?.position === "across"
                  ? "bg-indigo-500/20 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  : "bg-slate-900/60 border border-slate-800"
              }`}>
                <div className="relative">
                  {renderPlayerAvatar(acrossP.avatar, "🦊", "w-9 h-9 text-base")}
                  {acrossP.calledUno && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] shadow-sm animate-pulse">
                      UNO!
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{acrossP.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">(Across)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <span>🃏 {acrossP.hand.length} cards</span>
                    {activePlayer?.position === "across" && (
                      <span className="text-indigo-400 font-bold animate-pulse">• Thinking...</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle Row: Left Player, Center Discard/Draw Pile, Right Player */}
          <div className="w-full max-w-4xl flex items-center justify-between px-4 sm:px-12 z-10 my-auto">
            {/* Left Player (Virtual chair to your left) */}
            <div className="w-44">
              {leftP && (
                <div className={`relative p-3 rounded-2xl flex flex-col items-start gap-1 transition duration-300 ${
                  activePlayer?.position === "left"
                    ? "bg-indigo-500/20 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                    : "bg-slate-900/60 border border-slate-800"
                }`}>
                  <div className="flex items-center gap-2">
                    {renderPlayerAvatar(leftP.avatar, "🤖", "w-8 h-8 text-sm")}
                    <div>
                      <div className="text-xs font-semibold text-white">{leftP.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Left Chair 👈</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full mt-1 text-[11px] text-slate-300">
                    <span>🃏 {leftP.hand.length} cards</span>
                    {leftP.calledUno && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px]">
                        UNO!
                      </span>
                    )}
                  </div>
                  {activePlayer?.position === "left" && (
                    <span className="text-[10px] text-indigo-400 font-bold animate-pulse">Playing turn...</span>
                  )}
                </div>
              )}
            </div>

            {/* Center Table: Draw Pile & Discard Pile & Turn Indicator */}
            <div className="flex flex-col items-center">
              {gameStatus === "playing" && (
                <>
                  <div className="mb-2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs shadow-inner">
                    <span className="text-slate-400">Current Color:</span>
                    <span className={`w-3.5 h-3.5 rounded-full inline-block ${
                      activeColor === "red" ? "bg-red-500" :
                      activeColor === "blue" ? "bg-sky-500" :
                      activeColor === "green" ? "bg-emerald-500" : "bg-yellow-400"
                    }`} />
                    <span className="font-bold uppercase tracking-wider text-[10px] text-white">
                      {activeColor}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                      <RotateCw className={`w-3 h-3 ${turnDirection === 1 ? "rotate-0" : "-scale-x-100"}`} />
                      {turnDirection === 1 ? "Clockwise" : "Reverse"}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 sm:gap-7">
                    {/* Draw Pile */}
                    <button
                      onClick={() => isLocalTurn && drawCardForPlayer(0)}
                      disabled={!isLocalTurn}
                      className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border-2 border-indigo-400/40 flex flex-col items-center justify-center text-center shadow-xl transition transform ${
                        isLocalTurn
                          ? "hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-indigo-400/60"
                          : "opacity-75 cursor-not-allowed"
                      }`}
                    >
                      <div className="w-12 h-16 rounded-xl border border-indigo-300/30 flex items-center justify-center font-black text-indigo-300 text-lg">
                        UNO
                      </div>
                      <span className="text-[10px] text-slate-300 font-semibold mt-1">
                        Draw ({deck.length})
                      </span>
                    </button>

                    {/* Discard Pile (Top Card) */}
                    {topCard && (
                      <div className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-2xl ${COLOR_MAP[topCard.color].bg} border-2 ${COLOR_MAP[topCard.color].border} shadow-2xl flex flex-col items-center justify-between p-2 transform -rotate-2 select-none`}>
                        <span className="self-start text-xs font-black uppercase text-white/90">
                          {topCard.value}
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                          {topCard.value === "skip" ? "🚫" :
                           topCard.value === "reverse" ? "🔄" :
                           topCard.value === "draw2" ? "+2" :
                           topCard.value === "wild4" ? "+4" :
                           topCard.value === "wild" ? "🌈" : topCard.value}
                        </div>
                        <span className="self-end text-xs font-black uppercase text-white/90">
                          {topCard.value}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Banner Text */}
                  <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium text-center shadow-md">
                    {statusBanner}
                  </div>
                </>
              )}

              {gameStatus === "lobby" && (
                <div className="text-center p-6 bg-slate-900/70 border border-slate-800 rounded-3xl backdrop-blur-md max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg text-2xl">
                    🎴
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Uno Party Table</h3>
                  <p className="text-xs text-slate-400 mb-5">
                    Sit with friends or AI companions in your virtual room. First one to empty their hand wins 💵 $50!
                  </p>
                  <button
                    onClick={startNewGame}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-white shadow-lg shadow-emerald-500/25 active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Deal Cards & Start
                  </button>
                </div>
              )}

              {gameStatus === "game_over" && (
                <div className="text-center p-6 bg-slate-900/90 border border-indigo-500/40 rounded-3xl shadow-2xl backdrop-blur-md max-w-sm animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mx-auto mb-3 text-3xl">
                    🏆
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Game Over!</h3>
                  <p className="text-xs text-amber-300 font-semibold mb-4">
                    Winner: {winner?.name || "Player"}
                  </p>
                  <button
                    onClick={startNewGame}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>

            {/* Right Player (Virtual chair to your right) */}
            <div className="w-44">
              {rightP && (
                <div className={`relative p-3 rounded-2xl flex flex-col items-end gap-1 transition duration-300 ${
                  activePlayer?.position === "right"
                    ? "bg-indigo-500/20 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                    : "bg-slate-900/60 border border-slate-800"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">{rightP.name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Right Chair 👉</div>
                    </div>
                    {renderPlayerAvatar(rightP.avatar, "🐯", "w-8 h-8 text-sm")}
                  </div>
                  <div className="flex items-center justify-between w-full mt-1 text-[11px] text-slate-300">
                    {rightP.calledUno && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px]">
                        UNO!
                      </span>
                    )}
                    <span>🃏 {rightP.hand.length} cards</span>
                  </div>
                  {activePlayer?.position === "right" && (
                    <span className="text-[10px] text-indigo-400 font-bold animate-pulse">Playing turn...</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Area: You (Hand Cards & Controls) */}
          <div className="z-20 w-full max-w-4xl flex flex-col items-center">
            {/* Player Info Bar & Action Buttons */}
            <div className="w-full flex items-center justify-between px-4 mb-2">
              <div className="flex items-center gap-2">
                {renderPlayerAvatar(localP?.avatar, "👑", "w-7 h-7 text-xs")}
                <span className="text-xs font-bold text-white">{localUserName || "You"} (Table Seat)</span>
                {isLocalTurn && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold animate-pulse">
                    Your Turn! Play a card or draw
                  </span>
                )}
              </div>

              {gameStatus === "playing" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCallUno}
                    className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 fill-white" />
                    Shout "UNO!"
                  </button>
                </div>
              )}
            </div>

            {/* Your Hand (Horizontal Scroll / Card Arc) */}
            {localP && gameStatus === "playing" && (
              <div className="w-full overflow-x-auto pb-2 flex items-center justify-center gap-2 px-4 scrollbar-thin scrollbar-thumb-slate-700">
                {localP.hand.map((card) => {
                  const playable = isLocalTurn && canPlayCard(card);
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleLocalCardClick(card)}
                      disabled={!playable}
                      className={`relative flex-shrink-0 w-16 h-24 sm:w-20 sm:h-28 rounded-xl ${COLOR_MAP[card.color].bg} border-2 ${COLOR_MAP[card.color].border} p-1.5 flex flex-col items-center justify-between transition-all transform duration-150 ${
                        playable
                          ? "hover:-translate-y-3 cursor-pointer ring-2 ring-white/60 shadow-lg"
                          : "opacity-60 cursor-not-allowed scale-95"
                      }`}
                    >
                      <span className="self-start text-[10px] font-black uppercase text-white/90">
                        {card.value}
                      </span>
                      <div className="text-lg sm:text-xl font-black text-white drop-shadow">
                        {card.value === "skip" ? "🚫" :
                         card.value === "reverse" ? "🔄" :
                         card.value === "draw2" ? "+2" :
                         card.value === "wild4" ? "+4" :
                         card.value === "wild" ? "🌈" : card.value}
                      </div>
                      <span className="self-end text-[10px] font-black uppercase text-white/90">
                        {card.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wild Card Color Picker Modal */}
          {wildPickerOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="p-6 bg-slate-900 border border-slate-700 rounded-3xl text-center shadow-2xl max-w-xs">
                <h4 className="text-sm font-bold text-white mb-2">Pick a Wild Color</h4>
                <p className="text-xs text-slate-400 mb-4">Choose the color for the next turns:</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["red", "blue", "green", "yellow"] as CardColor[]).map(c => (
                    <button
                      key={c}
                      onClick={() => handleSelectWildColor(c)}
                      className={`py-3 rounded-xl font-bold uppercase text-xs text-white ${COLOR_MAP[c].bg} shadow-md hover:scale-105 active:scale-95 transition`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
