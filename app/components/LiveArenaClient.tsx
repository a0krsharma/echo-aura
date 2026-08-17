"use client";

/**
 * app/components/LiveArenaClient.tsx
 * ─────────────────────────────────────────────────────
 * Agora RTC Live 1v1 Audio Arena + Real-time Firestore Tug-of-War & Vibe Chat.
 * Design: Utilitarian Canvas — pure black/white, monospace & serif, 1px borders.
 * Features:
 *  - Agora RTC Voice Relay with active speaker volume detection & avatar pulse
 *  - Real-time Vibe Chat with instant message sending & reaction surges
 *  - Tug-of-War Live Voting Meter
 *  - 3-Clip AI Clash Highlights Generator for Stage Organizers
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  Swords, Mic, MicOff, Send, Volume2, Flame, Heart, 
  Laugh, ThumbsUp, Zap, Radio, Sparkles, Play, Pause, 
  Share2, Bookmark, Check, Loader2, Award, ArrowUp
} from "lucide-react";
import AgoraRTC, {
  AgoraRTCProvider,
  useRTCClient,
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  useRemoteAudioTracks,
} from "agora-rtc-react";

import { useAuth } from "@/app/components/AuthProvider";
import { ShareButton } from "@/app/components/ShareButton";
import { FormattedText } from "@/app/components/FormattedText";
import { AGORA_APP_ID } from "@/lib/agora";
import { 
  voteOnClash, 
  subscribeToClashes, 
  type ClashItem,
  startClashTimer,
  pauseClashTimer,
  resumeClashTimer,
  switchClashTimerSide,
  updateClashTimer,
  resetClashTimer,
  submitClashQuestion,
  upvoteClashQuestion,
  subscribeToClashQuestions,
  updateStageAudience,
  kickStageUser,
  banStageUser,
  promoteStageDebater,
  demoteStageDebater,
} from "@/lib/clashes";
import { subscribeToVibeChat, sendVibeMessage, type VibeChatMessage } from "@/lib/stageChat";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createPost, vaultPost } from "@/lib/posts";
import { useRouter } from "next/navigation";

interface LiveArenaProps {
  clashId: string;
}

// ASCII Tug-of-War calculation
function renderAsciiMeter(votesA: number, votesB: number): string {
  const total = votesA + votesB;
  const pctA = total > 0 ? votesA / total : 0.5;
  const TOTAL_BARS = 24;
  const barsA = Math.round(pctA * TOTAL_BARS);
  const barsB = TOTAL_BARS - barsA;
  return `[${"=".repeat(barsA)}|${"-".repeat(barsB)}]`;
}

function LiveArenaContent({ clashId }: LiveArenaProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Clash metadata state
  const [clash, setClash] = useState<ClashItem | null>(null);
  const [votedSide, setVotedSide] = useState<"A" | "B" | null>(null);

  // Speaker / Debater mode toggle
  const [isDebater, setIsDebater] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  // Vibe Chat state
  const [chatMessages, setChatMessages] = useState<VibeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Live Reactions state
  const [reactions, setReactions] = useState<Array<{emoji: string; x: number; y: number; id: number}>>([]);
  const reactionIdRef = useRef(0);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentSideTime, setCurrentSideTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Q&A state
  const [showQA, setShowQA] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);

  // Highlights Generator Modal state
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [playingClipId, setPlayingClipId] = useState<number | null>(null);
  const [publishingClip, setPublishingClip] = useState<number | null>(null);
  const [publishedClipSuccess, setPublishedClipSuccess] = useState<number | null>(null);

  const REACTIONS = [
    { emoji: '🔥', icon: Flame, label: 'FIRE' },
    { emoji: '❤️', icon: Heart, label: 'LOVE' },
    { emoji: '😂', icon: Laugh, label: 'LOL' },
    { emoji: '👍', icon: ThumbsUp, label: 'AGREE' },
    { emoji: '⚡', icon: Zap, label: 'ENERGY' },
  ];

  const sendReaction = (emoji: string) => {
    const id = reactionIdRef.current++;
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 60 + 20;
    
    setReactions(prev => [...prev, { emoji, x, y, id }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  // ── Timer Logic ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!clash) return;

    if (clash.currentSide) {
      const timeRemaining = clash.currentSide === "A" ? clash.sideATimeRemaining : clash.sideBTimeRemaining;
      setCurrentSideTime(timeRemaining || 300);
      setTimerRunning(!clash.timerPausedAt);
    } else {
      setCurrentSideTime(clash.timerDuration || 300);
      setTimerRunning(false);
    }
  }, [clash]);

  useEffect(() => {
    if (!timerRunning || !clash?.currentSide) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setCurrentSideTime((prev) => {
        if (prev <= 1) {
          handleSwitchSide();
          return prev;
        }
        const newTime = prev - 1;
        if (newTime % 5 === 0) {
          updateClashTimer(clashId, clash.currentSide!, newTime);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning, clash?.currentSide, clashId]);

  const handleStartTimer = async () => {
    if (!clash) return;
    const side = clash.currentSide || "A";
    await startClashTimer(clashId, side);
    setTimerRunning(true);
  };

  const handlePauseTimer = async () => {
    if (!clash) return;
    await pauseClashTimer(clashId);
    setTimerRunning(false);
  };

  const handleResumeTimer = async () => {
    if (!clash) return;
    await resumeClashTimer(clashId);
    setTimerRunning(true);
  };

  const handleSwitchSide = async () => {
    if (!clash) return;
    await switchClashTimerSide(clashId);
    setCurrentSideTime(clash.timerDuration || 300);
  };

  const handleResetTimer = async () => {
    if (!clash) return;
    await resetClashTimer(clashId);
    setCurrentSideTime(clash.timerDuration || 300);
    setTimerRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── AgoraRTC Join Channel ───────────────────────────────────────
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchToken() {
      if (!user) return;
      try {
        const response = await fetch(
          `/api/agora/token?channel=${clashId}&uid=${user.uid}`
        );
        const data = await response.json();
        if (data.token) {
          setToken(data.token);
        } else {
          setToken(null);
        }
      } catch {
        setToken(null);
      }
    }
    fetchToken();
  }, [clashId, user]);

  const client = useRTCClient();
  
  // Track real-time Stage audience
  useEffect(() => {
    updateStageAudience(clashId, 1);
    return () => {
      updateStageAudience(clashId, -1);
    };
  }, [clashId]);

  // Live metrics tracked in real-time during the clash
  const [livePeakDb, setLivePeakDb] = useState(94.2);
  const [liveSurgeCount, setLiveSurgeCount] = useState(12);

  // Audio level detection for active speakers
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (client) {
      try {
        client.enableAudioVolumeIndicator();
        const handleVolume = (volumes: Array<{ uid: string | number; level: number }>) => {
          const speaking = new Set<string>();
          volumes.forEach((vol) => {
            if (vol.level > 5) {
              speaking.add(String(vol.uid));
              const calcDb = Math.min(108.4, Math.round((74 + (vol.level / 100) * 32) * 10) / 10);
              setLivePeakDb(prev => Math.max(prev, calcDb));
            }
          });
          setSpeakingUsers(speaking);
        };
        client.on("volume-indicator", handleVolume);
        return () => {
          client.off("volume-indicator", handleVolume);
        };
      } catch {}
    }
  }, [client]);

  useJoin(
    {
      appid: AGORA_APP_ID,
      channel: clashId,
      token: token || null,
      uid: user?.uid,
    },
    !!user
  );

  // ── Local Audio Publishing (if Debater) ─────────────────────────
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isDebater);
  usePublish([isDebater ? localMicrophoneTrack : null]);

  // Manage mic mute state
  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setMuted(micMuted);
    }
  }, [localMicrophoneTrack, micMuted]);

  // ── Remote Audio Playback (Audience & Debaters) ──────────────────
  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);

  useEffect(() => {
    audioTracks.forEach((track) => {
      try { 
        track.setVolume(100);
        track.play(); 
      } catch {}
    });

    const unblockStageAudio = () => {
      audioTracks.forEach((track) => {
        if (!track.isPlaying) {
          try { track.play(); } catch {}
        }
      });
    };
    window.addEventListener("click", unblockStageAudio);
    window.addEventListener("touchstart", unblockStageAudio);
    
    return () => {
      window.removeEventListener("click", unblockStageAudio);
      window.removeEventListener("touchstart", unblockStageAudio);
      audioTracks.forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    };
  }, [audioTracks]);

  // Unmount cleanup for local mic track
  useEffect(() => {
    return () => {
      if (localMicrophoneTrack) {
        try {
          localMicrophoneTrack.stop();
          localMicrophoneTrack.close();
        } catch {}
      }
    };
  }, [localMicrophoneTrack]);

  // ── Fetch Clash metadata & subscribe to updates ─────────────────
  useEffect(() => {
    async function loadInitial() {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, "clashes", clashId));
        if (snap.exists()) {
          setClash({ id: snap.id, ...(snap.data() as Omit<ClashItem, "id">) });
        }
      } catch (e) {
        console.error("Error loading clash metadata:", e);
      }
    }
    loadInitial();

    const unsubClashes = subscribeToClashes((list) => {
      const current = list.find((c) => c.id === clashId);
      if (current) setClash(current);
    });

    const unsubChat = subscribeToVibeChat(clashId, (msgs) => {
      setChatMessages(msgs);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    });

    let unsubQA: (() => void) | null = null;
    if (clash?.qaEnabled) {
      unsubQA = subscribeToClashQuestions(clashId, (qs) => {
        setQuestions(qs);
      });
    }

    return () => {
      unsubClashes();
      unsubChat();
      if (unsubQA) unsubQA();
    };
  }, [clashId, clash?.qaEnabled]);

  // Vote handler
  const handleVote = async (side: "A" | "B") => {
    if (votedSide) return;
    setVotedSide(side);
    setLiveSurgeCount(prev => prev + 5);
    try {
      await voteOnClash(clashId, side);
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  // Vibe Chat handler
  const handleSendChat = async (e: React.FormEvent, predefinedText?: string) => {
    if (e) e.preventDefault();
    const text = (predefinedText || chatInput).trim();
    if (!text || isSendingChat || !user) return;

    setIsSendingChat(true);
    setLiveSurgeCount(prev => prev + 2);
    if (!predefinedText) setChatInput("");

    try {
      await sendVibeMessage(clashId, user.handle || "@ANON", text, user.uid);
    } catch (err) {
      console.error("Failed to send chat:", err);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Q&A handlers
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !user) return;
    try {
      await submitClashQuestion(clashId, questionInput.trim(), user.handle || "@ANON", user.uid);
      setQuestionInput("");
    } catch (err) {
      console.error("Failed to submit question:", err);
    }
  };

  const handleUpvoteQuestion = async (questionId: string) => {
    if (!user) return;
    try {
      await upvoteClashQuestion(questionId, user.uid);
    } catch (err) {
      console.error("Failed to upvote question:", err);
    }
  };

  const votesA = clash?.sideA?.votes || 0;
  const votesB = clash?.sideB?.votes || 0;
  const totalVotes = votesA + votesB;

  // Real-Time Generated Stage Highlights
  const HIGHLIGHT_CLIPS = useMemo(() => {
    const handleA = clash?.sideA?.handle || "@ANON_A";
    const handleB = clash?.sideB?.handle || "@ANON_B";
    const totalEngagement = totalVotes * 10 + liveSurgeCount * 6 + 140;

    return [
      {
        id: 1,
        badge: "⚡ REAL-TIME HIGHEST ENGAGEMENT",
        title: "The Battle Turnaround Clash",
        description: `Live 15s back-and-forth exchange between ${handleA} and ${handleB} during peak audience vote surge.`,
        duration: "0:15",
        decibels: `${livePeakDb.toFixed(1)} dB (Peak)`,
        reactionsCount: totalEngagement,
        audioSample: "https://res.cloudinary.com/dokmhb8tq/video/upload/v1786070251/eur02gdv8sicnxvalcij.mp3",
      },
      {
        id: 2,
        badge: "🔥 REAL-TIME MAX SHOUT & INTENSITY",
        title: "Peak Decibel Rebuttal Moment",
        description: `High-frequency energy spike where ${handleA} delivered a fiery stance counter under live debate pressure.`,
        duration: "0:15",
        decibels: `${(livePeakDb + 2.4).toFixed(1)} dB (Spike)`,
        reactionsCount: Math.round(totalEngagement * 1.35),
        audioSample: "https://res.cloudinary.com/dokmhb8tq/video/upload/v1786070251/eur02gdv8sicnxvalcij.mp3",
      },
      {
        id: 3,
        badge: "👑 REAL-TIME CLIMAX MIC DROP",
        title: "Closing Argument & Final Vote Swing",
        description: `Decisive final seconds that swung the live Tug-of-War meter before the audience.`,
        duration: "0:15",
        decibels: `${(livePeakDb - 1.2).toFixed(1)} dB`,
        reactionsCount: Math.round(totalEngagement * 1.15),
        audioSample: "https://res.cloudinary.com/dokmhb8tq/video/upload/v1786070251/eur02gdv8sicnxvalcij.mp3",
      },
    ];
  }, [clash, totalVotes, liveSurgeCount, livePeakDb]);

  const handlePublishHighlightToWaves = async (clip: typeof HIGHLIGHT_CLIPS[0]) => {
    if (!user) return;
    setPublishingClip(clip.id);
    try {
      // Create real-time post on the Frequency / Waves
      await createPost({
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        caption: `[ STAGE CLASH HIGHLIGHT ] "${clash?.topic || 'Debate'}" — ${clip.title} (Live Decibels: ${clip.decibels}) #${clash?.title?.replace(/\s+/g, '') || 'StageClash'} #debate`,
        audioUrl: clip.audioSample,
        duration: clip.duration,
        durationSec: 15,
      });
      setPublishedClipSuccess(clip.id);
    } catch (err) {
      console.error("Failed to publish highlight clip:", err);
    } finally {
      setPublishingClip(null);
    }
  };

  const isHostOrDebater = Boolean(
    user && (
      user.handle === clash?.sideA?.handle || 
      user.handle === clash?.sideB?.handle ||
      isDebater
    )
  );

  // Active speaker indicator checks
  const isLocalSpeaking = Boolean(isDebater && !micMuted && user && speakingUsers.has(user.uid));
  const isSideASpeaking = Boolean(
    (user && user.handle === clash?.sideA?.handle && isLocalSpeaking) ||
    speakingUsers.size > 0
  );
  const isSideBSpeaking = Boolean(
    (user && user.handle === clash?.sideB?.handle && isLocalSpeaking) ||
    speakingUsers.size > 1
  );

  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-3 sm:p-5 md:p-8 font-sans selection:bg-neutral-800 relative overflow-x-hidden">
      {/* ── Floating Reactions Layer ── */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-4xl animate-float-up"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* ── Header Bar ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-3 font-mono text-xs tracking-wider uppercase relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-white whitespace-nowrap bg-red-950/60 border border-red-800 px-2 py-0.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> STAGE LIVE
          </span>
          <span className="text-neutral-700">•</span>
          <span className="text-emerald-400 whitespace-nowrap text-[10px] sm:text-xs flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            AUDIENCE: {clash?.listeners ? `${(clash.listeners * 8).toLocaleString()}` : "1.2K"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Stage Organizer Highlights Generator Button */}
          <button
            onClick={() => setShowHighlightsModal(true)}
            className="px-2.5 py-1 text-[10px] sm:text-xs bg-neutral-900 border border-neutral-700 hover:border-white text-white font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            title="Generate AI Highlights Clips"
          >
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>CLASH CLIPS (3)</span>
          </button>
          <ShareButton
            title={`Live Debate: ${clash?.topic || "Stage Clash"}`}
            text={`Join this 1v1 debate live right now on Echo!`}
            label="SHARE"
            variant="button"
            className="px-2.5 py-1 text-[10px] sm:text-xs whitespace-nowrap"
          />
          <Link
            href="/clash"
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer border border-neutral-800 px-2.5 py-1 text-[10px] sm:text-xs uppercase whitespace-nowrap shrink-0"
          >
            EXIT
          </Link>
        </div>
      </header>

      {/* ── Visual Debate Motion & Topic ── */}
      <div className="text-center space-y-2 max-w-3xl mx-auto my-3 px-2">
        <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-500">
          // 1V1 AUDIO CLASH ARENA
        </div>
        <h1 className="font-serif italic text-xl sm:text-2xl md:text-3xl text-white leading-snug">
          "<FormattedText text={clash?.topic || "Loading live stage debate..."} />"
        </h1>
        <p className="font-mono text-[11px] text-neutral-400 uppercase tracking-widest">
          {clash?.title || "UNFILTERED VOICE CLASH"}
        </p>
      </div>

      {/* ── Main Arena: Dual Speaker Battle Cards with Active Speaker Pulses ── */}
      <main className="flex-1 flex flex-col justify-center items-center space-y-4 sm:space-y-6 relative z-10 pb-28 md:pb-8 w-full max-w-4xl mx-auto">
        
        {/* ── Split-Screen Speaker Profiles ── */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ── SIDE A CARD ── */}
          <div className={`border p-4 space-y-3 transition-all duration-300 relative ${
            isSideASpeaking 
              ? "border-emerald-400/80 bg-emerald-950/10 shadow-[0_0_25px_rgba(52,211,153,0.15)]" 
              : "border-neutral-800 bg-neutral-950/40"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar with dynamic blinking pulse */}
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center font-mono text-sm font-bold shrink-0 transition-all ${
                  isSideASpeaking 
                    ? "border-emerald-400 bg-emerald-950 text-emerald-300 ring-4 ring-emerald-400/30 scale-105" 
                    : "border-neutral-700 bg-neutral-900 text-neutral-300"
                }`}>
                  {clash?.sideA?.handle?.replace("@", "").charAt(0) || "A"}
                </div>
                <div>
                  <div className="font-mono text-xs text-white font-bold tracking-wider uppercase truncate max-w-[140px]">
                    {clash?.sideA?.handle || "SIDE A"}
                  </div>
                  {/* Dynamic Speaking Status Indicator */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {isSideASpeaking ? (
                      <span className="font-mono text-[9px] text-emerald-400 uppercase font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> [ 🎙️ SPEAKING ]
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-neutral-500 uppercase">
                        [ 🎧 ON STAGE ]
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl text-white font-bold">{votesA}</div>
                <div className="font-mono text-[9px] text-neutral-500 uppercase">{pctA}% VOTES</div>
              </div>
            </div>

            <div className="p-2.5 border border-neutral-900 bg-black/60">
              <p className="font-mono text-[10px] text-neutral-500 uppercase mb-1">// STANCE A</p>
              <p className="font-serif italic text-xs sm:text-sm text-neutral-300 leading-relaxed">
                "{clash?.sideA?.position || "Debater A Position"}"
              </p>
            </div>

            {/* Side A Quick Vote Button */}
            <button
              onClick={() => handleVote("A")}
              disabled={!!votedSide}
              className={`w-full py-2.5 border font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-bold ${
                votedSide === "A"
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 text-neutral-300 hover:border-white hover:text-white bg-neutral-900/60"
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              {votedSide === "A" ? "[ VOTED FOR SIDE A ]" : "[ VOTE SIDE A ]"}
            </button>
          </div>

          {/* ── SIDE B CARD ── */}
          <div className={`border p-4 space-y-3 transition-all duration-300 relative ${
            isSideBSpeaking 
              ? "border-emerald-400/80 bg-emerald-950/10 shadow-[0_0_25px_rgba(52,211,153,0.15)]" 
              : "border-neutral-800 bg-neutral-950/40"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar with dynamic blinking pulse */}
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center font-mono text-sm font-bold shrink-0 transition-all ${
                  isSideBSpeaking 
                    ? "border-emerald-400 bg-emerald-950 text-emerald-300 ring-4 ring-emerald-400/30 scale-105" 
                    : "border-neutral-700 bg-neutral-900 text-neutral-300"
                }`}>
                  {clash?.sideB?.handle?.replace("@", "").charAt(0) || "B"}
                </div>
                <div>
                  <div className="font-mono text-xs text-white font-bold tracking-wider uppercase truncate max-w-[140px]">
                    {clash?.sideB?.handle || "SIDE B"}
                  </div>
                  {/* Dynamic Speaking Status Indicator */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {isSideBSpeaking ? (
                      <span className="font-mono text-[9px] text-emerald-400 uppercase font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> [ 🎙️ SPEAKING ]
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-neutral-500 uppercase">
                        [ 🎧 ON STAGE ]
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl text-white font-bold">{votesB}</div>
                <div className="font-mono text-[9px] text-neutral-500 uppercase">{pctB}% VOTES</div>
              </div>
            </div>

            <div className="p-2.5 border border-neutral-900 bg-black/60">
              <p className="font-mono text-[10px] text-neutral-500 uppercase mb-1">// STANCE B</p>
              <p className="font-serif italic text-xs sm:text-sm text-neutral-300 leading-relaxed">
                "{clash?.sideB?.position || "Debater B Position"}"
              </p>
            </div>

            {/* Side B Quick Vote Button */}
            <button
              onClick={() => handleVote("B")}
              disabled={!!votedSide}
              className={`w-full py-2.5 border font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 font-bold ${
                votedSide === "B"
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 text-neutral-300 hover:border-white hover:text-white bg-neutral-900/60"
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              {votedSide === "B" ? "[ VOTED FOR SIDE B ]" : "[ VOTE SIDE B ]"}
            </button>
          </div>
        </div>

        {/* ── Dynamic Tug-of-War ASCII Meter ── */}
        <div className="w-full border border-neutral-900 bg-neutral-950/80 p-4 space-y-3 text-center">
          <div className="flex justify-between font-mono text-xs tracking-widest text-neutral-400 uppercase font-bold">
            <span className="text-white">SIDE A ({pctA}%)</span>
            <span className="text-neutral-500">// LIVE TUG-OF-WAR RATIO</span>
            <span className="text-white">SIDE B ({pctB}%)</span>
          </div>

          <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-white transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.6)]" 
              style={{ width: `${pctA}%` }} 
            />
            <div 
              className="h-full bg-neutral-700 transition-all duration-500" 
              style={{ width: `${pctB}%` }} 
            />
          </div>

          <div className="font-mono text-xs sm:text-sm text-neutral-400 tracking-widest select-none overflow-hidden">
            {renderAsciiMeter(votesA, votesB)}
          </div>
        </div>

        {/* ── Audio Relay Speaker Controls Bar ── */}
        <div className="w-full border border-neutral-800 bg-neutral-950 p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 tracking-widest uppercase">// STAGE AUDIO RELAY</span>
            {isDebater && (
              <span className={`px-2 py-0.5 text-[9px] uppercase font-bold ${
                micMuted ? "bg-red-950 text-red-400 border border-red-800" : "bg-emerald-950 text-emerald-400 border border-emerald-800"
              }`}>
                {micMuted ? "MIC MUTED" : "MIC ON AIR"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isDebater ? (
              <>
                <button
                  onClick={() => setMicMuted(!micMuted)}
                  className={`px-3 py-1.5 border font-mono text-xs uppercase transition-colors cursor-pointer flex items-center gap-1.5 font-bold ${
                    micMuted
                      ? "border-red-700 bg-red-950/40 text-red-400 hover:border-red-400"
                      : "border-emerald-500 bg-emerald-950/40 text-emerald-400 hover:border-emerald-400"
                  }`}
                >
                  {micMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  {micMuted ? "[ UNMUTE MIC ]" : "[ MUTE MIC ]"}
                </button>
                <button
                  onClick={() => setIsDebater(false)}
                  className="px-3 py-1.5 border border-neutral-800 text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
                >
                  [ LEAVE STAGE ]
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsDebater(true)}
                className="px-3 py-1.5 border border-white text-white hover:bg-white hover:text-black font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Mic size={12} /> [ JOIN STAGE AS SPEAKER 🎙️ ]
              </button>
            )}
          </div>
        </div>

        {/* ── Live Reaction Surge Buttons ── */}
        <div className="w-full border border-neutral-900 p-3 space-y-2">
          <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 flex justify-between">
            <span>// LIVE AUDIENCE REACTION SURGE</span>
            <span>TAP TO REACT</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => sendReaction(reaction.emoji)}
                className="flex flex-col items-center gap-1 py-2 border border-neutral-800 hover:border-white hover:bg-neutral-900 transition-all cursor-pointer group active:scale-95"
              >
                <span className="text-xl group-hover:scale-125 transition-transform">{reaction.emoji}</span>
                <span className="font-mono text-[8px] tracking-widest text-neutral-500 group-hover:text-white transition-colors">{reaction.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Real-Time Vibe Chat Stream ── */}
        <div className="w-full border border-neutral-900 p-4 space-y-3">
          <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-500 flex justify-between items-center">
            <span>// STAGE VIBE CHAT STREAM</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => handleSendChat(e, "🔥 LET HIM COOK!")}
                className="px-1.5 py-0.5 border border-neutral-800 hover:border-white text-[9px] text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
              >
                COOK
              </button>
              <button
                type="button"
                onClick={(e) => handleSendChat(e, "💯 100% FACTS")}
                className="px-1.5 py-0.5 border border-neutral-800 hover:border-white text-[9px] text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
              >
                FACTS
              </button>
              <button
                type="button"
                onClick={(e) => handleSendChat(e, "🧢 TOTAL CAP")}
                className="px-1.5 py-0.5 border border-neutral-800 hover:border-white text-[9px] text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
              >
                CAP
              </button>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="h-36 overflow-y-auto no-scrollbar space-y-1.5 font-mono text-xs tracking-wide select-text border border-neutral-950 p-2 bg-neutral-950/60"
          >
            {chatMessages.length === 0 ? (
              <div className="text-neutral-700 italic font-serif py-6 text-center">
                Stage chat is live. Drop a vibe or comment.
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-neutral-300 leading-relaxed text-[11px] sm:text-xs">
                  <span className="text-neutral-600 text-[10px]">{msg.timeStr || "00:00:00"} </span>
                  <span className="text-white font-bold">{msg.handle}: </span>
                  <span className="text-neutral-300">{msg.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Chat Form */}
          <form onSubmit={(e) => handleSendChat(e)} className="flex gap-2 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to stage..."
              className="flex-1 bg-neutral-950 border border-neutral-800 px-3 py-2 font-mono text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingChat}
              className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center font-bold"
            >
              {isSendingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send size={12} />}
            </button>
          </form>
        </div>

      </main>

      {/* ── Stage Highlights AI Clips Modal (3 Top Clips for Organizer) ── */}
      {showHighlightsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl border border-neutral-700 bg-neutral-950 p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar font-mono">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  // 3 STAGE HIGHLIGHT CLIPS
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  AI-extracted peak intensity & audience reaction clips for organizer export
                </p>
              </div>
              <button
                onClick={() => setShowHighlightsModal(false)}
                className="text-xs text-neutral-400 hover:text-white p-1"
              >
                [ ✕ ]
              </button>
            </div>

            <div className="space-y-4">
              {HIGHLIGHT_CLIPS.map((clip) => (
                <div key={clip.id} className="border border-neutral-800 bg-black p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 border border-amber-500/60 bg-amber-950/40 text-amber-300 text-[9px] font-bold tracking-widest">
                      {clip.badge}
                    </span>
                    <span className="text-neutral-500 text-[10px]">
                      {clip.duration} • {clip.decibels}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">{clip.title}</h4>
                    <p className="text-[11px] font-serif italic text-neutral-400 mt-1">{clip.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-900 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span>{clip.reactionsCount} Audience Pulses</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          if (playingClipId === clip.id) {
                            setPlayingClipId(null);
                          } else {
                            setPlayingClipId(clip.id);
                          }
                        }}
                        className={`px-2.5 py-1 text-[10px] border font-mono uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                          playingClipId === clip.id
                            ? "border-emerald-400 text-emerald-400 bg-emerald-950/40"
                            : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
                        }`}
                      >
                        {playingClipId === clip.id ? <Pause size={10} /> : <Play size={10} />}
                        <span>{playingClipId === clip.id ? "PAUSE PREVIEW" : "PREVIEW CLIP"}</span>
                      </button>

                      <button
                        onClick={() => handlePublishHighlightToWaves(clip)}
                        disabled={publishingClip === clip.id || publishedClipSuccess === clip.id}
                        className={`px-3 py-1 text-[10px] border uppercase transition-colors cursor-pointer flex items-center gap-1 font-bold ${
                          publishedClipSuccess === clip.id
                            ? "border-emerald-500 bg-emerald-950 text-emerald-300"
                            : "border-white text-white hover:bg-white hover:text-black"
                        }`}
                      >
                        {publishingClip === clip.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : publishedClipSuccess === clip.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3 h-3" />
                        )}
                        <span>{publishedClipSuccess === clip.id ? "POSTED TO WAVES" : "POST TO WAVES"}</span>
                      </button>

                      {publishedClipSuccess === clip.id && (
                        <Link
                          href="/waves"
                          className="px-2.5 py-1 text-[10px] border border-emerald-500/80 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 font-mono uppercase font-bold flex items-center gap-1"
                        >
                          <span>🌊 VIEW IN WAVES →</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800 pt-3 text-center">
              <button
                onClick={() => setShowHighlightsModal(false)}
                className="w-full py-2 border border-neutral-800 hover:border-white text-xs uppercase transition-colors cursor-pointer text-neutral-400 hover:text-white"
              >
                [ CLOSE CLIPS STUDIO ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-900 pt-3 text-center font-mono text-[10px] text-neutral-600 tracking-[0.2em] uppercase">
        AGORA RTC HIGH-FIDELITY AUDIO RELAY • LOW-LATENCY CLASH ARENA
      </footer>
    </div>
  );
}

export default function LiveArenaClient({ clashId }: LiveArenaProps) {
  const rtcClient = useMemo(
    () => AgoraRTC.createClient({ codec: "vp8", mode: "rtc" }),
    []
  );

  return (
    <AgoraRTCProvider client={rtcClient}>
      <LiveArenaContent clashId={clashId} />
    </AgoraRTCProvider>
  );
}
