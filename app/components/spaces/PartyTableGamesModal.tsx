"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  AlertCircle,
  Dices,
  Crown,
  Shield,
  HelpCircle,
  Music,
  Heart,
  Smile,
  Mic,
  Coins,
  Send,
  Radio,
  Flame as FireIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PartyMusicBar } from "./PartyMusicBar";
import { RealisticLudoBoard } from "./RealisticLudoBoard";
import { partyMusicEngine, PARTY_PLAYLIST } from "@/lib/partyMusicEngine";
import { addCash } from "@/lib/spacesEconomy";
import { SpaceTableGameLiveState } from "@/lib/spaces";
import {
  spacesSfx,
  playGameVictory,
  playChampagneCork,
  playCashRegister,
} from "@/lib/spacesSfx";

export type PartyGameTab = "ludo" | "bottle" | "rps" | "antakshari" | "raja_mantri" | "uno";

interface SeatedPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  position: "bottom" | "left" | "across" | "right";
  color: string;
}

interface PartyTableGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceTitle: string;
  localUserName: string;
  localUserAvatar?: string;
  onlineParticipants: Array<{ uid: string; displayName: string; photoURL?: string }>;
  initialTab?: PartyGameTab;
  onOpenUno?: () => void;
  onOpenTeleparty?: () => void;
  spotifySyncState?: any;
  onUpdateSpotifySync?: (sync: any) => void;
  onBroadcastSpeech?: (text: string) => void;
  liveTableState?: SpaceTableGameLiveState | null;
  onUpdateTableGame?: (updates: Partial<SpaceTableGameLiveState>) => void;
}

// ─────────────────────────────────────────────────────────────
// TRUTH OR DARE CARDS
// ─────────────────────────────────────────────────────────────
const TRUTH_CARDS = [
  "What is the most embarrassing song in your Spotify on repeat?",
  "Have you ever stalked an ex at 3 AM on Instagram?",
  "Who at this virtual table would survive a zombie apocalypse the longest?",
  "What's the weirdest food combo you secretly love (like Maggie with ketchup)?",
  "If you had to trade lives with someone in this room for 24 hours, who would it be?",
  "What was the biggest lie you ever told your parents to go to a party?",
  "Have you ever accidentally texted someone about them, to them?",
  "What's your most useless talent that nobody knows about?",
  "Rate your own dance skills on Bollywood songs from 1 to 10 honestly.",
  "What is your guilty pleasure TV show or movie?",
];

const DARE_CARDS = [
  "Sing the chorus of 'Kala Chashma' in your deepest radio announcer voice!",
  "Do your best impression of Shah Rukh Khan's signature open-arms pose on webcam!",
  "Send a message in room chat typing only using your nose!",
  "Talk in an exaggerated British accent for the next 2 rounds of gameplay.",
  "Drop 5 virtual cakes or drinks on whoever is seated across from you right now!",
  "Do 10 rapid jumping jacks or shoulder shrugs right now!",
  "Invent a 10-second rap about whoever is sitting to your left.",
  "Put on the silliest sunglasses or virtual emoji hat for the rest of this party!",
  "Admit who is the best-dressed avatar in this space right now!",
  "Shout 'ECHO PARTY ZINDABAD!' into your microphone!",
];

// ─────────────────────────────────────────────────────────────
// ANTAKSHARI PROMPTS & SUGGESTIONS
// ─────────────────────────────────────────────────────────────
const ANTAKSHARI_LETTERS = ["M", "B", "K", "D", "P", "R", "S", "T", "L", "H", "A", "N", "J"];

const SONG_SUGGESTIONS: Record<string, string[]> = {
  M: ["Mehndi Laga Ke Rakhna", "Main Nikla Gaddi Leke", "Mundian To Bach Ke", "Mere Samne Wali Khidki"],
  B: ["Badtameez Dil", "Bole Chudiyan", "Balam Pichkari", "Baar Baar Dekho"],
  K: ["Kala Chashma", "Kesariya Tera Ishq Hai Piya", "Kabhi Khushi Kabhie Gham", "Kabira Maan Ja"],
  D: ["Dhoom Machale Dhoom", "Dil Chahta Hai", "Deewangi Deewangi", "Desi Girl"],
  P: ["Pee Loon Tere Neelay Neelay", "Proper Patola", "Pehla Nasha", "Pal Pal Dil Ke Paas"],
  R: ["Raabta Kehte Hain", "Rang Barse Bheege", "Roop Tera Mastana", "Radha Kaise Na Jale"],
  S: ["Subah Hone Na De", "Sooraj Dooba Hai", "Senorita", "Sauda Khara Khara"],
  T: ["Tum Hi Ho Bandhu", "Tera Ghata", "Tujhe Dekha Toh Yeh Jaana Sanam", "Tum Se Hi"],
  L: ["Lover - Diljit Dosanjh", "London Thumakda", "Lungi Dance", "Lagdi Lahore Di"],
  H: ["Hawa Hawa", "Humma Humma", "Hookah Bar", "Hawayein"],
  A: ["Apna Bana Le", "Aankh Marey", "Abhi Toh Party Shuru Hui Hai", "Apna Time Aayega"],
  N: ["Nadiyon Paar", "Nachde Ne Saare", "Nagada Sang Dhol", "Namo Namo"],
  J: ["Jai Jai Shivshankar", "Jaanu Meri Jaan", "Jugnu - Badshah", "Jumma Chumma De De"],
};

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

