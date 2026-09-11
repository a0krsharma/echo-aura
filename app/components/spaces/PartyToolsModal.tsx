"use client";

/**
 * app/components/spaces/PartyToolsModal.tsx
 * ─────────────────────────────────────────────────────
 * Virtual Friend Hosting & Party Suite:
 * - 🎧 Ambiance DJ Controller (Lofi, Rain, Campfire, Sukoon, Party)
 * - 🎲 Interactive 3D Dice Roller (d6 & d20)
 * - 🍾 Spin the Bottle & Truth or Dare (50+ cards)
 * - 🎂 Birthday & Celebration Blast (Confetti + Cake + Fanfare)
 * - ☕ Virtual Chai Date Icebreaker Cards
 * - 🍿 Screen Share / Watch Party Launcher
 * - 📸 Polaroid Group Photo Booth
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Dice5,
  RotateCcw,
  Volume2,
  Radio,
  Coffee,
  Tv,
  Camera,
  Share2,
  Download,
  PartyPopper,
  Play,
  Pause,
  ChevronRight,
  Cake,
  Crown,
  UtensilsCrossed,
  Armchair,
  Dices,
  Gift,
  Wine,
} from "lucide-react";
import { spacesSfx } from "@/lib/spacesSfx";
import { SpatialAvatar } from "@/lib/spaces";

interface PartyToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceName: string;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onTriggerConfetti: () => void;
  onSendSpeech: (text: string) => void;
  onCapturePhoto: () => Promise<string | null>;
  onStartScreenShare?: () => void;
  onServeCake?: () => void;
  onDressBirthday?: (gender: "boy" | "girl") => void;
  onOpenCatering?: () => void;
  onOpenSeating?: () => void;
  onOpenUno?: () => void;
  onOpenGifting?: () => void;
  onOpenPartyTableGames?: (tab?: "ludo" | "bottle" | "rps" | "antakshari" | "raja_mantri" | "uno") => void;
}

type PartyTab = "ambiance" | "dice" | "bottle" | "birthday" | "icebreakers" | "photobooth";

const TRUTH_OR_DARE_CARDS = {
  party: [
    { type: "TRUTH", text: "What's the most embarrassing song currently in your playlist?" },
    { type: "TRUTH", text: "If you could trade lives with one person in this room for 24 hours, who?" },
    { type: "DARE", text: "Sing the chorus of your favorite song out loud right now!" },
    { type: "DARE", text: "Send a funny voice note to the last person you messaged on WhatsApp!" },
    { type: "TRUTH", text: "What is your biggest irrational fear?" },
    { type: "DARE", text: "Do your best impression of another person in this room for 20 seconds." },
  ],
  deep: [
    { type: "TRUTH", text: "What is a life lesson you had to learn the hard way?" },
    { type: "TRUTH", text: "What is something you're deeply proud of that few people know about?" },
    { type: "TRUTH", text: "If you had a time machine and could relive one day with someone, which day?" },
    { type: "TRUTH", text: "What is a dream you've put on pause that you still think about?" },
  ],
  chaidate: [
    { type: "TOPIC", text: "What's a weird habit you have that you secretly love?" },
    { type: "TOPIC", text: "If we could hop on a flight right now anywhere in the world, where would we go?" },
    { type: "TOPIC", text: "What's your ultimate comfort food and the memory tied to it?" },
    { type: "TOPIC", text: "What is something that instantly makes your day 10x better?" },
    { type: "TOPIC", text: "What's the most chaotic situation you've ever found yourself in?" },
  ],
};

export default function PartyToolsModal({
  isOpen,
  onClose,
  spaceName,
  localAvatar,
  remoteAvatars,
  onTriggerConfetti,
  onSendSpeech,
  onCapturePhoto,
  onStartScreenShare,
  onServeCake,
  onDressBirthday,
  onOpenCatering,
  onOpenSeating,
  onOpenUno,
  onOpenGifting,
  onOpenPartyTableGames,
}: PartyToolsModalProps) {
  const [activeTab, setActiveTab] = useState<PartyTab>("birthday");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [modalConfettiBurst, setModalConfettiBurst] = useState(false);
  const [ambianceVolume, setAmbianceVol] = useState(0.4);

  // Dice State
  const [diceType, setDiceType] = useState<6 | 20>(6);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<Array<{ val: number; type: number; time: string }>>([]);

  // Spin the Bottle State
  const [bottleAngle, setBottleAngle] = useState(0);
  const [isSpinningBottle, setIsSpinningBottle] = useState(false);
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const [todCategory, setTodCategory] = useState<"party" | "deep" | "chaidate">("party");
  const [currentTodCard, setCurrentTodCard] = useState<{ type: string; text: string } | null>(null);

  // Chai Date Question Index
  const [chaiIndex, setChaiIndex] = useState(0);

  // Photo Booth State
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    setCurrentTrack(spacesSfx.getCurrentAmbiance());
  }, [isOpen]);

  if (!isOpen) return null;

  // Roll Dice Action
  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    spacesSfx.playDiceRoll();

    let count = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * diceType) + 1);
      count++;
      if (count > 7) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * diceType) + 1;
        setDiceValue(finalVal);
        setIsRolling(false);
        setRollHistory((prev) => [
          { val: finalVal, type: diceType, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
          ...prev.slice(0, 4),
        ]);
        onSendSpeech(`🎲 Rolled a d${diceType}: ${finalVal}!`);
      }
    }, 60);
  };

  // Spin Bottle Action
  const handleSpinBottle = () => {
    if (isSpinningBottle) return;
    setIsSpinningBottle(true);
    setPickedTarget(null);
    spacesSfx.playBottleSpin();

    const randomRotations = 3 + Math.floor(Math.random() * 4);
    const randomAngle = Math.floor(Math.random() * 360);
    const targetAngle = bottleAngle + randomRotations * 360 + randomAngle;
    setBottleAngle(targetAngle);

    setTimeout(() => {
      setIsSpinningBottle(false);
      const allPeople = [localAvatar, ...remoteAvatars];
      const selected = allPeople[Math.floor(Math.random() * allPeople.length)];
      setPickedTarget(selected.handle || "Explorer");
      spacesSfx.playSitPop();

      // Pick a random card from selected category
      const cards = TRUTH_OR_DARE_CARDS[todCategory];
      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      setCurrentTodCard(randomCard);
    }, 2400);
  };

  // Celebration Confetti Blast
  const handleCelebrationBlast = () => {
    spacesSfx.playPartyFanfare();
    onTriggerConfetti();
    setModalConfettiBurst(true);
    setTimeout(() => setModalConfettiBurst(false), 4000);
    onSendSpeech("🎉 CELEBRATION! Happy Birthday & Cheers! 🎂✨");
  };

  // Ambiance Toggle
  const handleToggleAmbiance = (track: "lofi" | "rain" | "campfire" | "sukoon" | "party") => {
    if (currentTrack === track) {
      spacesSfx.stopAmbiance();
      setCurrentTrack(null);
    } else {
      spacesSfx.startAmbiance(track);
      setCurrentTrack(track);
    }
  };

  // Take Snapshot
  const handleSnapPhoto = async () => {
    setIsCapturing(true);
    spacesSfx.playCameraShutter();
    try {
      const dataUrl = await onCapturePhoto();
      setCapturedPhotoUrl(dataUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      {/* Visual Confetti Burst Inside Modal */}
      {modalConfettiBurst && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                top: `${Math.random() * 85}%`,
                left: `${Math.random() * 95}%`,
                width: `${Math.random() * 12 + 6}px`,
                height: `${Math.random() * 16 + 6}px`,
                backgroundColor: ["#f43f5e", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#eab308"][
                  Math.floor(Math.random() * 7)
                ],
                borderRadius: Math.random() > 0.5 ? "50%" : "3px",
                transform: `rotate(${Math.random() * 360}deg)`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-900 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-400 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white font-mono flex items-center gap-2">
                <span>VIRTUAL HOSTING & PARTY SUITE</span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Interactive tools to entertain, play, and connect with friends
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-neutral-900 bg-neutral-950 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "ambiance", label: "🎧 Music DJ", icon: Radio },
            { id: "dice", label: "🎲 Dice Roller", icon: Dice5 },
            { id: "bottle", label: "🍾 Spin Bottle", icon: RotateCcw },
            { id: "birthday", label: "🎂 Celebration", icon: Cake },
            { id: "icebreakers", label: "☕ Chai Date", icon: Coffee },
            { id: "photobooth", label: "📸 Photo Booth", icon: Camera },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  spacesSfx.playKeyNote(2);
                  setActiveTab(tab.id as PartyTab);
                }}
                className={`px-3.5 py-2 rounded-t-xl font-mono text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  active
                    ? "bg-neutral-900 text-cyan-400 border-cyan-400"
                    : "text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-neutral-900/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: AMBIANCE MUSIC DJ */}
          {activeTab === "ambiance" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-300 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>Real-time Procedural Ambient Audio</span>
                  </span>
                  {currentTrack && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px] font-bold animate-pulse">
                      PLAYING: {currentTrack.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { id: "lofi", label: "Cozy Lofi Cafe", icon: "☕", desc: "Warm Rhodes chords & vinyl hiss" },
                    { id: "rain", label: "Lofi Rain & Jazz", icon: "🌧️", desc: "Filtered rain with jazz piano" },
                    { id: "campfire", label: "Campfire Woods", icon: "🔥", desc: "Crackling embers & acoustic warmth" },
                    { id: "sukoon", label: "Sukoon Zen Bowls", icon: "🍃", desc: "Meditation singing bowls" },
                    { id: "party", label: "Party Club Groove", icon: "🪩", desc: "120 BPM 4/4 synthetic kick" },
                  ].map((amb) => {
                    const isPlaying = currentTrack === amb.id;
                    return (
                      <button
                        key={amb.id}
                        onClick={() => handleToggleAmbiance(amb.id as any)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer group ${
                          isPlaying
                            ? "bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10"
                            : "bg-neutral-950/70 border-neutral-800 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl">{amb.icon}</span>
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              isPlaying ? "bg-cyan-500 text-black" : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="font-mono text-xs font-bold text-white group-hover:text-cyan-300">
                            {amb.label}
                          </div>
                          <div className="font-mono text-[10px] text-neutral-500 truncate">{amb.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Volume Slider */}
                <div className="pt-2 flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-neutral-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambianceVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setAmbianceVol(v);
                      spacesSfx.setAmbianceVolume(v);
                    }}
                    className="w-full accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-xs text-neutral-400 w-10 text-right">
                    {Math.round(ambianceVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* Screen Sharing Quick Launcher */}
              {onStartScreenShare && (
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-white">Watch Together / Screen Share</div>
                      <div className="font-mono text-[10px] text-neutral-400">
                        Share your screen or browser tab to stream movies, videos, or slide decks with friends
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onStartScreenShare();
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
                  >
                    Start Share
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DICE ROLLER */}
          {activeTab === "dice" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800 text-center relative overflow-hidden">
                {/* Dice Display Box */}
                <div
                  className={`w-32 h-32 rounded-3xl bg-gradient-to-br from-neutral-900 to-black border-2 border-cyan-500/50 flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/20 transition-transform ${
                    isRolling ? "animate-spin" : "scale-100"
                  }`}
                >
                  <span className="font-mono text-5xl font-black text-cyan-400">
                    {diceValue !== null ? diceValue : "🎲"}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500 uppercase mt-1">
                    d{diceType}
                  </span>
                </div>

                {/* Dice Type Buttons */}
                <div className="flex items-center gap-2 mt-6">
                  <button
                    onClick={() => setDiceType(6)}
                    className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                      diceType === 6
                        ? "bg-cyan-500 text-black border-cyan-400 font-black"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    Classic d6
                  </button>
                  <button
                    onClick={() => setDiceType(20)}
                    className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                      diceType === 20
                        ? "bg-cyan-500 text-black border-cyan-400 font-black"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                    }`}
                  >
                    D&D d20
                  </button>
                </div>

                {/* Roll Action Button */}
                <button
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className="mt-4 px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-mono font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Dice5 className="w-4 h-4" />
                  <span>{isRolling ? "ROLLING..." : "ROLL DICE"}</span>
                </button>
              </div>

              {/* Roll History */}
              {rollHistory.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-neutral-500 font-bold px-1">
                    Recent Rolls
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {rollHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between font-mono text-xs"
                      >
                        <span className="text-cyan-400 font-bold">
                          d{item.type}: {item.val}
                        </span>
                        <span className="text-neutral-500 text-[10px]">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPIN THE BOTTLE & TRUTH OR DARE */}
          {activeTab === "bottle" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 text-center relative">
                {/* Category Pills */}
                <div className="flex items-center gap-2 mb-6">
                  {[
                    { id: "party", label: "🎉 Party & Chaos" },
                    { id: "deep", label: "💬 Deep Connection" },
                    { id: "chaidate", label: "☕ Chai & Date" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setTodCategory(cat.id as any)}
                      className={`px-3 py-1 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                        todCategory === cat.id
                          ? "bg-rose-500 text-white border-rose-400"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Animated Bottle Container */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <div
                    className="w-40 h-40 rounded-full border-2 border-dashed border-neutral-800 flex items-center justify-center transition-transform duration-[2400ms] ease-out"
                    style={{ transform: `rotate(${bottleAngle}deg)` }}
                  >
                    {/* Bottle Sprite */}
                    <div className="w-10 h-32 rounded-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-amber-200 border-2 border-emerald-400 flex flex-col items-center justify-between p-1 shadow-2xl shadow-emerald-500/20">
                      <div className="w-4 h-6 rounded-t bg-amber-300 border border-amber-400" />
                      <span className="font-mono text-[9px] font-black text-emerald-950 uppercase rotate-90">
                        ECHO
                      </span>
                      <div className="w-6 h-6 rounded-full bg-emerald-700 border border-emerald-500" />
                    </div>
                  </div>
                </div>

                {/* Picked Result */}
                {pickedTarget && (
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-xs font-bold animate-bounce">
                    🍾 Bottle points to: @{pickedTarget}!
                  </div>
                )}

                {/* Spin Button */}
                <button
                  onClick={handleSpinBottle}
                  disabled={isSpinningBottle}
                  className="mt-6 px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-mono font-black text-sm flex items-center gap-2 shadow-xl shadow-rose-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isSpinningBottle ? "SPINNING..." : "SPIN BOTTLE"}</span>
                </button>
              </div>

              {/* Truth or Dare Card */}
              {currentTodCard && (
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-md ${
                        currentTodCard.type === "DARE"
                          ? "bg-rose-500 text-black"
                          : currentTodCard.type === "TRUTH"
                          ? "bg-cyan-500 text-black"
                          : "bg-amber-400 text-black"
                      }`}
                    >
                      {currentTodCard.type}
                    </span>
                    <button
                      onClick={() => {
                        const cards = TRUTH_OR_DARE_CARDS[todCategory];
                        setCurrentTodCard(cards[Math.floor(Math.random() * cards.length)]);
                      }}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      Draw Another <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-mono text-sm text-neutral-200 leading-relaxed">
                    "{currentTodCard.text}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BIRTHDAY & CELEBRATION */}
          {activeTab === "birthday" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-neutral-800 flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-6xl animate-bounce">🎂</div>
                <h3 className="font-mono text-xl font-black text-white">
                  Celebrate With Friends In Space
                </h3>
                <p className="font-mono text-xs text-neutral-400 max-w-md">
                  Blast room-wide celebratory confetti, play the fanfare chimes, drop virtual cakes,
                  and let everyone know it's a special moment!
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleCelebrationBlast}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 hover:opacity-90 text-black font-mono font-black text-sm flex items-center gap-2 shadow-xl shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <PartyPopper className="w-4 h-4" />
                    <span>BLAST CONFETTI & FANFARE</span>
                  </button>

                  <button
                    onClick={() => {
                      spacesSfx.playKeyNote(5);
                      if (onServeCake) {
                        onServeCake();
                      } else {
                        onSendSpeech("🎂 Serving birthday cake slices for everyone!");
                      }
                    }}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <Cake className="w-4 h-4" />
                    <span>🎂 Serve Virtual Cake & Cut</span>
                  </button>
                </div>
              </div>

              {/* 1. Birthday Boy & Birthday Girl Dress-Up */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />
                    <span>Birthday Star Dress-Up (Royal Crown & Gala Attire)</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">1-click instant dress-up</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      spacesSfx.playKeyNote(3);
                      onDressBirthday?.("boy");
                    }}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-sky-600/20 via-blue-600/20 to-indigo-600/20 border border-sky-500/40 hover:border-sky-400 text-left transition cursor-pointer flex items-center gap-3 active:scale-95"
                  >
                    <span className="text-3xl">👑</span>
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <span>Dress as Birthday Boy</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/30 text-sky-300 font-mono">VIP</span>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        Gold Crown + Royal Tuxedo + Stardust Aura
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      spacesSfx.playKeyNote(3);
                      onDressBirthday?.("girl");
                    }}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-pink-600/20 via-rose-600/20 to-purple-600/20 border border-pink-500/40 hover:border-pink-400 text-left transition cursor-pointer flex items-center gap-3 active:scale-95"
                  >
                    <span className="text-3xl">👸</span>
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <span>Dress as Birthday Girl</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-pink-500/30 text-pink-300 font-mono">VIP</span>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        Gold Tiara + Rose Gala Gown + Sparkle Flame
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Complete Birthday Party Playbook & Activities */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3 text-left">
                <span className="font-mono text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Birthday Party Activities & Games</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {onOpenCatering && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenCatering();
                      }}
                      className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 text-left transition cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-2xl">🫓</span>
                      <div className="mt-2">
                        <div className="text-xs font-mono font-bold text-white">Dinner Banquet</div>
                        <div className="text-[10px] font-mono text-neutral-400">Naan, Pasta, Hakka, Nachos</div>
                      </div>
                    </button>
                  )}

                  {onOpenSeating && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSeating();
                      }}
                      className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-sky-500/50 text-left transition cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-2xl">🪑</span>
                      <div className="mt-2">
                        <div className="text-xs font-mono font-bold text-white">Auto-Seat Guests</div>
                        <div className="text-[10px] font-mono text-neutral-400">2-16 banquet chairs</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("bottle")}
                    className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/50 text-left transition cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-2xl">🍾</span>
                    <div className="mt-2">
                      <div className="text-xs font-mono font-bold text-white">Spin the Bottle</div>
                      <div className="text-[10px] font-mono text-neutral-400">Truth or Dare</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("dice")}
                    className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 text-left transition cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-2xl">🎲</span>
                    <div className="mt-2">
                      <div className="text-xs font-mono font-bold text-white">3D Dice Roller</div>
                      <div className="text-[10px] font-mono text-neutral-400">d6 and d20 dice</div>
                    </div>
                  </button>

                  {onOpenPartyTableGames && (
                    <>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenPartyTableGames("ludo");
                        }}
                        className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 hover:border-amber-400 text-left transition cursor-pointer flex flex-col justify-between"
                      >
                        <span className="text-2xl">🎲</span>
                        <div className="mt-2">
                          <div className="text-xs font-mono font-bold text-amber-300">Ludo Table Match</div>
                          <div className="text-[10px] font-mono text-neutral-400">4-Player Board + $30 Cash</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenPartyTableGames("antakshari");
                        }}
                        className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 hover:border-emerald-400 text-left transition cursor-pointer flex flex-col justify-between"
                      >
                        <span className="text-2xl">🎤</span>
                        <div className="mt-2">
                          <div className="text-xs font-mono font-bold text-emerald-300">Antakshari Chain</div>
                          <div className="text-[10px] font-mono text-neutral-400">Bollywood sing-along</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenPartyTableGames("raja_mantri");
                        }}
                        className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 hover:border-purple-400 text-left transition cursor-pointer flex flex-col justify-between"
                      >
                        <span className="text-2xl">👑</span>
                        <div className="mt-2">
                          <div className="text-xs font-mono font-bold text-purple-300">Raja Mantri Chor</div>
                          <div className="text-[10px] font-mono text-neutral-400">Royal Indian chits</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenPartyTableGames("rps");
                        }}
                        className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/40 hover:border-sky-400 text-left transition cursor-pointer flex flex-col justify-between"
                      >
                        <span className="text-2xl">✂️</span>
                        <div className="mt-2">
                          <div className="text-xs font-mono font-bold text-sky-300">RPS Clash (1v1)</div>
                          <div className="text-[10px] font-mono text-neutral-400">Rock Paper Scissors</div>
                        </div>
                      </button>
                    </>
                  )}

                  {onOpenUno && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenUno();
                      }}
                      className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/50 text-left transition cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-2xl">🃏</span>
                      <div className="mt-2">
                        <div className="text-xs font-mono font-bold text-white">Multiplayer UNO</div>
                        <div className="text-[10px] font-mono text-neutral-400">Play for $50 Cash</div>
                      </div>
                    </button>
                  )}

                  {onOpenGifting && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenGifting();
                      }}
                      className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-pink-500/50 text-left transition cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-2xl">🎁</span>
                      <div className="mt-2">
                        <div className="text-xs font-mono font-bold text-white">Gift Birthday Star</div>
                        <div className="text-[10px] font-mono text-neutral-400">Roses, Crown, Teddy</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VIRTUAL CHAI DATE & ICEBREAKERS */}
          {activeTab === "icebreakers" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-2">
                    <Coffee className="w-4 h-4" />
                    <span>Virtual Chai Date • Intimate Conversation Cards</span>
                  </span>
                  <span className="font-mono text-xs text-neutral-500">
                    Card {chaiIndex + 1} of {TRUTH_OR_DARE_CARDS.chaidate.length}
                  </span>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/20 to-neutral-950 border border-amber-900/30 min-h-[140px] flex flex-col justify-between">
                  <div className="font-mono text-base text-neutral-100 font-medium leading-relaxed">
                    "{TRUTH_OR_DARE_CARDS.chaidate[chaiIndex].text}"
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-900">
                    <button
                      onClick={() => {
                        spacesSfx.playKeyNote(2);
                        onSendSpeech(`☕ Prompt: "${TRUTH_OR_DARE_CARDS.chaidate[chaiIndex].text}"`);
                      }}
                      className="text-xs font-mono text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Ask In Room Chat</span>
                    </button>

                    <button
                      onClick={() => {
                        spacesSfx.playSitPop();
                        setChaiIndex((prev) => (prev + 1) % TRUTH_OR_DARE_CARDS.chaidate.length);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-lg shadow-amber-500/10"
                    >
                      <span>Next Card</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: POLAROID PHOTO BOOTH */}
          {activeTab === "photobooth" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800 flex flex-col items-center justify-center text-center space-y-4">
                {capturedPhotoUrl ? (
                  <div className="space-y-4">
                    {/* Polaroid Frame */}
                    <div className="bg-white text-black p-3 pb-8 rounded-lg shadow-2xl max-w-sm mx-auto transform -rotate-1 border border-neutral-300">
                      <img
                        src={capturedPhotoUrl}
                        alt="Echo Spaces Polaroid"
                        className="w-full aspect-[4/3] object-cover rounded bg-neutral-950 border border-neutral-200"
                      />
                      <div className="mt-3 text-center">
                        <div className="font-mono text-sm font-black tracking-wider text-neutral-900">
                          {spaceName}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-500">
                          {new Date().toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          • Echo Memories
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={capturedPhotoUrl}
                        download={`echo-space-memory-${Date.now()}.png`}
                        className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Memory</span>
                      </a>
                      <button
                        onClick={handleSnapPhoto}
                        className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-mono text-xs font-bold transition-all cursor-pointer"
                      >
                        Take Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-3xl bg-cyan-950/40 border border-cyan-800 flex items-center justify-center text-cyan-400">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-mono text-base font-black text-white">
                        Group Photo Booth
                      </h3>
                      <p className="font-mono text-xs text-neutral-400 max-w-md mt-1">
                        Gather your friends together anywhere in the room and take a commemorative Polaroid snapshot!
                      </p>
                    </div>

                    <button
                      onClick={handleSnapPhoto}
                      disabled={isCapturing}
                      className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isCapturing ? "CAPTURING..." : "TAKE PHOTO NOW"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
