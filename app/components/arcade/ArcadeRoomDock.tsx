"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import {
  joinArcadeMatch,
  leaveArcadeMatch,
  subscribeArcadeMatch,
  sendArcadeChatMessage,
  type ArcadeMatch,
  type ArcadeGameType,
} from "@/lib/arcade";
import LudoGame from "./LudoGame";
import ChessGame from "./ChessGame";
import Connect4Game from "./Connect4Game";
import SudokuGame from "./SudokuGame";
import Game2048 from "./Game2048";
import WordleGame from "./WordleGame";
import PoolGame from "./PoolGame";
import CarromGame from "./CarromGame";
import GlowHockeyGame from "./GlowHockeyGame";
import DotsAndBoxesGame from "./DotsAndBoxesGame";
import SnakesLaddersGame from "./SnakesLaddersGame";
import Puzzle15Game from "./Puzzle15Game";
import PokerGame from "./PokerGame";
import BlackjackGame from "./BlackjackGame";
import UnoGame from "./UnoGame";
import LiarsDiceGame from "./LiarsDiceGame";
import CodenamesGame from "./CodenamesGame";
import SkribblGame from "./SkribblGame";
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
import RummyGame from "./RummyGame";
import CallBreakGame from "./CallBreakGame";
import TeenPattiGame from "./TeenPattiGame";
import SattePeSattaGame from "./SattePeSattaGame";
import CheatBluffGame from "./CheatBluffGame";
import VoicePartyLounge from "./VoicePartyLounge";
import VoiceMechanicGames from "./VoiceMechanicGames";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeCreateModal from "./ArcadeCreateModal";
import ArcadeGameRulesModal from "./ArcadeGameRulesModal";
import ArcadeTournamentBracketModal from "./ArcadeTournamentBracketModal";
import ChallengeLauncherModal from "./ChallengeLauncherModal";
import LiveVoiceFilterDock from "./LiveVoiceFilterDock";
import { soundSynth } from "@/lib/soundSynthesizer";
import { useRoomAudio } from "@/lib/context/RoomAudioContext";
import { promoteToSpeaker, demoteFromSpeaker, subscribeToRoom, type Room } from "@/lib/rooms";
import {
  Gamepad2,
  X,
  Users,
  Trophy,
  Play,
  Sparkles,
  Share2,
  Mic,
  MicOff,
  Mic2,
  HelpCircle,
  Swords,
  Crown,
  Flame,
  Radio,
  Send,
  MessageSquare,
  ThumbsUp,
  Volume2,
  Check,
} from "lucide-react";

interface ArcadeRoomDockProps {
  roomId: string;
  isHost: boolean;
}

const CATEGORIZED_GAMES = [
  { id: "ludo", name: "🎲 LUDO", cat: "TACTICAL" },
  { id: "chess", name: "♟️ CHESS", cat: "TACTICAL" },
  { id: "pool", name: "🎱 8-BALL POOL", cat: "PHYSICS" },
  { id: "carrom", name: "⚪ CARROM", cat: "PHYSICS" },
  { id: "rummy", name: "🃏 RUMMY", cat: "CARD" },
  { id: "teen_patti", name: "🔥 TEEN PATTI", cat: "CARD" },
  { id: "call_break", name: "♠️ CALL BREAK", cat: "CARD" },
  { id: "uno", name: "🎴 UNO", cat: "CARD" },
  { id: "hand_cricket", name: "🏏 HAND CRICKET", cat: "PAPER" },
  { id: "raja_mantri", name: "👑 RAJA MANTRI", cat: "PAPER" },
  { id: "connect4", name: "🔴 CONNECT 4", cat: "TACTICAL" },
  { id: "skribbl", name: "🎨 SKRIBBL", cat: "PARTY" },
  { id: "codenames", name: "🕵️ CODENAMES", cat: "PARTY" },
  { id: "liars_dice", name: "🎲 LIAR'S DICE", cat: "CARD" },
  { id: "glow_hockey", name: "⚡ GLOW HOCKEY", cat: "PHYSICS" },
];