export function PartyTableGamesModal({
  isOpen,
  onClose,
  spaceTitle,
  localUserName,
  localUserAvatar = "👑",
  onlineParticipants,
  initialTab = "ludo",
  onOpenUno,
  onOpenTeleparty,
  spotifySyncState,
  onUpdateSpotifySync,
  onBroadcastSpeech,
  liveTableState,
  onUpdateTableGame,
}: PartyTableGamesModalProps) {
  const [activeTab, setActiveTab] = useState<PartyGameTab>(initialTab);
  const [musicBarExpanded, setMusicBarExpanded] = useState(false);

  // 4 Seated Players Setup
  const seatedPlayers: SeatedPlayer[] = useMemo(() => {
    const others = onlineParticipants.filter((p) => p.displayName !== localUserName);
    return [
      {
        id: "local",
        name: localUserName,
        avatar: localUserAvatar,
        isBot: false,
        position: "bottom",
        color: "red",
      },
      {
        id: others[0]?.uid || "p_left",
        name: others[0]?.displayName || "Aarav (Left)",
        avatar: others[0]?.photoURL || "😎",
        isBot: !others[0],
        position: "left",
        color: "green",
      },
      {
        id: others[1]?.uid || "p_across",
        name: others[1]?.displayName || "Simran (Across)",
        avatar: others[1]?.photoURL || "🌸",
        isBot: !others[1],
        position: "across",
        color: "yellow",
      },
      {
        id: others[2]?.uid || "p_right",
        name: others[2]?.displayName || "Kabir (Right)",
        avatar: others[2]?.photoURL || "⚡",
        isBot: !others[2],
        position: "right",
        color: "blue",
      },
    ];
  }, [localUserName, localUserAvatar, onlineParticipants]);


  // ── 2. SPIN THE BOTTLE STATE ────────────────────────────────
  const [bottleAngle, setBottleAngle] = useState(0);
  const [isSpinningBottle, setIsSpinningBottle] = useState(false);
  const [selectedBottleTarget, setSelectedBottleTarget] = useState<SeatedPlayer | null>(null);
  const [currentPromptType, setCurrentPromptType] = useState<"truth" | "dare" | null>(null);
  const [currentPromptText, setCurrentPromptText] = useState<string>("");
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  // ── 3. ROCK PAPER SCISSORS STATE ───────────────────────────
  type RPSChoice = "rock" | "paper" | "scissors";
  const [myRpsChoice, setMyRpsChoice] = useState<RPSChoice | null>(null);
  const [opponentRpsChoice, setOpponentRpsChoice] = useState<RPSChoice | null>(null);
  const [rpsCountdown, setRpsCountdown] = useState<number | null>(null);
  const [rpsResult, setRpsResult] = useState<string | null>(null);
  const [rpsScore, setRpsScore] = useState({ you: 0, opponent: 0 });

  // ── 4. ANTAKSHARI STATE ─────────────────────────────────────
  const [antakshariLetter, setAntakshariLetter] = useState("M");
  const [singInput, setSingInput] = useState("");
  const [antakshariChain, setAntakshariChain] = useState<
    Array<{ singer: string; song: string; letter: string; nextLetter: string }>
  >([
    {
      singer: "Host DJ",
      song: "Mehndi Laga Ke Rakhna Diwana Sajke Rakhna",
      letter: "M",
      nextLetter: "N",
    },
  ]);
  const [audienceCheer, setAudienceCheer] = useState<string | null>(null);

  // ── 5. RAJA MANTRI CHOR SIPAHI STATE ────────────────────────
  type Role = "raja" | "mantri" | "chor" | "sipahi";
  const [royalChits, setRoyalChits] = useState<Role[]>(["raja", "mantri", "chor", "sipahi"]);
  const [chitsRevealed, setChitsRevealed] = useState(false);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [sipahiGuess, setSipahiGuess] = useState<string | null>(null);
  const [roundResultText, setRoundResultText] = useState<string | null>(null);
  const [royalScores, setRoyalScores] = useState<Record<string, number>>({
    [seatedPlayers[0].name]: 0,
    [seatedPlayers[1].name]: 0,
    [seatedPlayers[2].name]: 0,
    [seatedPlayers[3].name]: 0,
  });
  const [bluffToast, setBluffToast] = useState<{ speaker: string; text: string } | null>(null);

  // Synchronize incoming live table state from other room participants
  useEffect(() => {
    if (!liveTableState) return;

    if (liveTableState.activeTab && liveTableState.activeTab !== activeTab) {
      setActiveTab(liveTableState.activeTab);
    }

    if (liveTableState.bottleAngle !== undefined) {
      setBottleAngle(liveTableState.bottleAngle);
      setIsSpinningBottle(!!liveTableState.isSpinningBottle);
      if (liveTableState.bottleTargetName) {
        const found = seatedPlayers.find((p) => p.name === liveTableState.bottleTargetName) || null;
        setSelectedBottleTarget(found);
      }
      if (liveTableState.bottlePromptType !== undefined) {
        setCurrentPromptType(liveTableState.bottlePromptType);
        setCurrentPromptText(liveTableState.bottlePromptText || "");
      }
    }

    if (liveTableState.antakshariChain && liveTableState.antakshariChain.length > antakshariChain.length) {
      setAntakshariChain(liveTableState.antakshariChain);
      if (liveTableState.antakshariLetter) {
        setAntakshariLetter(liveTableState.antakshariLetter);
      }
    }

    if (liveTableState.royalChits && liveTableState.royalChits.length > 0) {
      setRoyalChits(liveTableState.royalChits);
      if (liveTableState.chitsRevealed !== undefined) setChitsRevealed(liveTableState.chitsRevealed);
      if (liveTableState.roundResultText !== undefined) setRoundResultText(liveTableState.roundResultText);
      if (liveTableState.royalScores) setRoyalScores(liveTableState.royalScores);
      if (liveTableState.bluffToast) setBluffToast(liveTableState.bluffToast);
    }
  }, [liveTableState, activeTab, antakshariChain.length, seatedPlayers]);

  const handleSelectTab = (tab: PartyGameTab) => {
    setActiveTab(tab);
    onUpdateTableGame?.({
      activeTab: tab,
      isOpen: true,
      lastActionText: `@${localUserName} opened the ${tab.toUpperCase()} Table!`,
    });
  };

  // Keep music synced
  useEffect(() => {
    // If music is paused when opening game table, give a subtle ambient party sound
    spacesSfx.playKeyNote(5);
  }, []);

  if (!isOpen) return null;


  // ─────────────────────────────────────────────────────────────
  // SPIN THE BOTTLE HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleSpinBottle = () => {
    if (isSpinningBottle) return;
    setIsSpinningBottle(true);
    setSelectedBottleTarget(null);
    setCurrentPromptType(null);
    setCurrentPromptText("");
    setChallengeCompleted(false);
    playChampagneCork();

    const spins = 5 + Math.floor(Math.random() * 5); // 5 to 9 full spins
    const targetIdx = Math.floor(Math.random() * 4);
    // targetIdx 0: bottom (0/360°), 1: left (270°), 2: top (180°), 3: right (90°)
    const targetAngles = [360, 270, 180, 90];
    const finalDegree = bottleAngle + spins * 360 + targetAngles[targetIdx];

    setBottleAngle(finalDegree);

    onUpdateTableGame?.({
      activeTab: "bottle",
      isOpen: true,
      isSpinningBottle: true,
      bottleAngle: finalDegree,
      lastActionText: `@${localUserName} spun the bottle!`,
    });

    setTimeout(() => {
      setIsSpinningBottle(false);
      const chosenPlayer = seatedPlayers[targetIdx];
      setSelectedBottleTarget(chosenPlayer);
      spacesSfx.playZoneChime();

      // Auto pick Truth or Dare
      const isTruth = Math.random() > 0.5;
      const type = isTruth ? "truth" : "dare";
      const cards = isTruth ? TRUTH_CARDS : DARE_CARDS;
      const randomPrompt = cards[Math.floor(Math.random() * cards.length)];
      setCurrentPromptType(type);
      setCurrentPromptText(randomPrompt);

      onUpdateTableGame?.({
        activeTab: "bottle",
        isOpen: true,
        isSpinningBottle: false,
        bottleAngle: finalDegree,
        bottleTargetName: chosenPlayer.name,
        bottlePromptType: type,
        bottlePromptText: randomPrompt,
        lastActionText: `Bottle pointed at @${chosenPlayer.name}! [${type.toUpperCase()}]`,
      });
    }, 3200);
  };

  const handleCompleteDare = () => {
    setChallengeCompleted(true);
    playCashRegister();
    addCash(15, "Spin the Bottle Challenge");
  };

  // ─────────────────────────────────────────────────────────────
  // ROCK PAPER SCISSORS HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handlePlayRps = (choice: RPSChoice) => {
    setMyRpsChoice(choice);
    setOpponentRpsChoice(null);
    setRpsResult(null);
    setRpsCountdown(3);

    const timer = setInterval(() => {
      setRpsCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Reveal opponent choice
          const choices: RPSChoice[] = ["rock", "paper", "scissors"];
          const oppChoice = choices[Math.floor(Math.random() * choices.length)];
          setOpponentRpsChoice(oppChoice);
          setRpsCountdown(null);

          // Calculate winner
          if (choice === oppChoice) {
            setRpsResult("🤝 It's a Tie! Both chose " + choice);
          } else if (
            (choice === "rock" && oppChoice === "scissors") ||
            (choice === "paper" && oppChoice === "rock") ||
            (choice === "scissors" && oppChoice === "paper")
          ) {
            setRpsResult(`🎉 Victory! ${choice} beats ${oppChoice}! (+20 Aura)`);
            setRpsScore((s) => ({ ...s, you: s.you + 1 }));
            playGameVictory();
            addCash(20, "RPS Victory");
          } else {
            setRpsResult(`😅 Opponent Won! ${oppChoice} beats ${choice}!`);
            setRpsScore((s) => ({ ...s, opponent: s.opponent + 1 }));
            spacesSfx.playFootstep();
          }
          return null;
        }
        spacesSfx.playSitPop();
        return prev - 1;
      });
    }, 600);
  };

  // ─────────────────────────────────────────────────────────────
  // ANTAKSHARI HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleSingSong = () => {
    if (!singInput.trim()) return;
    const song = singInput.trim();
    // Compute last letter
    const cleaned = song.replace(/[^a-zA-Z]/g, "").toUpperCase();
    const lastChar = cleaned.length > 0 ? cleaned[cleaned.length - 1] : "K";
    const nextL = ANTAKSHARI_LETTERS.includes(lastChar)
      ? lastChar
      : ANTAKSHARI_LETTERS[Math.floor(Math.random() * ANTAKSHARI_LETTERS.length)];

    const updatedChain = [
      {
        singer: localUserName,
        song,
        letter: antakshariLetter,
        nextLetter: nextL,
      },
      ...antakshariChain,
    ];

    setAntakshariChain(updatedChain);
    setAntakshariLetter(nextL);
    setSingInput("");
    spacesSfx.playPianoNote(5);
    playCashRegister();
    addCash(10, "Antakshari Song Added");

    onUpdateTableGame?.({
      activeTab: "antakshari",
      isOpen: true,
      antakshariLetter: nextL,
      antakshariChain: updatedChain,
      lastActionText: `@${localUserName} sang "${song}"! Next: [${nextL}]`,
    });
  };

  const handleCheer = (emoji: string, sound: () => void) => {
    sound();
    setAudienceCheer(emoji);
    setTimeout(() => setAudienceCheer(null), 2000);
  };

  // ─────────────────────────────────────────────────────────────
  // RAJA MANTRI CHOR SIPAHI HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleStartRoyalChits = () => {
    // Shuffle roles
    const baseRoles: Role[] = ["raja", "mantri", "chor", "sipahi"];
    const shuffled: Role[] = [...baseRoles].sort(() => Math.random() - 0.5);
    setRoyalChits(shuffled);
    setMyRole(shuffled[0]); // bottom player is index 0
    setChitsRevealed(false);
    setSipahiGuess(null);
    setRoundResultText(null);
    setBluffToast(null);
    spacesSfx.playSitPop();

    onUpdateTableGame?.({
      activeTab: "raja_mantri",
      isOpen: true,
      royalChits: shuffled,
      chitsRevealed: false,
      roundResultText: null,
      bluffToast: null,
      lastActionText: `@${localUserName} shuffled new royal chits!`,
    });
  };

  const handleRevealMyChit = () => {
    setChitsRevealed(true);
    spacesSfx.playZoneChime();

    // If local player is NOT the Sipahi, and Sipahi is an AI bot, bot will ponder while hearing mic and guess after 5s
    const sipahiIdx = royalChits.indexOf("sipahi");
    if (sipahiIdx !== 0 && seatedPlayers[sipahiIdx].isBot) {
      setTimeout(() => {
        const suspects = seatedPlayers.filter(
          (_, idx) => royalChits[idx] !== "raja" && royalChits[idx] !== "mantri" && idx !== sipahiIdx
        );
        const randomSuspect =
          suspects[Math.floor(Math.random() * suspects.length)] ||
          seatedPlayers[royalChits.indexOf("chor")];
        handleSipahiGuess(randomSuspect.name);
      }, 5000);
    }
  };

  const handleSendBluff = (phrase: string) => {
    setBluffToast({ speaker: localUserName, text: phrase });
    onBroadcastSpeech?.(`🗣️ @${localUserName}: "${phrase}"`);
    spacesSfx.playKeyNote(5);
    setTimeout(() => setBluffToast(null), 3500);

    onUpdateTableGame?.({
      bluffToast: { speaker: localUserName, text: phrase },
      lastActionText: `@${localUserName}: "${phrase}"`,
    });
  };

  const handleSipahiGuess = (guessedPlayerName: string) => {
    setSipahiGuess(guessedPlayerName);

    const chorIdx = royalChits.indexOf("chor");
    const sipahiIdx = royalChits.indexOf("sipahi");
    const rajaIdx = royalChits.indexOf("raja");
    const mantriIdx = royalChits.indexOf("mantri");

    const chorPlayer = seatedPlayers[chorIdx];
    const sipahiPlayer = seatedPlayers[sipahiIdx];
    const rajaPlayer = seatedPlayers[rajaIdx];
    const mantriPlayer = seatedPlayers[mantriIdx];

    let result = "";
    let nextScores = { ...royalScores };

    if (guessedPlayerName === chorPlayer.name) {
      // Sipahi guessed correctly!
      result = `🎉 SHABASH SIPAHI! @${sipahiPlayer.name} (Sipahi) caught the real Chor (@${chorPlayer.name})! Sipahi earns 500 pts!`;
      playGameVictory();
      addCash(25, "Sipahi Caught The Chor");
      nextScores = {
        ...royalScores,
        [rajaPlayer.name]: (royalScores[rajaPlayer.name] || 0) + 1000,
        [mantriPlayer.name]: (royalScores[mantriPlayer.name] || 0) + 800,
        [sipahiPlayer.name]: (royalScores[sipahiPlayer.name] || 0) + 500,
        [chorPlayer.name]: royalScores[chorPlayer.name] || 0,
      };
    } else {
      // Sipahi guessed wrong! Chor escapes and steals the Sipahi's 500 points!
      result = `🚨 DHOKA! @${sipahiPlayer.name} accused the wrong person! @${chorPlayer.name} was the real Chor and STOLE the Sipahi's 500 points!`;
      spacesSfx.playGavelStrike();
      nextScores = {
        ...royalScores,
        [rajaPlayer.name]: (royalScores[rajaPlayer.name] || 0) + 1000,
        [mantriPlayer.name]: (royalScores[mantriPlayer.name] || 0) + 800,
        [sipahiPlayer.name]: royalScores[sipahiPlayer.name] || 0,
        [chorPlayer.name]: (royalScores[chorPlayer.name] || 0) + 500,
      };
    }

    setRoundResultText(result);
    setRoyalScores(nextScores);

    onUpdateTableGame?.({
      roundResultText: result,
      royalScores: nextScores,
      lastActionText: result,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[95vh] bg-neutral-950 border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-950/40 flex flex-col overflow-hidden">
        {/* TOP HEADER: Synced Spotify Party Music Bar */}
        <div className="p-3 bg-neutral-900/90 border-b border-neutral-800">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
                <Dices className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                  Banquet Table Games Lounge
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                    Live Table
                  </span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Continuous Party Beats & synched games for you & your friends
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Party Music Bar (Saves gameplay space for board games) */}
          <div className="mt-1">
            {!musicBarExpanded ? (
              <div className="px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm animate-pulse">🎵</span>
                  <div className="truncate flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs truncate">
                      {spotifySyncState?.isPlaying
                        ? `Spotify: ${spotifySyncState.trackName}`
                        : "Echo Party Music"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                      {spotifySyncState?.isPlaying
                        ? `• DJ @${spotifySyncState.djHandle}`
                        : "• Synced In-Space Audio"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMusicBarExpanded(true)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono flex items-center gap-1 border border-neutral-700 transition cursor-pointer"
                    title="Open Full Music Controls & Spotify Player"
                  >
                    <span>Music Player</span>
                    <ChevronDown className="w-3 h-3 text-amber-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 bg-neutral-900/95 rounded-2xl p-2.5 border border-neutral-800 shadow-xl">
                <div className="flex items-center justify-between px-1 text-[10px] text-neutral-400 font-mono pb-1 border-b border-neutral-800/60">
                  <span className="text-emerald-400 font-bold">LIVE PARTY MUSIC & SPOTIFY</span>
                  <button
                    type="button"
                    onClick={() => setMusicBarExpanded(false)}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700"
                  >
                    <span>Hide Player (Full Game View)</span>
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
                <PartyMusicBar
                  userHandle={localUserName}
                  compact={false}
                  onOpenTeleparty={onOpenTeleparty}
                  spotifySyncState={spotifySyncState}
                  onUpdateSpotifySync={onUpdateSpotifySync}
                />
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS: 6 Games */}
        <div className="flex items-center gap-1 px-3 py-2 bg-neutral-900/50 border-b border-neutral-800 overflow-x-auto custom-scrollbar shrink-0">
          <button
            onClick={() => handleSelectTab("ludo")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === "ludo"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 scale-105"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            <span>🎲</span>
            <span>Ludo Table</span>
          </button>

          <button
            onClick={() => handleSelectTab("bottle")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === "bottle"
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-105"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            <span>🍾</span>
            <span>Spin the Bottle</span>
          </button>

          <button
            onClick={() => handleSelectTab("rps")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === "rps"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-105"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            <span>✂️</span>
            <span>Rock Paper Scissors</span>
          </button>

          <button
            onClick={() => handleSelectTab("antakshari")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === "antakshari"
                ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20 scale-105"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            <span>🎤</span>
            <span>Antakshari</span>
          </button>

          <button
            onClick={() => handleSelectTab("raja_mantri")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === "raja_mantri"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/20 scale-105"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            <span>👑</span>
            <span>Raja Mantri Chor Sipahi</span>
          </button>

          <button
            onClick={() => {
              if (onOpenUno) {
                onClose();
                onOpenUno();
              } else {
                setActiveTab("uno");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === "uno"
                ? "bg-red-500 text-white shadow-md shadow-red-500/20 scale-105"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
            }`}
          >
            <span>🃏</span>
            <span>UNO Table</span>
          </button>
        </div>

        {/* MAIN GAME CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar bg-gradient-to-b from-neutral-950 to-neutral-900">
          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 1: LUDO TABLE */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "ludo" && (
            <RealisticLudoBoard
              localUserName={localUserName}
              localUserAvatar={localUserAvatar}
              onlineParticipants={onlineParticipants}
              onBroadcastSpeech={onBroadcastSpeech}
              spaceTitle={spaceTitle}
            />
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 2: SPIN THE BOTTLE & TRUTH OR DARE */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "bottle" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800">
                <div>
                  <div className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                    🍾 Spin the Bottle & Truth or Dare
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Spin the bottle to pick who at the table answers or performs!
                  </div>
                </div>

                <button
                  onClick={handleSpinBottle}
                  disabled={isSpinningBottle}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isSpinningBottle
                      ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 text-white scale-105 shadow-rose-500/30"
                  }`}
                >
                  <RotateCw className={`w-4 h-4 ${isSpinningBottle ? "animate-spin" : ""}`} />
                  <span>{isSpinningBottle ? "Spinning..." : "🍾 SPIN BOTTLE!"}</span>
                </button>
              </div>

              {/* Table Seating Arena with Centered 3D Rotating Bottle */}
              <div className="relative max-w-lg mx-auto aspect-square bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border-2 border-amber-500/30 rounded-full p-4 shadow-2xl flex flex-col justify-between items-center">
                {/* TOP SEAT (Across) */}
                <div
                  className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 border transition-all ${
                    selectedBottleTarget?.position === "across"
                      ? "bg-rose-500 text-white border-rose-300 scale-110 shadow-lg shadow-rose-500/50 animate-bounce"
                      : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                  }`}
                >
                  {renderPlayerAvatar(seatedPlayers[2].avatar, "🌸", "w-7 h-7 text-sm")}
                  <span className="text-xs font-bold">{seatedPlayers[2].name}</span>
                </div>

                {/* MIDDLE ROW: Left Seat, Center Bottle, Right Seat */}
                <div className="w-full flex items-center justify-between px-2">
                  {/* LEFT SEAT */}
                  <div
                    className={`px-3 py-2 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                      selectedBottleTarget?.position === "left"
                        ? "bg-rose-500 text-white border-rose-300 scale-110 shadow-lg shadow-rose-500/50 animate-bounce"
                        : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    {renderPlayerAvatar(seatedPlayers[1].avatar, "😎", "w-7 h-7 text-sm")}
                    <span className="text-[11px] font-bold">{seatedPlayers[1].name}</span>
                  </div>

                  {/* CENTER ROTATING BOTTLE */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-neutral-900/60 border border-neutral-800 shadow-inner" />

                    {/* Bottle graphic with CSS rotation */}
                    <div
                      className="text-6xl select-none filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] cursor-pointer"
                      style={{
                        transform: `rotate(${bottleAngle}deg)`,
                        transition: isSpinningBottle
                          ? "transform 3.2s cubic-bezier(0.15, 0.9, 0.25, 1)"
                          : "transform 0.3s ease",
                      }}
                      onClick={handleSpinBottle}
                    >
                      🍾
                    </div>
                  </div>

                  {/* RIGHT SEAT */}
                  <div
                    className={`px-3 py-2 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                      selectedBottleTarget?.position === "right"
                        ? "bg-rose-500 text-white border-rose-300 scale-110 shadow-lg shadow-rose-500/50 animate-bounce"
                        : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    {renderPlayerAvatar(seatedPlayers[3].avatar, "⚡", "w-7 h-7 text-sm")}
                    <span className="text-[11px] font-bold">{seatedPlayers[3].name}</span>
                  </div>
                </div>

                {/* BOTTOM SEAT (YOU) */}
                <div
                  className={`px-4 py-2 rounded-2xl flex items-center gap-2 border transition-all ${
                    selectedBottleTarget?.position === "bottom"
                      ? "bg-rose-500 text-white border-rose-300 scale-110 shadow-lg shadow-rose-500/50 animate-bounce"
                      : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                  }`}
                >
                  {renderPlayerAvatar(seatedPlayers[0].avatar, "👑", "w-7 h-7 text-sm")}
                  <span className="text-xs font-black">{seatedPlayers[0].name} (You)</span>
                </div>
              </div>

              {/* CARD REVEAL AREA */}
              {selectedBottleTarget && currentPromptText && (
                <div className="bg-neutral-900 border border-rose-500/50 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {currentPromptType === "truth" ? "🔮 TRUTH" : "🔥 DARE"}
                      </span>
                      <span className="text-xs font-bold text-neutral-400">
                        Target:{" "}
                        <span className="text-white font-black">@{selectedBottleTarget.name}</span>
                      </span>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        currentPromptType === "truth"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {currentPromptType} Card
                    </span>
                  </div>

                  <p className="text-base font-semibold text-neutral-100 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 italic">
                    "{currentPromptText}"
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleSpinBottle()}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Skip / Spin Again
                    </button>

                    <button
                      onClick={handleCompleteDare}
                      disabled={challengeCompleted}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                        challengeCompleted
                          ? "bg-emerald-600 text-white cursor-default"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 scale-105"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{challengeCompleted ? "Completed (+$15 Cash)!" : "Complete Challenge (+$15)"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 3: ROCK PAPER SCISSORS SHOWDOWN */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "rps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800">
                <div>
                  <div className="text-xs font-black uppercase text-sky-400">
                    ✂️ Rock Paper Scissors Clash
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Play rapid 1v1 showdowns at the banquet table!
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs font-mono font-bold">
                  <span className="text-emerald-400">You: {rpsScore.you}</span>
                  <span className="text-neutral-600">vs</span>
                  <span className="text-rose-400">Opponent: {rpsScore.opponent}</span>
                </div>
              </div>

              {/* RPS Arena */}
              <div className="relative max-w-lg mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-6">
                {/* Visual Clash Box */}
                <div className="w-full flex items-center justify-around py-4">
                  {/* Left: You */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-950 border-2 border-sky-500/40 flex items-center justify-center text-4xl shadow-inner">
                      {myRpsChoice === "rock" && "✊"}
                      {myRpsChoice === "paper" && "✋"}
                      {myRpsChoice === "scissors" && "✌️"}
                      {!myRpsChoice && "❓"}
                    </div>
                    <span className="text-xs font-bold text-sky-300">You (@{localUserName})</span>
                  </div>

                  {/* Center: Countdown or VS */}
                  <div className="flex flex-col items-center justify-center">
                    {rpsCountdown !== null ? (
                      <div className="text-4xl font-black text-amber-400 animate-ping">
                        {rpsCountdown}
                      </div>
                    ) : (
                      <div className="text-xl font-black text-neutral-500">VS</div>
                    )}
                  </div>

                  {/* Right: Opponent */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-950 border-2 border-rose-500/40 flex items-center justify-center text-4xl shadow-inner">
                      {opponentRpsChoice === "rock" && "✊"}
                      {opponentRpsChoice === "paper" && "✋"}
                      {opponentRpsChoice === "scissors" && "✌️"}
                      {!opponentRpsChoice && (rpsCountdown !== null ? "🎲" : "❓")}
                    </div>
                    <span className="text-xs font-bold text-rose-300">
                      Opponent (@{seatedPlayers[1].name})
                    </span>
                  </div>
                </div>

                {/* Result Announcement */}
                {rpsResult && (
                  <div className="w-full text-center py-2.5 px-4 rounded-xl bg-neutral-950 border border-amber-500/40 text-sm font-bold text-amber-200 animate-in zoom-in-95">
                    {rpsResult}
                  </div>
                )}

                {/* Hand Buttons */}
                <div className="w-full flex items-center justify-center gap-3">
                  <button
                    onClick={() => handlePlayRps("rock")}
                    disabled={rpsCountdown !== null}
                    className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-center flex flex-col items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                  >
                    <span className="text-3xl">✊</span>
                    <span className="text-xs font-bold text-neutral-200">Rock</span>
                  </button>

                  <button
                    onClick={() => handlePlayRps("paper")}
                    disabled={rpsCountdown !== null}
                    className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-center flex flex-col items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                  >
                    <span className="text-3xl">✋</span>
                    <span className="text-xs font-bold text-neutral-200">Paper</span>
                  </button>

                  <button
                    onClick={() => handlePlayRps("scissors")}
                    disabled={rpsCountdown !== null}
                    className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-center flex flex-col items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                  >
                    <span className="text-3xl">✌️</span>
                    <span className="text-xs font-bold text-neutral-200">Scissors</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 4: ANTAKSHARI MUSICAL CHAIN */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "antakshari" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800">
                <div>
                  <div className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    🎤 Live Antakshari Musical Chain
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    "Baithe baithe kya karein... shuru karo Antakshari!" Next song must start with the ending letter.
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCheer("👏", () => spacesSfx.playSitPop())}
                    className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold cursor-pointer"
                    title="Applause"
                  >
                    👏 Taali
                  </button>
                  <button
                    onClick={() => handleCheer("🔥", () => spacesSfx.playFootstep())}
                    className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold cursor-pointer"
                    title="Fire"
                  >
                    🔥 Aag
                  </button>
                  <button
                    onClick={() => handleCheer("🎺", () => spacesSfx.playZoneChime())}
                    className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold cursor-pointer"
                    title="Horn"
                  >
                    🎺 Horn
                  </button>
                </div>
              </div>

              {/* Active Letter Prompt Box */}
              <div className="relative bg-gradient-to-r from-emerald-950/80 via-neutral-900 to-teal-950/80 border border-emerald-500/40 rounded-3xl p-4 shadow-xl flex items-center justify-between">
                {audienceCheer && (
                  <div className="absolute top-2 right-4 text-3xl animate-bounce">
                    {audienceCheer}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-black text-3xl shadow-lg shadow-emerald-500/40">
                    {antakshariLetter}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      CURRENT LETTER PROMPT
                    </div>
                    <div className="text-sm font-bold text-white">
                      Sing or write a song starting with letter "{antakshariLetter}"
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Earn $10 Cash for each song added to the musical chain!
                    </div>
                  </div>
                </div>
              </div>

              {/* Song Suggestions Starting with Letter */}
              {SONG_SUGGESTIONS[antakshariLetter] && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Popular Ideas For Letter "{antakshariLetter}":
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SONG_SUGGESTIONS[antakshariLetter].map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSingInput(s)}
                        className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-emerald-950/50 border border-neutral-800 hover:border-emerald-500/40 text-xs text-neutral-300 hover:text-emerald-200 transition-all cursor-pointer"
                      >
                        🎵 {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input: Sing or write lyrics */}
              <div className="flex items-center gap-2 bg-neutral-900 p-2 rounded-2xl border border-neutral-800">
                <input
                  type="text"
                  value={singInput}
                  onChange={(e) => setSingInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSingSong()}
                  placeholder={`Type lyrics starting with "${antakshariLetter}" or pick above...`}
                  className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none"
                />
                <button
                  onClick={handleSingSong}
                  disabled={!singInput.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    singInput.trim()
                      ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 scale-105 shadow-md shadow-emerald-500/30"
                      : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Sing! (+$10)</span>
                </button>
              </div>

              {/* Chain History */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Live Singing Chain ({antakshariChain.length})
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {antakshariChain.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center justify-center shrink-0">
                          {item.letter}
                        </span>
                        <div>
                          <div className="font-bold text-neutral-200">{item.song}</div>
                          <div className="text-[10px] text-neutral-400">Sung by @{item.singer}</div>
                        </div>
                      </div>

                      <div className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                        Pass: "{item.nextLetter}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 5: RAJA MANTRI CHOR SIPAHI */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "raja_mantri" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800">
                <div>
                  <div className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                    👑 Raja Mantri Chor Sipahi (Authentic Royal Chits)
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Raja (1000 pts) • Mantri (800 pts) • Sipahi (500 pts) • Chor (0 pts)
                  </div>
                </div>

                <button
                  onClick={handleStartRoyalChits}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer scale-105"
                >
                  <span>📜 Deal New Chits</span>
                </button>
              </div>

              {/* 4 Folded Chits on Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {seatedPlayers.map((player, idx) => {
                  const role = royalChits[idx];
                  const isYou = idx === 0;
                  const isRaja = role === "raja";
                  const isMantri = role === "mantri";

                  return (
                    <div
                      key={player.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-col items-center justify-between text-center min-h-[145px] shadow-sm"
                    >
                      {renderPlayerAvatar(player.avatar, "👑", "w-8 h-8 text-sm")}
                      <div className="text-xs font-bold text-neutral-200 truncate w-full">
                        {player.name} {isYou && "(You)"}
                      </div>

                      {/* Chit Display */}
                      {isYou ? (
                        chitsRevealed ? (
                          <div className="w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-black uppercase animate-in zoom-in-95 shadow-inner">
                            {myRole === "raja" && "👑 Raja (1000)"}
                            {myRole === "mantri" && "📜 Mantri (800)"}
                            {myRole === "sipahi" && "⚔️ Sipahi (500)"}
                            {myRole === "chor" && "🦹 Chor (0)"}
                          </div>
                        ) : (
                          <button
                            onClick={handleRevealMyChit}
                            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase shadow-md transition-all cursor-pointer"
                          >
                            Open Chit! 📜
                          </button>
                        )
                      ) : (
                        <div className="w-full py-2 rounded-xl bg-neutral-950 border border-dashed border-neutral-700 text-neutral-400 text-xs font-mono">
                          {roundResultText
                            ? role === "raja"
                              ? "👑 RAJA (1000)"
                              : role === "mantri"
                              ? "📜 MANTRI (800)"
                              : role === "sipahi"
                              ? "⚔️ SIPAHI (500)"
                              : "🦹 CHOR (0)"
                            : chitsRevealed && isRaja
                            ? "👑 RAJA (1000)"
                            : chitsRevealed && isMantri
                            ? "📜 MANTRI (800)"
                            : "Folded Chit 📜"}
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-neutral-400 mt-1">
                        Score: {royalScores[player.name] || 0} pts
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase 2: Sipahi Identifies The Chor with Live Mic Distractions */}
              {chitsRevealed && !roundResultText && (
                <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-sky-400 animate-pulse" />
                      <div>
                        <div className="text-xs font-black uppercase text-sky-300">
                          Sipahi's Mission: Identify & Catch The Chor!
                        </div>
                        <div className="text-[11px] text-neutral-300">
                          Raja ordered: "Sipahi ji, Chor ko pakdo!" • Only the Sipahi can make the guess.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                      <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>MIC DISTRACTION LIVE</span>
                    </div>
                  </div>

                  {/* Live Distraction Speech Bubble */}
                  {bluffToast && (
                    <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-white flex items-center gap-2 animate-bounce shadow-md">
                      <span className="text-lg">🗣️</span>
                      <div>
                        <span className="font-bold text-amber-300">@{bluffToast.speaker}: </span>
                        <span className="italic">"{bluffToast.text}"</span>
                      </div>
                    </div>
                  )}

                  {/* Distraction Bluff Buttons for All Players */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase font-mono">
                      🎙️ Distract the Sipahi (Speak on mic or tap quick bluffs):
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        "Main Chor nahi hoon bhai! 😇",
                        "Check his face, 100% chor hai! 👀",
                        "Maine kuch nahi churaya Huzoor! 🤫",
                        "Dekho wo darr raha hai! 🏃",
                        "Chor udhar baitha hai! 🎭",
                      ].map((phrase, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendBluff(phrase)}
                          className="px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] text-neutral-200 hover:text-white transition cursor-pointer"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Guessing Action: ONLY SIPAHI GUESSES */}
                  {myRole === "sipahi" ? (
                    <div className="pt-2.5 border-t border-neutral-800 space-y-2">
                      <div className="text-xs font-bold text-rose-400 flex items-center gap-1">
                        <span>⚔️ YOU ARE THE SIPAHI! Who is the Chor?</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          (Wrong guess lets the Chor steal your 500 pts!)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {seatedPlayers
                          .filter((_, pIdx) => pIdx !== 0 && royalChits[pIdx] !== "raja" && royalChits[pIdx] !== "mantri")
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleSipahiGuess(p.name)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer hover:scale-105 flex items-center gap-1.5"
                            >
                              <span>🦹 Accuse @{p.name}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2.5 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span className="animate-spin text-sm">⏳</span>
                        <span>
                          @{seatedPlayers[royalChits.indexOf("sipahi")].name} (Sipahi) is analyzing voices to find the Chor...
                        </span>
                      </div>
                      <span className="text-amber-400 text-[10px] font-bold">
                        Keep distracting on mic! 🗣️
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Round Result Announcement */}
              {roundResultText && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/50 text-center space-y-2 animate-in zoom-in-95 shadow-2xl">
                  <div className="text-sm font-black text-amber-300">{roundResultText}</div>
                  <button
                    onClick={handleStartRoyalChits}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:scale-105"
                  >
                    Play Next Round 📜
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 6: UNO TABLE LAUNCHER */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === "uno" && (
            <div className="space-y-4 text-center py-8">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 flex items-center justify-center text-4xl shadow-2xl shadow-rose-500/30">
                🃏
              </div>
              <div>
                <h3 className="text-lg font-black text-white">4-Player Multiplayer UNO Table</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                  Play the full multiplayer UNO match with You, Left, Across, and Right seating, wild card choices, shout UNO, and $50 Cash prize!
                </p>
              </div>

              <button
                onClick={() => {
                  if (onOpenUno) {
                    onClose();
                    onOpenUno();
                  }
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-sm shadow-xl shadow-red-500/30 transition-all cursor-pointer scale-105"
              >
                🃏 OPEN FULL UNO CARD TABLE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
