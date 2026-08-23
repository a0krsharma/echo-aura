"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
  joinArcadeMatch,
  subscribeArcadeMatch,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import LudoGame from "./LudoGame";
import ChessGame from "./ChessGame";
import Connect4Game from "./Connect4Game";
import BattleshipGame from "./BattleshipGame";
import SudokuGame from "./SudokuGame";
import MinesweeperGame from "./MinesweeperGame";
import Game2048 from "./Game2048";
import SnakeGame from "./SnakeGame";
import WordleGame from "./WordleGame";
import PoolGame from "./PoolGame";
import CarromGame from "./CarromGame";
import GlowHockeyGame from "./GlowHockeyGame";
import GomokuGame from "./GomokuGame";
import ReversiGame from "./ReversiGame";
import DotsAndBoxesGame from "./DotsAndBoxesGame";
import SnakesLaddersGame from "./SnakesLaddersGame";
import Puzzle15Game from "./Puzzle15Game";
import MastermindGame from "./MastermindGame";
import PokerGame from "./PokerGame";
import BlackjackGame from "./BlackjackGame";
import UnoGame from "./UnoGame";
import LiarsDiceGame from "./LiarsDiceGame";
import CodenamesGame from "./CodenamesGame";
import SkribblGame from "./SkribblGame";
import TriviaGame from "./TriviaGame";
import QuoridorGame from "./QuoridorGame";
import YahtzeeGame from "./YahtzeeGame";
import MelodyBuzzerGame from "./MelodyBuzzerGame";
import TabooGame from "./TabooGame";
import PitchArenaGame from "./PitchArenaGame";
import TwentyQuestionsGame from "./TwentyQuestionsGame";
import RajaMantriGame from "./RajaMantriGame";
import HandCricketGame from "./HandCricketGame";
import BookCricketGame from "./BookCricketGame";
import BingoGame from "./BingoGame";
import NPATGame from "./NPATGame";
import TwoTruthsGame from "./TwoTruthsGame";
import HangmanGame from "./HangmanGame";
import MathBlitzGame from "./MathBlitzGame";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeCreateModal from "./ArcadeCreateModal";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import { Gamepad2, X, Users, Trophy, Play, Sparkles, Share2, Mic2, HelpCircle } from "lucide-react";

interface ArcadeRoomDockProps {
  roomId: string;
  isHost: boolean;
}

