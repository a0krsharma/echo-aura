"use client";

import React, { useState, useEffect } from "react";
import { type ArcadeMatch } from "@/lib/arcade";
import { soundSynth } from "@/lib/soundSynthesizer";
import { useAuth } from "@/app/components/AuthProvider";
import { searchUsersByHandle, startOrGetWire, sendWire } from "@/lib/wire";
import { sendArcadeChallenge } from "@/lib/arcadeChallenges";
import {
  X,
  Copy,
  Check,
  Share2,
  Mic2,
  Users,
  Trophy,
  MessageSquare,
  Sparkles,
  QrCode,
  Smartphone,
  ExternalLink,
  Flame,
  Search,
  Swords,
  Send,
  Loader2,
} from "lucide-react";

interface ArcadeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: ArcadeMatch;
}

const GAME_NAMES: Record<string, string> = {
  hand_cricket: "Hand Cricket",
  raja_mantri: "Raja Mantri Chor Sipahi",
  uno: "Uno",
  ludo: "15x15 Cyber Ludo",
  chess: "Chess",
  rummy: "Indian 13-Card Rummy",
  call_break: "Call Break",
  teen_patti: "Teen Patti",
  satte_pe_satta: "Satte Pe Satta",
  bhabhi_thulla: "Bhabhi / Thulla",
  mendicot: "Mendicot",
  cheat_bluff: "Cheat / Bluff",
  solitaire: "Solitaire",
  poker: "Texas Hold'em Poker",
  blackjack: "Blackjack 21",
  connect4: "Connect 4",
  gomoku: "Gomoku",
  reversi: "Reversi",
  dots_and_boxes: "Dots & Boxes",
  snakes_and_ladders: "Snakes & Ladders",
  trivia: "Signal Trivia",
  skribbl: "Skribbl",
  bingo: "Bingo",
  book_cricket: "Book Cricket",
};