export default function ArcadeRoomDock({ roomId, isHost }: ArcadeRoomDockProps) {
  const { user } = useAuth();
  const { isMuted, toggleMic, role, speakingUids } = useRoomAudio();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<ArcadeMatch | null>(null);
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<ArcadeGameType>("ludo");
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ALL");

  // Modals & Sub-drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [voicePartyOpen, setVoicePartyOpen] = useState(false);
  const [twisterOpen, setTwisterOpen] = useState(false);

  // Spectator prediction vote state (e.g. Vote Player 1 vs Player 2)
  const [votedSeat, setVotedSeat] = useState<number | null>(null);
  const [voteStats, setVoteStats] = useState<{ [seat: number]: number }>({ 0: 4, 1: 3 });

  // In-Game Live Reaction Chat
  const [chatInput, setChatInput] = useState("");
  const [showChatBox, setShowChatBox] = useState(false);

  // Auto-open if matchId URL param exists
  useEffect(() => {
    const paramMatchId = searchParams.get("matchId");
    if (paramMatchId) {
      setActiveMatchId(paramMatchId);
      setIsOpen(true);
    }
  }, [searchParams]);

  // Subscribe to parent room to detect when host launches a game
  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToRoom(roomId, (data) => {
      if (data) {
        setRoomData(data);
        if (data.activeGame?.matchId && data.activeGame.status !== "FINISHED") {
          setActiveMatchId(data.activeGame.matchId);
          setIsOpen(true);
        }
      }
    });
    return () => unsub();
  }, [roomId]);

  // Subscribe to match if matchId is set
  useEffect(() => {
    if (!activeMatchId) return;
    const unsub = subscribeArcadeMatch(activeMatchId, (data) => {
      setMatch(data);
    });
    return () => unsub();
  }, [activeMatchId]);

  const handleTakeChair = async () => {
    if (!user || !activeMatchId) return;
    soundSynth.playSnare();
    try {
      await joinArcadeMatch(activeMatchId, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        avatar: user.photoUrl || user.photoURL,
      });
      // Promote user to speaker in the room so their microphone is activated immediately!
      await promoteToSpeaker(roomId, user.uid);
      if (isMuted) {
        try {
          await toggleMic();
        } catch {}
      }
    } catch (e) {
      console.error("Failed to take chair:", e);
    }
  };

  const handleLeaveChair = async () => {
    if (!user || !activeMatchId) return;
    soundSynth.playSubtlePop();
    try {
      await leaveArcadeMatch(activeMatchId, user.uid);
      if (!isHost) {
        try {
          await demoteFromSpeaker(roomId, user.uid);
        } catch {}
      }
    } catch (e) {
      console.error("Failed to leave chair:", e);
    }
  };

  const handleSendReaction = (type: string, sound: () => void) => {
    sound();
    if (user && activeMatchId) {
      sendArcadeChatMessage(
        activeMatchId,
        { uid: user.uid, handle: user.handle || "@ANON", avatar: user.photoUrl || user.photoURL },
        `[ REACTION: ${type} ]`
      );
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !activeMatchId) return;
    soundSynth.playSubtlePop();
    await sendArcadeChatMessage(
      activeMatchId,
      { uid: user.uid, handle: user.handle || "@ANON", avatar: user.photoUrl || user.photoURL },
      chatInput.trim()
    );
    setChatInput("");
  };

  const isUserSeated = user && match?.players && !!match.players[user.uid];
  const playersList = Object.values(match?.players || {});
  const maxSeats = match?.maxPlayers || 4;
  const isMeSpeaking = user && speakingUids.has(user.uid);

  if (!isOpen) {
    return (
      <div className="w-full bg-neutral-950 border-2 border-neutral-800 p-3 rounded-none flex items-center justify-between shadow-lg select-none">
        <div className="flex items-center gap-2 text-xs">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold uppercase tracking-widest text-white">
            // STAGE GAMING & VOICE PARTY DOCK
          </span>
          {match && (
            <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase rounded">
              {match.title || match.gameType.toUpperCase()} ({playersList.length}/{maxSeats})
            </span>
          )}
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            • HOST MATCHES, TAKE SEATS, SPECTATE & VOTE LIVE ON STAGE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isUserSeated && match && playersList.length < maxSeats && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                handleTakeChair();
              }}
              className="px-3 py-1.5 border border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-black font-black font-mono text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span>🪑 TAKE A SEAT</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-4 py-1.5 border-2 border-white bg-white text-black hover:bg-black hover:text-white font-extrabold font-mono text-xs uppercase transition-all active:scale-95 cursor-pointer shadow-md"
          >
            [ 🎮 {match ? "OPEN GAME TABLE" : "LAUNCH STAGE GAMES"} ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black border-2 border-white p-4 font-mono text-white space-y-4 shadow-[0_0_40px_rgba(255,255,255,0.15)] select-none">
      {/* ── STAGE DOCK HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-white pb-2">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-white animate-pulse" />
          <span className="font-extrabold text-xs uppercase tracking-widest text-white">
            // LIVE STAGE ARENA
          </span>
          {match && (
            <span className="text-[10px] text-yellow-400 border border-yellow-800 bg-yellow-950/40 px-1.5 py-0.5">
              {match.title || match.gameType.toUpperCase()}
            </span>
          )}
          {/* Live Seated Mic Status Indicator & Toggle */}
          {isUserSeated ? (
            <button
              type="button"
              onClick={toggleMic}
              className={`px-2 py-0.5 text-[10px] font-black uppercase rounded flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                isMuted
                  ? "border border-red-700 bg-red-950/60 text-red-300 hover:bg-red-900"
                  : "border border-emerald-400 bg-emerald-500 text-black hover:bg-emerald-400"
              }`}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-3 h-3 text-red-400" />
                  <span>[ MIC MUTED • TAP TO TALK ]</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-black animate-pulse" />
                  <span>[ 🎙️ MIC ON • TALKING LIVE ]</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 hidden sm:inline flex items-center gap-1">
              <Mic2 className="w-2.5 h-2.5" />
              <span>ROOM VOICE LIVE</span>
            </span>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Voice Party Toggle */}
          <button
            type="button"
            onClick={() => {
              setVoicePartyOpen(!voicePartyOpen);
              soundSynth.playSubtlePop();
            }}
            className={`px-2 py-1 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              voicePartyOpen
                ? "border-purple-400 bg-purple-400 text-black"
                : "border-purple-800 bg-purple-950/40 text-purple-300 hover:border-purple-400"
            }`}
            title="10-Game Voice Party Arenas"
          >
            <Mic2 className="w-3 h-3 text-purple-400" />
            <span>[ 🎙️ VOICE PARTY ]</span>
          </button>

          {/* Tongue Twisters Toggle */}
          <button
            type="button"
            onClick={() => {
              setTwisterOpen(!twisterOpen);
              soundSynth.playSubtlePop();
            }}
            className={`px-2 py-1 border font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer ${
              twisterOpen
                ? "border-amber-400 bg-amber-400 text-black"
                : "border-amber-800 bg-amber-950/40 text-amber-300 hover:border-amber-400"
            }`}
            title="1v1 Tongue Twister Duel"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>[ 👅 TWISTERS ]</span>
          </button>

          {/* Room Tournament Bracket */}
          <button
            type="button"
            onClick={() => {
              setTournamentOpen(true);
              soundSynth.playFanfare();
            }}
            className="px-2 py-1 border border-amber-400 bg-amber-950/40 text-amber-300 hover:bg-amber-400 hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Trophy className="w-3 h-3" />
            <span>[ 🏆 TOURNAMENT ]</span>
          </button>

          {/* 1v1 Trash-Talk Duel */}
          <button
            type="button"
            onClick={() => {
              setChallengeOpen(true);
              soundSynth.playSnare();
            }}
            className="px-2 py-1 border border-rose-600 bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <Swords className="w-3 h-3" />
            <span>[ ⚔️ 1v1 DUEL ]</span>
          </button>

          {/* Master Rules */}
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="px-2 py-1 border border-neutral-700 bg-black text-neutral-400 hover:border-white hover:text-white font-extrabold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
            <span>[ ❓ RULES ]</span>
          </button>

          {/* Minimize / Close */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white p-1 cursor-pointer border border-neutral-800 hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── VOICE PARTY SUITE (10 MODES) ── */}
      {voicePartyOpen && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <VoicePartyLounge
            currentUid={user?.uid || ""}
            userHandle={user?.handle || "@PLAYER"}
          />
        </div>
      )}

      {/* ── 1v1 TONGUE TWISTER SPRINT DUEL ── */}
      {twisterOpen && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-200">
          <VoiceMechanicGames
            userHandle={user?.handle || "@YOU"}
            friendHandle="@FRIEND"
          />
        </div>
      )}

      {/* ── STAGE PODIUM / CHAIRS ("TAKE THE CHAIR") ── */}
      {match && (
        <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold border-b border-neutral-900 pb-2">
            <span className="text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-400" />
              <span>STAGE CHAIRS ({playersList.length}/{maxSeats} SEATED):</span>
            </span>

            {/* Take / Leave Chair Action */}
            {isUserSeated ? (
              <button
                type="button"
                onClick={handleLeaveChair}
                className="px-2.5 py-1 bg-red-950 border border-red-700 text-red-300 hover:bg-red-900 text-[10px] font-bold uppercase rounded cursor-pointer transition-all"
              >
                [ 🚪 LEAVE CHAIR (SPECTATE) ]
              </button>
            ) : playersList.length < maxSeats ? (
              <button
                type="button"
                onClick={handleTakeChair}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase rounded cursor-pointer transition-all shadow-md active:scale-95"
              >
                [ 🪑 TAKE THE CHAIR TO PLAY ]
              </button>
            ) : (
              <span className="text-[10px] text-neutral-500 uppercase">ALL CHAIRS OCCUPIED</span>
            )}
          </div>

          {/* Visual Chair Slots */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: maxSeats }).map((_, idx) => {
              const seatedPlayer = playersList[idx];
              const isMe = seatedPlayer && seatedPlayer.uid === user?.uid;
              const isMatchHost = seatedPlayer && seatedPlayer.uid === match.hostUid;

              return (
                <div
                  key={idx}
                  className={`p-2.5 border rounded-lg flex items-center justify-between transition-all ${
                    seatedPlayer
                      ? isMe
                        ? "border-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-400"
                        : "border-neutral-700 bg-black"
                      : "border-neutral-900 bg-neutral-950/60 border-dashed"
                  }`}
                >
                  <div className="truncate space-y-0.5">
                    <div className="text-[9px] text-neutral-400 font-bold uppercase">
                      CHAIR #{idx + 1} {isMatchHost && "👑 HOST"}
                    </div>
                    <div className="text-xs font-black text-white truncate">
                      {seatedPlayer ? seatedPlayer.handle : "[ EMPTY SEAT ]"}
                    </div>
                  </div>

                  {!seatedPlayer && !isUserSeated && (
                    <button
                      type="button"
                      onClick={handleTakeChair}
                      className="text-[9px] font-bold px-2 py-1 bg-white text-black hover:bg-neutral-200 uppercase rounded cursor-pointer"
                    >
                      SIT
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN STAGE: GAME SELECTOR OR ACTIVE MATCH ── */}
      {!match ? (
        <div className="space-y-4">
          <p className="text-[11px] text-neutral-300 uppercase tracking-wider">
            Room Host: Select and start any game table on stage. Seated users play while the room audience spectates, votes, and reacts!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIZED_GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGameType(g.id as ArcadeGameType)}
                className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                  selectedGameType === g.id
                    ? "border-white bg-neutral-900 text-white font-extrabold ring-1 ring-white"
                    : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600"
                }`}
              >
                <div className="text-xs uppercase font-extrabold text-white">{g.name}</div>
                <div className="text-[9px] text-neutral-400">{g.cat}</div>
              </button>
            ))}
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
          {/* Decoupled Live Voice Filters & Reaction Soundboard */}
          <LiveVoiceFilterDock />

          {/* Active Game Renderers */}
          {match.gameType === "rummy" && (
            <RummyGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "call_break" && (
            <CallBreakGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "teen_patti" && (
            <TeenPattiGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "satte_pe_satta" && (
            <SattePeSattaGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "cheat_bluff" && (
            <CheatBluffGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
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
          {match.gameType === "dots_and_boxes" && (
            <DotsAndBoxesGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "snakes_and_ladders" && (
            <SnakesLaddersGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "connect4" && (
            <Connect4Game match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "sudoku" && (
            <SudokuGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "2048" && (
            <Game2048 match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "wordle" && (
            <WordleGame match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}
          {match.gameType === "puzzle15" && (
            <Puzzle15Game match={match} currentUid={user?.uid || ""} isHost={isHost} />
          )}

          {/* ── SPECTATOR / AUDIENCE GALLERY CONTROLS ── */}
          <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-400 uppercase flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-white" />
                <span>AUDIENCE GALLERY (REACTIONS & LIVE VOTING):</span>
              </span>

              <button
                type="button"
                onClick={() => setShowChatBox(!showChatBox)}
                className="text-[10px] text-cyan-400 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{showChatBox ? "HIDE CHAT" : "OPEN IN-STAGE CHAT"}</span>
              </button>
            </div>

            {/* Instant Spectator Soundboard & Emoji Reaction Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => handleSendReaction("CLUTCH", () => soundSynth.playApplause())}
                className="px-2.5 py-1.5 bg-black border border-neutral-800 hover:border-yellow-400 text-yellow-300 font-bold uppercase rounded text-[10px] whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                🔥 CLUTCH
              </button>
              <button
                type="button"
                onClick={() => handleSendReaction("WAAH WAAH", () => soundSynth.playFanfare())}
                className="px-2.5 py-1.5 bg-black border border-neutral-800 hover:border-cyan-400 text-cyan-300 font-bold uppercase rounded text-[10px] whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                👏 WAAH WAAH
              </button>
              <button
                type="button"
                onClick={() => handleSendReaction("RIP", () => soundSynth.playBuzzer())}
                className="px-2.5 py-1.5 bg-black border border-neutral-800 hover:border-rose-500 text-rose-400 font-bold uppercase rounded text-[10px] whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                💀 RIP
              </button>
              <button
                type="button"
                onClick={() => handleSendReaction("AIRHORN", () => soundSynth.playAirhorn())}
                className="px-2.5 py-1.5 bg-black border border-neutral-800 hover:border-purple-400 text-purple-300 font-bold uppercase rounded text-[10px] whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                📢 AIRHORN
              </button>
              <button
                type="button"
                onClick={() => handleSendReaction("50 RS CUT", () => soundSynth.playGong())}
                className="px-2.5 py-1.5 bg-black border border-neutral-800 hover:border-red-500 text-red-400 font-bold uppercase rounded text-[10px] whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                📉 50 RS CUT
              </button>
            </div>

            {/* Audience Prediction / Cheer Vote Bar */}
            {playersList.length >= 2 && (
              <div className="bg-black border border-neutral-900 p-2.5 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-bold">
                  <span>AUDIENCE PREDICTION POLL:</span>
                  <span>{votedSeat !== null ? "VOTE REGISTERED ✅" : "TAP PLAYER TO VOTE"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setVotedSeat(0);
                      setVoteStats((v) => ({ ...v, 0: (v[0] || 0) + 1 }));
                      soundSynth.playSubtlePop();
                    }}
                    className={`p-2 border rounded-lg font-bold text-left transition-all ${
                      votedSeat === 0
                        ? "border-emerald-400 bg-emerald-950 text-white"
                        : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <div className="truncate font-black">{playersList[0]?.handle || "PLAYER 1"}</div>
                    <div className="text-[9px] text-emerald-400">{voteStats[0] || 0} CHEERS</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVotedSeat(1);
                      setVoteStats((v) => ({ ...v, 1: (v[1] || 0) + 1 }));
                      soundSynth.playSubtlePop();
                    }}
                    className={`p-2 border rounded-lg font-bold text-left transition-all ${
                      votedSeat === 1
                        ? "border-cyan-400 bg-cyan-950 text-white"
                        : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <div className="truncate font-black">{playersList[1]?.handle || "PLAYER 2"}</div>
                    <div className="text-[9px] text-cyan-400">{voteStats[1] || 0} CHEERS</div>
                  </button>
                </div>
              </div>
            )}

            {/* In-Stage Chat Drawer */}
            {showChatBox && (
              <form onSubmit={handleSendChat} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="DROP SPECTATOR REACTION MESSAGE ON STAGE..."
                  className="flex-1 bg-black border border-neutral-800 focus:border-white px-3 py-1.5 text-xs text-white uppercase outline-none font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-white text-black font-black text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>SEND</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

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

      {/* Room Tournament Bracket Modal */}
      <ArcadeTournamentBracketModal
        isOpen={tournamentOpen}
        onClose={() => setTournamentOpen(false)}
        gameType={match?.gameType || selectedGameType}
        hostUid={user?.uid || ""}
        currentUid={user?.uid || ""}
      />

      {/* 1v1 Challenge Launcher Modal */}
      {user && (
        <ChallengeLauncherModal
          isOpen={challengeOpen}
          onClose={() => setChallengeOpen(false)}
          gameType={match?.gameType || selectedGameType}
          gameName={(match?.gameType || selectedGameType).toUpperCase()}
          roomId={roomId}
          matchId={activeMatchId || `room_${roomId}`}
          user={{
            uid: user.uid,
            handle: user.handle || "@ANON",
            photoUrl: user.photoUrl || user.photoURL,
          }}
        />
      )}
    </div>
  );
}