export default function ArcadeRoomDock({ roomId, isHost }: ArcadeRoomDockProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<ArcadeMatch | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<ArcadeGameType>("poker");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Auto-open if matchId URL param exists
  useEffect(() => {
    const paramMatchId = searchParams.get("matchId");
    if (paramMatchId) {
      setActiveMatchId(paramMatchId);
      setIsOpen(true);
    }
  }, [searchParams]);

  // Subscribe to match if matchId is set
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

  const handleJoinGame = async () => {
    if (!user || !activeMatchId) return;
    try {
      await joinArcadeMatch(activeMatchId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        avatar: user.photoUrl || user.photoURL,
      });
    } catch (e) {
      console.error("Failed to join match:", e);
    }
  };

  if (!isOpen) {
    return (
      <div className="w-full bg-neutral-950 border-2 border-neutral-800 p-3 rounded-none flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-xs">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // SOCIAL GAMING DOCK
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            • VOICE BLUFFING, CARD PROTOCOLS & 2D PHYSICS ON STAGE
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-1.5 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-extrabold font-mono text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-md"
        >
          [ 🎮 LAUNCH GAME ARENA ]
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-black border-2 border-white p-4 font-mono text-white space-y-4 shadow-[0_0_30px_rgba(255,255,255,0.15)] select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold text-xs uppercase tracking-widest text-white">
            // LIVE STAGE GAMING ARENA
          </span>
          <span className="text-[10px] text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 hidden sm:inline flex items-center gap-1">
            <Mic2 className="w-2.5 h-2.5" />
            <span>VOICE CONNECTED</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2 py-1 border border-emerald-400 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-400 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>[ ❓ RULES ]</span>
          </button>
          {match && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="px-2.5 py-1 border border-white bg-black hover:bg-white hover:text-black font-extrabold uppercase text-[10px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>[ 🔗 INVITE PLAYERS & TALK 🎙️ ]</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white p-1 cursor-pointer border border-neutral-800 hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!match ? (
        <div className="space-y-4">
          <p className="text-[11px] text-neutral-300 uppercase tracking-wider">
            Project any game table directly above the live stage. Everyone in the room can play and talk simultaneously!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelectedGameType("poker")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "poker"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">♠️ POKER</div>
              <div className="text-[9px] text-neutral-400">Texas Hold'em Table</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("uno")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "uno"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🎴 UNO MATRIX</div>
              <div className="text-[9px] text-neutral-400">Flow Override Cards</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("liars_dice")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "liars_dice"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🎲 LIAR'S DICE</div>
              <div className="text-[9px] text-neutral-400">Voice Bluffing Tray</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("skribbl")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "skribbl"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🎨 SKRIBBL</div>
              <div className="text-[9px] text-neutral-400">Live Vector Canvas</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("codenames")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "codenames"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🕵️ CODENAMES</div>
              <div className="text-[9px] text-neutral-400">5x5 Decryption Grid</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("pool")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "pool"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">🎱 8-BALL POOL</div>
              <div className="text-[9px] text-neutral-400">2D Physics Table</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("carrom")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "carrom"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">⚪ CARROM</div>
              <div className="text-[9px] text-neutral-400">Striker Physics</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedGameType("glow_hockey")}
              className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                selectedGameType === "glow_hockey"
                  ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                  : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs uppercase font-extrabold text-white">⚡ GLOW HOCKEY</div>
              <div className="text-[9px] text-neutral-400">Air Hockey Clash</div>
            </button>
          </div>

          <button
            type="button"
            disabled={!user}
            onClick={() => setCreateModalOpen(true)}
            className="w-full py-3 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-mono font-extrabold text-xs uppercase transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-xl"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>[ CONFIGURE & START {selectedGameType.toUpperCase()} ON STAGE ]</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Game Renderers */}
          {match.gameType === "poker" && (
            <PokerGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "blackjack" && (
            <BlackjackGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "uno" && (
            <UnoGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "liars_dice" && (
            <LiarsDiceGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "codenames" && (
            <CodenamesGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "skribbl" && (
            <SkribblGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "trivia" && (
            <TriviaGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "quoridor" && (
            <QuoridorGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "yahtzee" && (
            <YahtzeeGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "taboo" && (
            <TabooGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "melody_buzzer" && (
            <MelodyBuzzerGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "pitch_arena" && (
            <PitchArenaGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "twenty_questions" && (
            <TwentyQuestionsGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "raja_mantri" && (
            <RajaMantriGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "hand_cricket" && (
            <HandCricketGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "book_cricket" && (
            <BookCricketGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "bingo" && (
            <BingoGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "npat" && (
            <NPATGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "two_truths" && (
            <TwoTruthsGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "hangman" && (
            <HangmanGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "math_blitz" && (
            <MathBlitzGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "ludo" && (
            <LudoGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "pool" && (
            <PoolGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "carrom" && (
            <CarromGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "glow_hockey" && (
            <GlowHockeyGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "chess" && (
            <ChessGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "gomoku" && (
            <GomokuGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "reversi" && (
            <ReversiGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "dots_and_boxes" && (
            <DotsAndBoxesGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "snakes_and_ladders" && (
            <SnakesLaddersGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "connect4" && (
            <Connect4Game match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "battleship" && (
            <BattleshipGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "sudoku" && (
            <SudokuGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "minesweeper" && (
            <MinesweeperGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "2048" && (
            <Game2048 match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "snake" && (
            <SnakeGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "wordle" && (
            <WordleGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "puzzle15" && (
            <Puzzle15Game match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "mastermind" && (
            <MastermindGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}

          {/* Join button if spectator */}
          {user && !match?.players?.[user.uid] && match?.status !== "FINISHED" && (
            <button
              type="button"
              onClick={handleJoinGame}
              className="w-full py-2.5 bg-neutral-950 border-2 border-white hover:bg-white hover:text-black font-extrabold text-xs uppercase transition-all cursor-pointer"
            >
              [ 🎮 JOIN THIS MATCH AS PLAYER ]
            </button>
          )}
        </div>
      )}

      {/* Match Create Modal */}
      {user && (
        <ArcadeCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          user={{
            uid: user.uid,
            handle: user.handle || "@ANON",
            photoUrl: user.photoUrl || user.photoURL,
          }}
          defaultGameType={selectedGameType}
          roomId={roomId}
          onMatchCreated={(matchId) => {
            setActiveMatchId(matchId);
          }}
        />
      )}

      {/* Invite Modal */}
      {match && (
        <ArcadeInviteModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          match={match}
        />
      )}

      {/* Master Rules Modal */}
      <ArcadeGameRulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        initialGameType={match?.gameType || selectedGameType}
      />
    </div>
  );
}