export default function ArcadeInviteModal({
  isOpen,
  onClose,
  match,
}: ArcadeInviteModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"search" | "social" | "link">("search");
  
  // Search & Invite State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ uid: string; handle: string; photoUrl?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [invitedUids, setInvitedUids] = useState<Set<string>>(new Set());
  const [invitingUid, setInvitingUid] = useState<string | null>(null);

  // Link & Share State
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [selectedTauntIndex, setSelectedTauntIndex] = useState(0);

  // Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsersByHandle(searchQuery.trim());
        setSearchResults(results.filter((u) => u.uid !== user?.uid));
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.uid]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const gameDisplayName = (match?.gameType && GAME_NAMES[match.gameType]) || (match?.gameType ? match.gameType.toUpperCase() : "ARENA");
  
  // Direct frictionless join link
  const inviteUrl = match.roomId
    ? `${origin}/room/${match.roomId}?matchId=${match.id}`
    : `${origin}/arcade?matchId=${match.id}`;

  const tauntOptions = [
    `🔥 I am on a win-streak in ${gameDisplayName}! Step up and join the arena (Mic ON, 0MB install): ${inviteUrl}`,
    `⚡ Match me in ${gameDisplayName} right now (no download needed). Mic is on: ${inviteUrl}`,
    `🏆 Bet you can't beat me in ${gameDisplayName}! ${match.stakes} Aura on the line (Voice Live): ${inviteUrl}`,
  ];

  const whatsappChallengeText = tauntOptions[selectedTauntIndex];
  const shareTitle = `🎮 Challenge me in ${gameDisplayName} on Echo!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      soundSynth.playSubtlePop();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    soundSynth.playSubtlePop();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: whatsappChallengeText,
          url: inviteUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyCard = async () => {
    const cardText = `🔥 ECHO ARENA // 1-TAP CHALLENGE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕹️ Game: ${gameDisplayName.toUpperCase()}\n👑 Host: ${match.hostHandle}\n🎙️ Audio: LIVE MIC CHAT ENABLED (NO APP DOWNLOAD NEEDED)\n⚡ Stakes: ${match.stakes} AURA\n🔗 Tap to Play & Talk: ${inviteUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    try {
      await navigator.clipboard.writeText(cardText);
      setCopiedCard(true);
      soundSynth.playSubtlePop();
      setTimeout(() => setCopiedCard(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDirectInvite = async (targetUser: { uid: string; handle: string }) => {
    if (!user || invitingUid) return;
    setInvitingUid(targetUser.uid);
    soundSynth.playFanfare();

    try {
      // 1. Send Wire DM with direct game join link
      const convId = await startOrGetWire(
        user.uid,
        targetUser.uid,
        user.handle || "@PLAYER",
        targetUser.handle
      );

      const challengeMessage = `🎮 ARCADE CHALLENGE INVITE!\nI challenged you to a game of ${gameDisplayName} (${match.stakes} AURA on the line).\n\n🎙️ Live Mic is ON. Tap to play directly in browser:\n${inviteUrl}`;
      await sendWire(convId, user.uid, user.handle || "@PLAYER", challengeMessage);

      // 2. Trigger In-App Challenge Push
      await sendArcadeChallenge({
        challengerId: user.uid,
        challengerHandle: user.handle || "@PLAYER",
        challengerPhotoUrl: user.photoUrl,
        targetUserId: targetUser.uid,
        targetHandle: targetUser.handle,
        gameType: match.gameType || "ludo",
        gameName: gameDisplayName,
        roomId: match.roomId || `room_${match.id}`,
        matchId: match.id,
        trashTalkText: tauntOptions[selectedTauntIndex],
      });

      setInvitedUids((prev) => new Set([...prev, targetUser.uid]));
    } catch (err) {
      console.error("Direct invite error:", err);
    } finally {
      setInvitingUid(null);
    }
  };

  const currentCount = Object.keys(match.players || {}).length;
  const maxPlayers = match.maxPlayers || 4;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}&color=ffffff&bgcolor=000000`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-950 border-2 border-white p-5 sm:p-7 font-mono text-white shadow-[0_0_60px_rgba(255,255,255,0.25)] select-none max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white hover:border-white transition-colors cursor-pointer rounded-lg shadow"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 border-b border-neutral-800 pb-3.5 pr-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400">
            <Swords className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            <span>// ECHO ARENA • CHALLENGE &amp; INVITE</span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase text-white truncate">
            {match.title || `${gameDisplayName.toUpperCase()} MATCH`}
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-bold">
            <span>🎮 {gameDisplayName}</span>
            <span>•</span>
            <span className="text-yellow-400">⚡ {match.stakes} AURA</span>
            <span>•</span>
            <span className="text-emerald-400">🎙️ LIVE MIC</span>
          </div>
        </div>

        {/* 3-Tab Navigator */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black border border-neutral-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "search"
                ? "bg-white text-black shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>WHO TO INVITE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("social")}
            className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "social"
                ? "bg-white text-black shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SOCIAL / WA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "link"
                ? "bg-white text-black shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>LINK &amp; QR</span>
          </button>
        </div>

        {/* ── TAB 1: SEARCH & DIRECT IN-APP WIRE INVITE ── */}
        {activeTab === "search" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <label className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-white" />
                <span>SEARCH ECHO PLAYERS BY HANDLE:</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type @username to challenge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border border-neutral-700 focus:border-white px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 rounded-xl outline-none transition-all shadow-inner"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-neutral-400 animate-spin absolute right-3 top-3" />
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {searchQuery.trim() && searchResults.length === 0 && !searching && (
                <div className="p-4 bg-black/60 border border-neutral-900 rounded-xl text-center text-xs text-neutral-500">
                  No users found matching "{searchQuery}". Share the direct link or invite via WhatsApp below!
                </div>
              )}

              {!searchQuery.trim() && (
                <div className="p-4 bg-black/60 border border-neutral-900 rounded-xl text-center space-y-1">
                  <p className="text-xs text-neutral-300 font-bold">Search anyone on Echo to send a live invite</p>
                  <p className="text-[10px] text-neutral-500">
                    They will receive a direct 1-tap challenge in their Wire messages and live notification!
                  </p>
                </div>
              )}

              {searchResults.map((target) => {
                const isInvited = invitedUids.has(target.uid);
                const isPending = invitingUid === target.uid;

                return (
                  <div
                    key={target.uid}
                    className="p-3 bg-black border border-neutral-800 hover:border-neutral-700 rounded-xl flex items-center justify-between gap-3 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0 shadow">
                        {target.handle.replace(/^@/, "").charAt(0).toUpperCase() || "P"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">{target.handle}</p>
                        <p className="text-[10px] text-neutral-400 truncate">Echo Competitor</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isInvited || isPending}
                      onClick={() => handleDirectInvite(target)}
                      className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow active:scale-95 shrink-0 ${
                        isInvited
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-white text-black hover:bg-neutral-200 border border-white"
                      }`}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>SENDING...</span>
                        </>
                      ) : isInvited ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>INVITED ✓</span>
                        </>
                      ) : (
                        <>
                          <Swords className="w-3.5 h-3.5" />
                          <span>[ ⚔️ INVITE ]</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Match Slots & Audio Badge */}
            <div className="border border-white/20 bg-black/60 p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span className="font-bold text-white text-[11px] uppercase">
                  MIC ON • INSTANT LIVE PLAY
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono font-bold">
                {currentCount}/{maxPlayers} SLOTS FILLED
              </span>
            </div>
          </div>
        )}

        {/* ── TAB 2: SOCIAL CHANNELS & VIRAL WHATSAPP TAUNTS ── */}
        {activeTab === "social" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Taunt Template Selector */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                CHOOSE TAUNT FOR CHAT APPS:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {["🔥 WIN STREAK", "⚡ 1-TAP PLAY", "🏆 AURA STAKES"].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSelectedTauntIndex(idx)}
                    className={`py-2 px-1.5 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer text-center ${
                      selectedTauntIndex === idx
                        ? "bg-white text-black border-white shadow-md font-extrabold"
                        : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 1-Tap WhatsApp Button */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappChallengeText)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => soundSynth.playAirhorn()}
              className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(37,211,102,0.4)] flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <span className="text-lg">💬</span>
              <span>INVITE ON WHATSAPP (1-TAP)</span>
            </a>

            {/* Social Grid */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(whatsappChallengeText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 border border-neutral-800 bg-black hover:border-white text-white font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-xl"
              >
                <span>✈️ TELEGRAM</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(whatsappChallengeText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 border border-neutral-800 bg-black hover:border-white text-white font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-xl"
              >
                <span>🐦 X / TWITTER</span>
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="p-2.5 border border-neutral-800 bg-black hover:border-white text-white font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer rounded-xl"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>MORE...</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 3: DIRECT LINK & QR CODE ── */}
        {activeTab === "link" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Copy Link Input Bar */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-neutral-400 font-bold tracking-widest">
                DIRECT ONE-TAP CHALLENGE LINK
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="w-full bg-black border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-white select-all rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 border-2 border-white bg-white text-black hover:bg-neutral-200 font-black text-xs uppercase transition-all shrink-0 flex items-center gap-1.5 cursor-pointer rounded-xl shadow active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Copy Markdown Terminal Card */}
            <button
              type="button"
              onClick={handleCopyCard}
              className="w-full py-2.5 border border-dashed border-neutral-700 bg-black hover:border-white text-neutral-300 hover:text-white font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer rounded-xl"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{copiedCard ? "✓ TERMINAL CARD COPIED!" : "[ COPY FORMATTED GROUP CHAT CARD ]"}</span>
            </button>

            {/* QR Code Toggle */}
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="w-full py-2 border border-neutral-800 bg-black hover:border-white text-white font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer rounded-xl"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>{showQr ? "HIDE QR CODE" : "SHOW ROOM QR CODE (FOR DORM / HOSTEL)"}</span>
            </button>

            {showQr && (
              <div className="p-4 bg-black border-2 border-white rounded-2xl text-center space-y-2 animate-in fade-in">
                <p className="text-[10px] text-neutral-400 uppercase font-black">
                  SCAN WITH PHONE CAMERA TO DROP IN INSTANTLY
                </p>
                <img
                  src={qrUrl}
                  alt="Arcade Match QR Code"
                  className="w-36 h-36 mx-auto border-2 border-white rounded-xl p-1 bg-black shadow"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
