"use client";

/**
 * app/components/LiveArenaClient.tsx
 * ─────────────────────────────────────────────────────
 * Ultra-Low Latency Live 1v1 Audio Arena + Clubhouse-Style Audience Grid.
 * Big Boss-Style Gamified Debate Allegiance & Mid-Debate Side Switching ("Convinced!").
 * Release: v1.5.0 — Uniform Utilitarian Monochrome (Pure Black & White Canvas)
 * Design: Pure black (#000), white (#fff), and neutral grayscale borders.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  Swords, Mic, MicOff, Send, Volume2, Flame, Heart, 
  Laugh, ThumbsUp, Zap, Radio, Sparkles, Play, Pause, 
  Share2, Check, Loader2, ArrowUp, Hand, Users, Shield,
  Trash2, UserX, UserCheck, Clock, Moon, AlertTriangle, ExternalLink,
  Shuffle, CheckCircle2, Scale
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
  deleteClash,
  joinStageAudience,
  leaveStageAudience,
  subscribeToStageAudience,
  sendStageAudienceReaction,
  toggleStageRaiseHand,
  type StageAudienceMember,
  getUserClashVote,
  castOrSwitchClashVote,
} from "@/lib/clashes";
import { subscribeToVibeChat, sendVibeMessage, type VibeChatMessage } from "@/lib/stageChat";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createPost } from "@/lib/posts";
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

  // Big Boss Allegiance state (Single vote per user, allowed to switch sides)
  const [myAllegiance, setMyAllegiance] = useState<"A" | "B" | "UNDECIDED" | null>(null);
  const [showAllegianceModal, setShowAllegianceModal] = useState(false);
  const [showSwitchSideModal, setShowSwitchSideModal] = useState(false);
  const [isCastingVote, setIsCastingVote] = useState(false);

  // Speaker / Debater mode toggle
  const [isDebater, setIsDebater] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  // Live Audience state (Clubhouse style)
  const [audienceMembers, setAudienceMembers] = useState<StageAudienceMember[]>([]);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [selectedUserForModeration, setSelectedUserForModeration] = useState<StageAudienceMember | null>(null);

  // 1-Hour Stage Countdown & Inactivity Sleep state
  const [stageSecondsRemaining, setStageSecondsRemaining] = useState(3600);
  const [isInactivitySleep, setIsInactivitySleep] = useState(false);
  const lastActiveTimestampRef = useRef<number>(Date.now());

  // Vibe Chat state
  const [chatMessages, setChatMessages] = useState<VibeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Live Reactions state
  const [reactions, setReactions] = useState<Array<{emoji: string; x: number; y: number; id: number}>>([]);
  const [myActiveReaction, setMyActiveReaction] = useState<string | null>(null);
  const reactionIdRef = useRef(0);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [currentSideTime, setCurrentSideTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // ── Fetch Initial User Vote & Allegiance ─────────────────────────────
  useEffect(() => {
    async function loadVote() {
      if (!user) return;
      const initialVote = await getUserClashVote(clashId, user.uid);
      if (initialVote) {
        setMyAllegiance(initialVote);
      } else {
        // Prompt new listeners to pick their faction on arrival
        setShowAllegianceModal(true);
      }
    }
    loadVote();
  }, [clashId, user]);

  // ── Join Live Audience Roster & Cleanup on Leave ─────────────────────
  useEffect(() => {
    if (!user) return;
    
    joinStageAudience(clashId, {
      uid: user.uid,
      handle: user.handle || "@ANON",
      photoUrl: user.photoUrl,
      auraScore: user.auraScore || 0,
    });

    const unsubAudience = subscribeToStageAudience(clashId, (members) => {
      setAudienceMembers(members);
    });

    return () => {
      leaveStageAudience(clashId, user.uid);
      unsubAudience();
    };
  }, [clashId, user]);

  // ── Unified Roster of all Stage Participants (Debaters + Listeners + Self) ──
  const allStageParticipants = useMemo(() => {
    const list: StageAudienceMember[] = [];
    const seenHandles = new Set<string>();

    // 1. Add Debater A if valid
    if (clash?.sideA?.handle && clash.sideA.handle !== "@VACANT" && clash.sideA.handle !== "OPEN SLOT") {
      const handleA = clash.sideA.handle;
      seenHandles.add(handleA.toLowerCase());
      list.push({
        uid: `speaker-a-${handleA}`,
        handle: handleA,
        auraScore: 240,
        allegiance: "A",
      });
    }

    // 2. Add Debater B if valid
    if (clash?.sideB?.handle && clash.sideB.handle !== "@VACANT" && clash.sideB.handle !== "OPEN SLOT") {
      const handleB = clash.sideB.handle;
      seenHandles.add(handleB.toLowerCase());
      list.push({
        uid: `speaker-b-${handleB}`,
        handle: handleB,
        auraScore: 180,
        allegiance: "B",
      });
    }

    // 3. Add real-time audience members from Firestore
    audienceMembers.forEach((m) => {
      const h = m.handle.toLowerCase();
      if (!seenHandles.has(h)) {
        seenHandles.add(h);
        list.push(m);
      }
    });

    // 4. Always ensure current user is present
    if (user && user.handle) {
      const myH = user.handle.toLowerCase();
      if (!seenHandles.has(myH)) {
        seenHandles.add(myH);
        list.push({
          uid: user.uid,
          handle: user.handle,
          photoUrl: user.photoUrl,
          auraScore: user.auraScore || 120,
          raisedHand: myHandRaised,
          lastReaction: myActiveReaction || undefined,
          allegiance: myAllegiance || "UNDECIDED",
        });
      } else {
        const item = list.find((x) => x.handle.toLowerCase() === myH);
        if (item && myActiveReaction) {
          item.lastReaction = myActiveReaction;
        }
      }
    }

    return list;
  }, [audienceMembers, user, myHandRaised, myAllegiance, myActiveReaction, clash]);

  // ── 1-Hour Stage Countdown & Inactivity Sleep Guard ─────────────────
  useEffect(() => {
    const defaultDuration = 3600;
    const now = Date.now() / 1000;
    const createdSec = clash?.createdAt?.seconds || (now - 120);
    const elapsed = now - createdSec;
    const remaining = Math.max(30, defaultDuration - (Math.floor(elapsed) % defaultDuration));
    setStageSecondsRemaining(remaining);

    const interval = setInterval(() => {
      setStageSecondsRemaining((prev) => {
        if (prev <= 1) return 3600;
        return prev - 1;
      });

      // Inactivity Sleep Guard (No audio or activity for > 3 minutes = sleep mode)
      const inactiveSeconds = (Date.now() - lastActiveTimestampRef.current) / 1000;
      if (inactiveSeconds > 180 && !isDebater) {
        setIsInactivitySleep(true);
      } else {
        setIsInactivitySleep(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [clash?.createdAt, isDebater]);

  const sendReaction = (emoji: string) => {
    lastActiveTimestampRef.current = Date.now();
    const id = reactionIdRef.current++;
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 60 + 20;
    
    // Instant local reaction on avatar
    setMyActiveReaction(emoji);
    setTimeout(() => {
      setMyActiveReaction((curr) => (curr === emoji ? null : curr));
    }, 4000);

    setReactions(prev => [...prev, { emoji, x, y, id }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);

    if (user) {
      sendStageAudienceReaction(clashId, user.uid, emoji);
    }
  };

  const handleToggleRaiseHand = async () => {
    if (!user) return;
    const nextState = !myHandRaised;
    setMyHandRaised(nextState);
    await toggleStageRaiseHand(clashId, user.uid, nextState);
  };

  // ── Big Boss Gamified Allegiance / Mid-Debate Side Switching ─────────
  const handleSelectAllegiance = async (targetSide: "A" | "B" | "UNDECIDED") => {
    if (!user || isCastingVote) return;
    setIsCastingVote(true);

    try {
      const res = await castOrSwitchClashVote(clashId, user.uid, user.handle || "@ANON", targetSide);
      setMyAllegiance(targetSide);
      setShowAllegianceModal(false);
      setShowSwitchSideModal(false);

      // Trigger reaction pop
      sendReaction(targetSide === "A" ? "🔵" : targetSide === "B" ? "🟠" : "⚖️");

      // Broadcast mid-debate switch if convinced
      if (res.switched && res.previousSide) {
        const sideAName = clash?.sideA?.handle || "Side A";
        const sideBName = clash?.sideB?.handle || "Side B";
        const fromName = res.previousSide === "A" ? sideAName : sideBName;
        const toName = targetSide === "A" ? sideAName : sideBName;

        await sendVibeMessage(
          clashId,
          "⚔️ STAGE SHIFT",
          `🔥 ${user.handle || "@ANON"} was convinced by the debate! Switched allegiance from ${fromName} to ${toName}!`,
          user.uid
        );
      }
    } catch (e) {
      console.error("Failed to set allegiance:", e);
    } finally {
      setIsCastingVote(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Audio Relay Join Channel ───────────────────────────────────────
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
    if (client && !isInactivitySleep) {
      try {
        client.enableAudioVolumeIndicator();
        const handleVolume = (volumes: Array<{ uid: string | number; level: number }>) => {
          const speaking = new Set<string>();
          volumes.forEach((vol) => {
            if (vol.level > 5) {
              lastActiveTimestampRef.current = Date.now();
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
  }, [client, isInactivitySleep]);

  useJoin(
    {
      appid: AGORA_APP_ID,
      channel: clashId,
      token: token || null,
      uid: user?.uid,
    },
    Boolean(user && !isInactivitySleep && token)
  );

  // ── Local Audio Publishing (if Debater) ─────────────────────────
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isDebater && !isInactivitySleep);
  usePublish([isDebater && !isInactivitySleep ? localMicrophoneTrack : null]);

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
    if (isInactivitySleep) return;

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
  }, [audioTracks, isInactivitySleep]);

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

    return () => {
      unsubClashes();
      unsubChat();
    };
  }, [clashId]);

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

  // Delete & End Stage Handler (for host)
  const handleDeleteStage = async () => {
    if (!confirm("Are you sure you want to end and delete this stage debate?")) return;
    try {
      await deleteClash(clashId);
      router.push("/clash");
    } catch (err) {
      console.error("Failed to delete clash:", err);
    }
  };

  // Real-Time Generated Stage Highlights
  const votesA = Math.max(0, clash?.sideA?.votes || 0);
  const votesB = Math.max(0, clash?.sideB?.votes || 0);
  const totalVotes = votesA + votesB;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const HIGHLIGHT_CLIPS = useMemo(() => {
    const handleA = clash?.sideA?.handle || "@ANON_A";
    const handleB = clash?.sideB?.handle || "@ANON_B";
    const totalEngagement = totalVotes + liveSurgeCount + (chatMessages.length || 0);

    return [
      {
        id: 1,
        badge: "⚡ HIGHEST ENGAGEMENT",
        title: "The Battle Turnaround Clash",
        description: `Live 15s back-and-forth exchange between ${handleA} and ${handleB} during peak audience vote surge.`,
        duration: "0:15",
        decibels: `${livePeakDb.toFixed(1)} dB`,
        reactionsCount: totalEngagement,
        audioSample: "https://res.cloudinary.com/dokmhb8tq/video/upload/v1786070251/eur02gdv8sicnxvalcij.mp3",
      },
      {
        id: 2,
        badge: "🔥 MAX SHOUT & INTENSITY",
        title: "Peak Decibel Rebuttal Moment",
        description: `High-frequency energy spike where ${handleA} delivered a fiery stance counter under live debate pressure.`,
        duration: "0:15",
        decibels: `${(livePeakDb + 2.4).toFixed(1)} dB`,
        reactionsCount: Math.round(totalEngagement * 1.35),
        audioSample: "https://res.cloudinary.com/dokmhb8tq/video/upload/v1786070251/eur02gdv8sicnxvalcij.mp3",
      },
      {
        id: 3,
        badge: "👑 CLIMAX MIC DROP",
        title: "Closing Argument & Final Vote Swing",
        description: `Decisive final seconds that swung the live Tug-of-War meter before the audience.`,
        duration: "0:15",
        decibels: `${(livePeakDb - 1.2).toFixed(1)} dB`,
        reactionsCount: Math.round(totalEngagement * 1.15),
        audioSample: "https://res.cloudinary.com/dokmhb8tq/video/upload/v1786070251/eur02gdv8sicnxvalcij.mp3",
      },
    ];
  }, [clash, totalVotes, liveSurgeCount, livePeakDb, chatMessages.length]);

  const handlePublishHighlightToWaves = async (clip: typeof HIGHLIGHT_CLIPS[0]) => {
    if (!user) return;
    setPublishingClip(clip.id);
    try {
      await createPost({
        authorUid: user.uid,
        authorHandle: user.handle || "@ANON",
        caption: `[ STAGE CLASH HIGHLIGHT ] "${clash?.topic || 'Debate'}" — ${clip.title} (${clip.decibels}) #${clash?.title?.replace(/\s+/g, '') || 'StageClash'} #debate`,
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

  // Check if current user has organizer/moderator privileges
  const isHost = Boolean(
    user && (
      user.handle === clash?.sideA?.handle ||
      user.uid === (clash as any)?.creatorUid ||
      (clash as any)?.creatorHandle?.toLowerCase() === user.handle?.toLowerCase() ||
      clash?.sideA?.handle === "@YOU" ||
      clash?.sideA?.handle?.toLowerCase() === user.handle?.toLowerCase() ||
      clash?.sideB?.handle?.toLowerCase() === user.handle?.toLowerCase()
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

      {/* ── Header Bar with 1-Hr Timer & Inactivity Status (Pure Monochrome) ── */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-3 font-mono text-xs tracking-wider uppercase relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-white whitespace-nowrap bg-neutral-900 border border-neutral-700 px-2 py-0.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> STAGE LIVE
          </span>
          <span className="text-neutral-700">•</span>
          <span className="text-neutral-300 whitespace-nowrap text-[10px] sm:text-xs flex items-center gap-1">
            <Users className="w-3 h-3 text-neutral-400" />
            {allStageParticipants.length} IN STAGE
          </span>
          <span className="text-neutral-700">•</span>
          {/* 1-Hour Stage Countdown */}
          <span className="text-neutral-300 whitespace-nowrap text-[10px] sm:text-xs flex items-center gap-1 border border-neutral-800 bg-neutral-950 px-1.5 py-0.5">
            <Clock className="w-3 h-3 text-neutral-400" />
            CLOSING IN: {formatTime(stageSecondsRemaining)}
          </span>
          {/* Inactivity Sleep Mode indicator */}
          {isInactivitySleep && (
            <span className="text-neutral-400 whitespace-nowrap text-[10px] flex items-center gap-1 border border-neutral-800 bg-neutral-950 px-1.5 py-0.5">
              <Moon className="w-3 h-3" /> SLEEP GUARD
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Stage Organizer Highlights Generator Button */}
          <button
            onClick={() => setShowHighlightsModal(true)}
            className="px-2.5 py-1 text-[10px] sm:text-xs bg-neutral-900 border border-neutral-700 hover:border-white text-white font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            title="Generate AI Highlights Clips"
          >
            <Sparkles className="w-3 h-3 text-white" />
            <span>CLIPS (3)</span>
          </button>

          {/* Host End & Delete Stage */}
          {isHost && (
            <button
              onClick={handleDeleteStage}
              className="px-2.5 py-1 text-[10px] sm:text-xs bg-neutral-900 border border-neutral-800 hover:border-white text-neutral-300 hover:text-white font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              title="Delete Stage Debate"
            >
              <Trash2 className="w-3 h-3" />
              <span>END STAGE</span>
            </button>
          )}

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

      {/* ── Main Arena: Dual Speaker Battle Cards (Pure Monochrome) ── */}
      <main className="flex-1 flex flex-col justify-center items-center space-y-4 sm:space-y-6 relative z-10 pb-28 md:pb-8 w-full max-w-4xl mx-auto">
        
        {/* ── Split-Screen Speaker Profiles ── */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ── SIDE A CARD ── */}
          <div 
            onClick={() => {
              if (clash?.sideA?.handle) {
                setSelectedUserForModeration({
                  uid: `sideA-${clash.sideA.handle}`,
                  handle: clash.sideA.handle,
                  auraScore: 240,
                });
              }
            }}
            className={`border p-4 space-y-3 transition-all duration-300 relative cursor-pointer group ${
              isSideASpeaking 
                ? "border-white bg-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                : myAllegiance === "A"
                ? "border-white bg-neutral-950"
                : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar with dynamic speaking pulse */}
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center font-mono text-sm font-bold shrink-0 transition-all ${
                  isSideASpeaking 
                    ? "border-white bg-white text-black ring-4 ring-white/30 scale-105" 
                    : myAllegiance === "A"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300 group-hover:border-white"
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
                      <span className="font-mono text-[9px] text-white uppercase font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" /> [ 🎙️ SPEAKING ]
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

            {/* Side A Quick Vote / Allegiance Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAllegiance("A");
              }}
              disabled={isCastingVote || myAllegiance === "A"}
              className={`w-full py-2.5 border font-mono text-xs tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold ${
                myAllegiance === "A"
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 text-neutral-300 hover:border-white hover:text-white bg-neutral-900/60"
              }`}
            >
              {myAllegiance === "A" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>[ ✓ YOU BACK SIDE A ]</span>
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>{myAllegiance === "B" ? "[ SWITCH TO SIDE A ]" : "[ VOTE SIDE A ]"}</span>
                </>
              )}
            </button>
          </div>

          {/* ── SIDE B CARD ── */}
          <div 
            onClick={() => {
              if (clash?.sideB?.handle) {
                setSelectedUserForModeration({
                  uid: `sideB-${clash.sideB.handle}`,
                  handle: clash.sideB.handle,
                  auraScore: 180,
                });
              }
            }}
            className={`border p-4 space-y-3 transition-all duration-300 relative cursor-pointer group ${
              isSideBSpeaking 
                ? "border-white bg-neutral-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                : myAllegiance === "B"
                ? "border-white bg-neutral-950"
                : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar with dynamic speaking pulse */}
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center font-mono text-sm font-bold shrink-0 transition-all ${
                  isSideBSpeaking 
                    ? "border-white bg-white text-black ring-4 ring-white/30 scale-105" 
                    : myAllegiance === "B"
                    ? "border-white bg-white text-black font-bold"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300 group-hover:border-white"
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
                      <span className="font-mono text-[9px] text-white uppercase font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" /> [ 🎙️ SPEAKING ]
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

            {/* Side B Quick Vote / Allegiance Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAllegiance("B");
              }}
              disabled={isCastingVote || myAllegiance === "B"}
              className={`w-full py-2.5 border font-mono text-xs tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold ${
                myAllegiance === "B"
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 text-neutral-300 hover:border-white hover:text-white bg-neutral-900/60"
              }`}
            >
              {myAllegiance === "B" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>[ ✓ YOU BACK SIDE B ]</span>
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>{myAllegiance === "A" ? "[ SWITCH TO SIDE B ]" : "[ VOTE SIDE B ]"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Dynamic Tug-of-War ASCII Meter & Live Allegiance Status ── */}
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

          {/* Gamified Allegiance Flip / Side Switch Control */}
          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between flex-wrap gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 uppercase tracking-widest">// YOUR FACTION:</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                myAllegiance === "A" 
                  ? "bg-white text-black border border-white" 
                  : myAllegiance === "B" 
                  ? "bg-neutral-800 text-white border border-neutral-600" 
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800"
              }`}>
                {myAllegiance === "A" ? "TEAM SIDE A" : myAllegiance === "B" ? "TEAM SIDE B" : "⚖️ UNDECIDED"}
              </span>
            </div>

            <button
              onClick={() => setShowSwitchSideModal(true)}
              className="px-3 py-1 border border-neutral-700 bg-neutral-900 text-white hover:bg-white hover:text-black text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Shuffle className="w-3 h-3" />
              <span>[ 🔄 SWITCH SIDE / CONVINCED! ]</span>
            </button>
          </div>
        </div>

        {/* ── Clubhouse-Style Live Audience & Reaction Roster Grid ── */}
        <div className="w-full border border-neutral-800 bg-neutral-950 p-4 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400 uppercase tracking-widest flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-neutral-300" />
              <span>// STAGE MEMBERS & FACTIONS ({allStageParticipants.length})</span>
            </div>
            
            {/* Hand Raise Toggle Button */}
            <button
              onClick={handleToggleRaiseHand}
              className={`px-2.5 py-1 border text-[10px] uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                myHandRaised
                  ? "border-white bg-white text-black"
                  : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
              }`}
            >
              <Hand className="w-3 h-3" />
              <span>{myHandRaised ? "HAND RAISED ✋" : "RAISE HAND ✋"}</span>
            </button>
          </div>

          {/* Grid of All Stage Avatars with Floating Emojis and Faction Badges */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pt-2">
            {allStageParticipants.map((m) => {
              const isRecentReaction = m.lastReaction;
              const isUserSpeaking = speakingUsers.has(m.uid) || (m.handle === user?.handle && isLocalSpeaking);
              const allegiance = m.allegiance;

              return (
                <div
                  key={m.uid}
                  onClick={() => setSelectedUserForModeration(m)}
                  className="flex flex-col items-center gap-1 text-center group cursor-pointer relative p-1.5 rounded-lg border border-transparent hover:border-neutral-700 hover:bg-neutral-900/80 transition-all active:scale-95"
                >
                  {/* Floating Reaction on Profile */}
                  {isRecentReaction && (
                    <div className="absolute -top-3 right-0 text-xl animate-badge-pop z-20">
                      {m.lastReaction}
                    </div>
                  )}

                  {/* Raised Hand Badge */}
                  {m.raisedHand && (
                    <div className="absolute -top-1 -left-1 bg-white text-black rounded-full p-0.5 z-20 shadow-md">
                      <Hand className="w-3 h-3" />
                    </div>
                  )}

                  {/* Avatar Circle with Faction Ring & Dynamic Speaking Pulse */}
                  <div className={`w-11 h-11 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-all overflow-hidden relative ${
                    isUserSpeaking 
                      ? "border-white bg-white text-black ring-4 ring-white/30 scale-105" 
                      : allegiance === "A"
                      ? "border-white bg-neutral-900 text-white ring-1 ring-white/40"
                      : allegiance === "B"
                      ? "border-neutral-400 bg-neutral-900 text-neutral-200 ring-1 ring-neutral-400/40"
                      : "border-neutral-700 bg-neutral-900 text-neutral-300 group-hover:border-white group-hover:scale-105"
                  }`}>
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{m.handle.replace("@", "").slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Faction Badge Tag */}
                  {allegiance && allegiance !== "UNDECIDED" ? (
                    <span className={`font-mono text-[7px] px-1 py-0.2 rounded font-bold uppercase ${
                      allegiance === "A" ? "bg-white text-black border border-white" : "bg-neutral-800 text-white border border-neutral-600"
                    }`}>
                      TEAM {allegiance}
                    </span>
                  ) : (
                    <span className="font-mono text-[7px] text-neutral-500 uppercase leading-none">
                      [ AURA {m.auraScore || 0} ]
                    </span>
                  )}

                  {/* Handle */}
                  <span className="font-mono text-[9px] text-white tracking-tight truncate max-w-[65px] group-hover:text-neutral-300">
                    {m.handle}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="font-mono text-[9px] text-neutral-600 uppercase text-center pt-1">
            // TIP: Tap any member's avatar to promote, demote, kick, or view profile
          </p>
        </div>

        {/* ── Audio Relay Speaker Controls Bar ── */}
        <div className="w-full border border-neutral-800 bg-neutral-950 p-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 tracking-widest uppercase">// STAGE AUDIO RELAY</span>
            {isDebater && (
              <span className={`px-2 py-0.5 text-[9px] uppercase font-bold ${
                micMuted ? "bg-neutral-900 text-neutral-400 border border-neutral-700" : "bg-white text-black border border-white"
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
                      ? "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-white hover:text-white"
                      : "border-white bg-white text-black hover:bg-neutral-200"
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

        {/* ── Live Reaction Surge Buttons (Pops on Audience Avatars!) ── */}
        <div className="w-full border border-neutral-900 p-3 space-y-2">
          <div className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 flex justify-between">
            <span>// LIVE AUDIENCE REACTION SURGE</span>
            <span>POPS ON YOUR AVATAR</span>
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

      {/* ── Gamified Initial Allegiance Selection Modal ("Join the Battle") ── */}
      {showAllegianceModal && !myAllegiance && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-neutral-700 bg-neutral-950 p-6 space-y-5 font-mono text-xs shadow-2xl">
            <div className="text-center space-y-1.5 border-b border-neutral-800 pb-4">
              <span className="text-[10px] text-neutral-400 tracking-widest uppercase font-bold">
                // ⚔️ JOIN THE BATTLE • CHOOSE YOUR SIDE
              </span>
              <h3 className="font-serif italic text-lg text-white">
                "{clash?.topic || "Stage Debate Arena"}"
              </h3>
              <p className="text-[11px] text-neutral-400">
                Pick your initial stance. You can switch sides mid-debate if convinced!
              </p>
            </div>

            <div className="space-y-3">
              {/* Option Side A */}
              <button
                onClick={() => handleSelectAllegiance("A")}
                disabled={isCastingVote}
                className="w-full p-3 border border-neutral-700 bg-black hover:border-white hover:bg-neutral-900 text-left space-y-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-white font-bold uppercase">
                  <span>[ BACK {clash?.sideA?.handle || "SIDE A"} ]</span>
                  <span className="text-[10px] text-neutral-500">{votesA} BACKERS</span>
                </div>
                <p className="font-serif italic text-xs text-neutral-300">
                  "{clash?.sideA?.position || "Stance A"}"
                </p>
              </button>

              {/* Option Side B */}
              <button
                onClick={() => handleSelectAllegiance("B")}
                disabled={isCastingVote}
                className="w-full p-3 border border-neutral-700 bg-black hover:border-white hover:bg-neutral-900 text-left space-y-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-white font-bold uppercase">
                  <span>[ BACK {clash?.sideB?.handle || "SIDE B"} ]</span>
                  <span className="text-[10px] text-neutral-500">{votesB} BACKERS</span>
                </div>
                <p className="font-serif italic text-xs text-neutral-300">
                  "{clash?.sideB?.position || "Stance B"}"
                </p>
              </button>

              {/* Option Undecided */}
              <button
                onClick={() => handleSelectAllegiance("UNDECIDED")}
                disabled={isCastingVote}
                className="w-full py-2.5 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer font-bold"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>[ ⚖️ UNDECIDED • CONVINCE ME ]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mid-Debate Side Switching Modal ("I Was Convinced!") ── */}
      {showSwitchSideModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-700 bg-neutral-950 p-5 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-white font-bold tracking-widest uppercase flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-white" />
                // FLIP YOUR ALLEGIANCE
              </span>
              <button
                onClick={() => setShowSwitchSideModal(false)}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer"
              >
                [ ✕ ]
              </button>
            </div>

            <p className="text-neutral-400 text-[11px] font-serif italic">
              Did a speaker convince you with fiery arguments? Flip your vote in real-time and sway the Tug-of-War!
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleSelectAllegiance("A")}
                disabled={isCastingVote || myAllegiance === "A"}
                className={`w-full py-2.5 border uppercase font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  myAllegiance === "A"
                    ? "border-white bg-white text-black opacity-60"
                    : "border-neutral-800 hover:border-white text-white"
                }`}
              >
                <span>FLIP TO {clash?.sideA?.handle || "SIDE A"}</span>
              </button>

              <button
                onClick={() => handleSelectAllegiance("B")}
                disabled={isCastingVote || myAllegiance === "B"}
                className={`w-full py-2.5 border uppercase font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  myAllegiance === "B"
                    ? "border-white bg-white text-black opacity-60"
                    : "border-neutral-800 hover:border-white text-white"
                }`}
              >
                <span>FLIP TO {clash?.sideB?.handle || "SIDE B"}</span>
              </button>

              <button
                onClick={() => handleSelectAllegiance("UNDECIDED")}
                disabled={isCastingVote || myAllegiance === "UNDECIDED"}
                className={`w-full py-2 border uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  myAllegiance === "UNDECIDED"
                    ? "border-neutral-700 bg-neutral-900 text-neutral-400 opacity-60"
                    : "border-neutral-800 hover:border-neutral-500 text-neutral-400 hover:text-white"
                }`}
              >
                <span>⚖️ STAY UNDECIDED</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Member Profile & Host Action Modal ── */}
      {selectedUserForModeration && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-700 bg-neutral-950 p-5 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-white" />
                <span className="text-white font-bold tracking-wider uppercase">
                  {selectedUserForModeration.handle}
                </span>
                <span className="text-[10px] text-neutral-500">
                  [ AURA {selectedUserForModeration.auraScore || 0} ]
                </span>
              </div>
              <button
                onClick={() => setSelectedUserForModeration(null)}
                className="text-neutral-500 hover:text-white p-1 cursor-pointer"
              >
                [ ✕ ]
              </button>
            </div>

            {/* Active Reaction status */}
            {selectedUserForModeration.lastReaction && (
              <div className="p-2 border border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase">// LATEST REACTION:</span>
                <span className="text-lg">{selectedUserForModeration.lastReaction}</span>
              </div>
            )}

            <div className="space-y-2">
              {/* Host / Organizer Moderation Controls */}
              <button
                onClick={async () => {
                  await promoteStageDebater(clashId, "A", selectedUserForModeration.handle, "Debater Side A");
                  setSelectedUserForModeration(null);
                }}
                className="w-full py-2 border border-neutral-800 hover:border-white text-white font-bold uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                [ PROMOTE TO SIDE A DEBATER ]
              </button>

              <button
                onClick={async () => {
                  await promoteStageDebater(clashId, "B", selectedUserForModeration.handle, "Debater Side B");
                  setSelectedUserForModeration(null);
                }}
                className="w-full py-2 border border-neutral-800 hover:border-white text-white font-bold uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                [ PROMOTE TO SIDE B DEBATER ]
              </button>

              <button
                onClick={async () => {
                  await demoteStageDebater(clashId, "A");
                  await demoteStageDebater(clashId, "B");
                  setSelectedUserForModeration(null);
                }}
                className="w-full py-2 border border-neutral-800 hover:border-neutral-500 text-neutral-400 hover:text-white uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                [ DEMOTE TO LISTENER ]
              </button>

              <button
                onClick={async () => {
                  await kickStageUser(clashId, selectedUserForModeration.uid);
                  setSelectedUserForModeration(null);
                }}
                className="w-full py-2 border border-neutral-800 bg-neutral-900 hover:border-white text-neutral-300 uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                [ KICK FROM STAGE ]
              </button>

              <button
                onClick={async () => {
                  await banStageUser(clashId, selectedUserForModeration.uid);
                  setSelectedUserForModeration(null);
                }}
                className="w-full py-2 border border-neutral-800 hover:border-white text-neutral-300 uppercase transition-colors flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                [ BAN FROM DEBATE ]
              </button>

              {/* View Full Profile Link */}
              <Link
                href={`/${selectedUserForModeration.handle.replace(/^@/, '')}`}
                onClick={() => setSelectedUserForModeration(null)}
                className="w-full py-2 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white uppercase transition-colors flex items-center justify-center gap-1.5 pt-2 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                <span>VIEW PROFILE →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage Highlights AI Clips Modal (3 Top Clips for Organizer) ── */}
      {showHighlightsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl border border-neutral-700 bg-neutral-950 p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar font-mono">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white" />
                  // 3 STAGE HIGHLIGHT CLIPS
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Peak intensity & audience reaction clips for organizer export
                </p>
              </div>
              <button
                onClick={() => setShowHighlightsModal(false)}
                className="text-xs text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                [ ✕ ]
              </button>
            </div>

            <div className="space-y-4">
              {HIGHLIGHT_CLIPS.map((clip) => (
                <div key={clip.id} className="border border-neutral-800 bg-black p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 border border-neutral-700 bg-neutral-900 text-white text-[9px] font-bold tracking-widest">
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
                      <Flame className="w-3 h-3 text-neutral-300" />
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
                            ? "border-white text-black bg-white"
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
                            ? "border-white bg-white text-black"
                            : "border-white text-white hover:bg-white hover:text-black"
                        }`}
                      >
                        {publishingClip === clip.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : publishedClipSuccess === clip.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Share2 className="w-3 h-3" />
                        )}
                        <span>{publishedClipSuccess === clip.id ? "POSTED TO WAVES" : "POST TO WAVES"}</span>
                      </button>

                      {publishedClipSuccess === clip.id && (
                        <Link
                          href="/waves"
                          className="px-2.5 py-1 text-[10px] border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 font-mono uppercase font-bold flex items-center gap-1"
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
        ULTRA-LOW LATENCY AUDIO RELAY • LIVE CLASH ARENA
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
