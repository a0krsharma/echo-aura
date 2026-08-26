"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic2,
  Flame,
  Share2,
  X,
  Lock,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  Loader2,
  ArrowUp,
  RefreshCw,
  Repeat2,
  Terminal,
  Camera,
  Edit3,
  Bookmark,
  Plus,
  Bell,
  Menu,
  Grid,
  MessageSquare,
  Heart,
  Volume2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { useSearchParams } from "next/navigation";
import { uploadAudio, uploadImage, getPlayableUrl } from "@/lib/cloudinary";
import { subscribeToUserPosts, subscribeToUserPulsedPosts, getUserVaultedPosts, type PostItem } from "@/lib/posts";
import { doc, updateDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { subscribeToFollowers, subscribeToFollowing, type Follow } from "@/lib/follows";
import {
  addTag,
  removeTag,
  getUserTags,
  getFreqMap,
  setSignalStatus,
  getSignalStatus,
  getVibeRead,
  analyzeVibeRead,
  updateVibeRead,
  setVoiceBio,
  deleteVoiceBio,
  set24HourThought,
  delete24HourThought,
  isThoughtActive,
  getThoughtRemainingHours,
} from "@/lib/userDoc";
import ExpressiveAvatar from "@/app/components/avatar/ExpressiveAvatar";
import AvatarCustomizerModal from "@/app/components/avatar/AvatarCustomizerModal";
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from "@/lib/avatarRig";

// Global Audio Singleton Manager — ensures only one audio echo plays at a time
let globalAudioInstance: HTMLAudioElement | null = null;
let globalAudioPauseHandler: (() => void) | null = null;

// Simple in-profile audio player
function MiniPlayer({ audioUrl, durationSec }: { audioUrl: string; durationSec: number }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur] = useState(durationSec || 15);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !audioUrl) return;
    const rawUrl = getPlayableUrl(audioUrl);
    const a = new Audio(rawUrl);
    a.preload = "auto";
    audioRef.current = a;

    a.addEventListener("loadedmetadata", () => {
      if (isFinite(a.duration) && a.duration > 0) setDur(Math.ceil(a.duration));
      setReady(true);
    });
    a.addEventListener("timeupdate", () => setCurrent(a.currentTime));
    a.addEventListener("ended", () => {
      setPlaying(false);
      setCurrent(0);
      a.currentTime = 0;
      if (globalAudioInstance === a) {
        globalAudioInstance = null;
        globalAudioPauseHandler = null;
      }
    });
    a.addEventListener("error", () => setReady(false));
    a.src = rawUrl;

    return () => {
      a.pause();
      a.src = "";
      if (globalAudioInstance === a) {
        globalAudioInstance = null;
        globalAudioPauseHandler = null;
      }
      audioRef.current = null;
    };
  }, [audioUrl]);

  const toggle = async () => {
    let a = audioRef.current;
    const targetUrl = getPlayableUrl(audioUrl);
    if (!targetUrl) return;

    if (!a) {
      a = new Audio(targetUrl);
      audioRef.current = a;
      a.addEventListener("loadedmetadata", () => {
        if (isFinite(a!.duration) && a!.duration > 0) setDur(Math.ceil(a!.duration));
      });
      a.addEventListener("timeupdate", () => setCurrent(a!.currentTime));
      a.addEventListener("ended", () => {
        setPlaying(false);
        setCurrent(0);
        if (globalAudioInstance === a) {
          globalAudioInstance = null;
          globalAudioPauseHandler = null;
        }
      });
    }

    if (playing) {
      a.pause();
      setPlaying(false);
      if (globalAudioInstance === a) {
        globalAudioInstance = null;
        globalAudioPauseHandler = null;
      }
    } else {
      // Pause any currently playing echo before playing this one
      if (globalAudioInstance && globalAudioInstance !== a) {
        try { globalAudioInstance.pause(); } catch {}
        if (globalAudioPauseHandler) {
          try { globalAudioPauseHandler(); } catch {}
        }
      }

      globalAudioInstance = a;
      globalAudioPauseHandler = () => setPlaying(false);

      setLoading(true);
      try {
        if (!a.src || a.src === window.location.href) {
          a.src = targetUrl;
        }
        await a.play();
        setPlaying(true);
      } catch (err) {
        console.error("Audio playback error:", err);
        setPlaying(false);
        if (globalAudioInstance === a) {
          globalAudioInstance = null;
          globalAudioPauseHandler = null;
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const pct = dur > 0 ? Math.min(100, (current / dur) * 100) : 0;

  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={toggle}
        disabled={loading}
        className="font-mono text-[10px] tracking-widest border border-neutral-700 px-3 py-1.5 text-white hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-40 shrink-0"
      >
        {loading ? "..." : playing ? "⏸" : "▶"}
      </button>
      <div className="flex-1 h-px bg-neutral-900 relative cursor-pointer" onClick={(e) => {
        const a = audioRef.current;
        if (!a || !isFinite(a.duration)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
        setCurrent(a.currentTime);
      }}>
        <div className="h-full bg-neutral-600 absolute top-0 left-0 transition-none" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-neutral-600 shrink-0 tabular-nums">{fmt(current)}/{fmt(dur)}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"ECHOES" | "REPLIES" | "RE-ECHOES" | "PULSED" | "VAULT">(
    initialTab === "VAULT" ? "VAULT" : "ECHOES"
  );
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [pulsedPosts, setPulsedPosts] = useState<PostItem[]>([]);
  const [vaultPosts, setVaultPosts] = useState<PostItem[]>([]);
  const [followersList, setFollowersList] = useState<Follow[]>([]);
  const [followingList, setFollowingList] = useState<Follow[]>([]);
  const [followsModal, setFollowsModal] = useState<"ORBITERS" | "ORBITING" | null>(null);

  const [liveAura, setLiveAura] = useState<number | null>(null);

  useEffect(() => {
    if (initialTab === "VAULT") {
      setActiveTab("VAULT");
    }
  }, [initialTab]);

  useEffect(() => {
    if (!user) return;
    getUserVaultedPosts(user.uid).then(setVaultPosts).catch(() => {});
  }, [user, activeTab]);

  // Real-time subscriptions for posts, pulses, followers, following
  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToFollowers(user.uid, setFollowersList);
    const unsub2 = subscribeToFollowing(user.uid, setFollowingList);
    const unsubPosts = subscribeToUserPosts(user.uid, setUserPosts);
    const unsubPulsed = subscribeToUserPulsedPosts(user.uid, setPulsedPosts);
    return () => {
      unsub1();
      unsub2();
      unsubPosts();
      unsubPulsed();
    };
  }, [user]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [freqMap, setFreqMap] = useState<Record<string, number>>({});
  const [signalStatus, setSignalStatusState] = useState<"ONLINE" | "OFFLINE" | "SIGNAL-OFF">("ONLINE");
  const [vibeRead, setVibeRead] = useState<{
    pitch: number;
    tempo: number;
    energy: number;
    clarity: number;
  } | null>(null);

  // Voice Bio states
  const [bioState, setBioState] = useState<"idle" | "recording" | "preview" | "saved">("idle");
  const [bioDuration, setBioDuration] = useState(15);
  const [bioElapsed, setBioElapsed] = useState(0);
  const [bioBlob, setBioBlob] = useState<Blob | null>(null);
  const [bioAudioUrl, setBioAudioUrl] = useState<string | null>(null);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [savedVoiceBioUrl, setSavedVoiceBioUrl] = useState<string | null>((user as any)?.voiceBioUrl || null);
  const [savedVoiceBioDuration, setSavedVoiceBioDuration] = useState<string | null>((user as any)?.voiceBioDuration || "15s");
  const [bioModalOpen, setBioModalOpen] = useState(false);

  // 24-Hour Expiring Thought (Orbiters Only)
  const [thoughtText, setThoughtText] = useState<string | null>(null);
  const [thoughtAudioUrl, setThoughtAudioUrl] = useState<string | null>(null);
  const [thoughtDuration, setThoughtDuration] = useState<string | null>(null);
  const [thoughtExpiresAt, setThoughtExpiresAt] = useState<number | null>(null);
  const [thoughtModalOpen, setThoughtModalOpen] = useState(false);
  const [thoughtInputText, setThoughtInputText] = useState("");
  const [thoughtBlob, setThoughtBlob] = useState<Blob | null>(null);
  const [thoughtAudioUrlPreview, setThoughtAudioUrlPreview] = useState<string | null>(null);
  const [thoughtState, setThoughtState] = useState<"idle" | "recording" | "preview">("idle");
  const [thoughtElapsed, setThoughtElapsed] = useState(0);
  const [isSavingThought, setIsSavingThought] = useState(false);
  const [isPlayingThought, setIsPlayingThought] = useState(false);
  const thoughtAudioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Edit Profile States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [userHandle, setUserHandle] = useState(user?.handle || "@ANON");
  const [userBio, setUserBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.photoURL || user?.avatarUrl || null);
  const [savingProfile, setSavingProfile] = useState(false);

  // 3D Avatar Studio state
  const [avatarStudioOpen, setAvatarStudioOpen] = useState(false);
  const [avatarDisplayMode, setAvatarDisplayMode] = useState<"3D" | "PHOTO">("3D");
  const [equippedItems, setEquippedItems] = useState<Record<string, string | null>>({});
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("echo_avatar_config");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_AVATAR_CONFIG;
  });

  const handleSaveAvatarConfig = async (newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("echo_avatar_config", JSON.stringify(newConfig));
      } catch {}
    }
    if (user) {
      try {
        const db = getFirebaseDb();
        await updateDoc(doc(db, "users", user.uid), {
          avatarConfig: newConfig,
        });
      } catch (err) {
        console.warn("Failed to persist avatarConfig to Firestore:", err);
      }
    }
  };

  // Real-time listener for user document (aura, voice bio, vibe read & profile data)
  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.avatarConfig) {
          setAvatarConfig(data.avatarConfig);
        }
        if (data.equipped) {
          setEquippedItems(data.equipped);
        }
        if (data.voiceBioUrl) {
          setSavedVoiceBioUrl(data.voiceBioUrl);
          setSavedVoiceBioDuration(data.voiceBioDuration || "30s");
        } else {
          setSavedVoiceBioUrl(null);
          setSavedVoiceBioDuration(null);
        }
        if (data.thoughtText !== undefined || data.thoughtAudioUrl !== undefined) {
          setThoughtText(data.thoughtText || null);
          setThoughtAudioUrl(data.thoughtAudioUrl || null);
          setThoughtDuration(data.thoughtDuration || null);
          setThoughtExpiresAt(data.thoughtExpiresAt || null);
        }
        if (data.vibeRead) {
          setVibeRead(data.vibeRead);
        }
        if (data.auraScore !== undefined) {
          setLiveAura(data.auraScore);
        }
        if (data.signalStatus) {
          setSignalStatusState(data.signalStatus);
        }
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags);
        }
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user) {
      setUserHandle(user.handle || "@ANON");
      setUserBio(user.bio || "");
      setAvatarPreview(user.photoURL || user.avatarUrl || null);
    }
  }, [user]);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const db = getFirebaseDb();
      let photoURL = user.photoURL || user.avatarUrl || "";

      if (avatarFile) {
        const res = await uploadImage(avatarFile, `avatar-${user.uid}`);
        photoURL = res.secureUrl;
      }

      const formattedHandle = userHandle.trim().startsWith("@") ? userHandle.trim() : `@${userHandle.trim()}`;

      await updateDoc(doc(db, "users", user.uid), {
        handle: formattedHandle,
        bio: userBio.trim(),
        photoURL,
        avatarUrl: photoURL,
      });

      setEditProfileOpen(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Subscribe to user's own posts from `posts` collection (NOT `echoes`)
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserPosts(user.uid, (posts) => {
      setUserPosts(posts);
    });
    return () => unsub();
  }, [user]);

  // Subscribe to pulsed posts
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserPulsedPosts(user.uid, (posts) => {
      setPulsedPosts(posts);
    });
    return () => unsub();
  }, [user]);

  // Fetch user's tags
  useEffect(() => {
    if (!user) return;
    getUserTags(user.uid).then(setTags);
  }, [user]);

  // Fetch user's frequency map
  useEffect(() => {
    if (!user) return;
    getFreqMap(user.uid).then(setFreqMap);
  }, [user]);

  // Fetch user's signal status
  useEffect(() => {
    if (!user) return;
    getSignalStatus(user.uid).then(setSignalStatusState);
  }, [user]);

  // Fetch user's vibe read
  useEffect(() => {
    if (!user) return;
    getVibeRead(user.uid).then(setVibeRead);
  }, [user]);

  // Voice Bio recording timer — auto-stop at max duration
  useEffect(() => {
    if (bioState === "recording") {
      bioTimerRef.current = setInterval(() => {
        setBioElapsed((prev) => {
          if (prev >= bioDuration) {
            stopBioRecording();
            return bioDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    }
    return () => {
      if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    };
  }, [bioState, bioDuration]);

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  const startBioRecording = async () => {
    setBioElapsed(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      else if (MediaRecorder.isTypeSupported("audio/aac")) mimeType = "audio/aac";
      else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setBioBlob(blob);
        setBioAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setBioState("recording");
    } catch {
      setBioState("idle");
    }
  };

  const stopBioRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setBioState("preview");
  };

  const saveVoiceBio = async () => {
    if (!user || !bioBlob) return;
    setIsSavingBio(true);
    try {
      const uploaded = await uploadAudio(bioBlob, `voice-bio-${user.uid}`);
      const voiceBioUrl = typeof uploaded === "string" ? uploaded : uploaded?.secureUrl || "";

      if (!voiceBioUrl) throw new Error("Upload failed to return audio URL");

      const db = getFirebaseDb();
      await setDoc(
        doc(db, "users", user.uid),
        {
          voiceBioUrl,
          voiceBioDuration: `${bioElapsed}s`,
          voiceBioAt: serverTimestamp(),
        },
        { merge: true }
      );
      
      setSavedVoiceBioUrl(voiceBioUrl);
      setSavedVoiceBioDuration(`${bioElapsed}s`);
      
      // Analyze and save vibe read
      try {
        const vibeData = await analyzeVibeRead(bioBlob);
        await updateVibeRead(user.uid, vibeData);
        setVibeRead(vibeData);
      } catch (err) {
        console.error("Failed to analyze vibe read:", err);
      }
      
      setBioState("saved");
    } catch (err) {
      console.error("Failed to save voice bio:", err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCopyLink = () => {
    const handle = user?.handle || "@ANON";
    const url = `${window.location.origin}/${handle.replace("@", "")}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleBioPlay = () => {
    const targetUrl = bioAudioUrl || savedVoiceBioUrl;
    if (!targetUrl) {
      setBioModalOpen(true);
      return;
    }
    const playableUrl = getPlayableUrl(targetUrl);
    if (!audioRef.current) {
      const a = new Audio(playableUrl);
      a.volume = 1.0;
      a.muted = false;
      a.preload = "auto";
      a.onended = () => setIsPlayingBio(false);
      audioRef.current = a;
    } else {
      // Update source if URL changed
      if (audioRef.current.src !== playableUrl) {
        audioRef.current.src = playableUrl;
        audioRef.current.load();
      }
      audioRef.current.volume = 1.0;
      audioRef.current.muted = false;
    }
    if (isPlayingBio) {
      audioRef.current.pause();
      setIsPlayingBio(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlayingBio(true);
    }
  };

  const handleDeleteBio = async () => {
    if (!user) return;
    try {
      await deleteVoiceBio(user.uid);
      setSavedVoiceBioUrl(null);
      setSavedVoiceBioDuration(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingBio(false);
    } catch (err) {
      console.error("Failed to delete voice bio:", err);
    }
  };

  const startThoughtRecording = async () => {
    setThoughtElapsed(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      else if (MediaRecorder.isTypeSupported("audio/aac")) mimeType = "audio/aac";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setThoughtBlob(blob);
        setThoughtAudioUrlPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      setThoughtState("recording");
      const startTime = Date.now();
      bioTimerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        setThoughtElapsed(secs);
        if (secs >= 30) {
          stopThoughtRecording();
        }
      }, 250);
    } catch {
      setThoughtState("idle");
    }
  };

  const stopThoughtRecording = () => {
    if (bioTimerRef.current) {
      clearInterval(bioTimerRef.current);
      bioTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setThoughtState("preview");
  };

  const handleSaveThought = async () => {
    if (!user) return;
    if (!thoughtInputText.trim() && !thoughtBlob) return;
    setIsSavingThought(true);
    try {
      let audioUrl: string | null = null;
      if (thoughtBlob) {
        const res = await uploadAudio(thoughtBlob, `thought-${user.uid}-${Date.now()}`);
        audioUrl = res.secureUrl;
      }
      await set24HourThought(
        user.uid,
        thoughtInputText.trim() || "Voice note thought",
        audioUrl,
        thoughtBlob ? `${thoughtElapsed}s` : null
      );
      setThoughtModalOpen(false);
      setThoughtInputText("");
      setThoughtBlob(null);
      setThoughtAudioUrlPreview(null);
      setThoughtState("idle");
    } catch (err) {
      console.error("Failed to save thought:", err);
    } finally {
      setIsSavingThought(false);
    }
  };

  const handleDeleteThought = async () => {
    if (!user) return;
    try {
      await delete24HourThought(user.uid);
      setThoughtText(null);
      setThoughtAudioUrl(null);
      setThoughtExpiresAt(null);
      if (thoughtAudioRef.current) {
        thoughtAudioRef.current.pause();
        thoughtAudioRef.current = null;
      }
      setIsPlayingThought(false);
    } catch (err) {
      console.error("Failed to delete thought:", err);
    }
  };

  const handleToggleThoughtPlay = () => {
    if (!thoughtAudioUrl) return;
    const playable = getPlayableUrl(thoughtAudioUrl);
    if (!thoughtAudioRef.current) {
      const a = new Audio(playable);
      a.onended = () => setIsPlayingThought(false);
      a.onerror = () => setIsPlayingThought(false);
      thoughtAudioRef.current = a;
    }
    if (isPlayingThought) {
      thoughtAudioRef.current.pause();
      setIsPlayingThought(false);
    } else {
      thoughtAudioRef.current.play().catch(() => setIsPlayingThought(false));
      setIsPlayingThought(true);
    }
  };

  const handleAddTag = async () => {
    if (!user || !newTag.trim()) return;
    const tag = newTag.trim().toUpperCase();
    if (tags.includes(tag)) return;
    try {
      await addTag(user.uid, tag);
      setTags([...tags, tag]);
      setNewTag("");
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!user) return;
    try {
      await removeTag(user.uid, tag);
      setTags(tags.filter(t => t !== tag));
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const handleSignalToggle = async () => {
    if (!user) return;
    const newStatus = signalStatus === "ONLINE" ? "SIGNAL-OFF" : "ONLINE";
    try {
      await setSignalStatus(user.uid, newStatus);
      setSignalStatusState(newStatus);
    } catch (err) {
      console.error("Failed to update signal status:", err);
    }
  };

  const handle    = user?.handle    || "@ANON_0000";
  const auraScore = liveAura !== null ? liveAura : (user?.auraScore || 0);

  // Filtered tab data
  const echoePosts  = userPosts.filter(p => !p.reverbOf && !p.orbitOf);
  const reverbPosts = userPosts.filter(p => !!p.reverbOf);
  const orbitPosts  = userPosts.filter(p => !!p.orbitOf);

  const timeAgo = (createdAt: any): string => {
    if (!createdAt?.seconds) return "";
    const diff = Date.now() / 1000 - createdAt.seconds;
    if (diff < 60)    return "JUST NOW";
    if (diff < 3600)  return `${Math.floor(diff / 60)}M AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
    return `${Math.floor(diff / 86400)}D AGO`;
  };

  const renderPostList = (posts: PostItem[], emptyLabel: string) => (
    <div>
      {posts.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <p className="font-mono text-neutral-500 text-sm uppercase tracking-wider">
            NO {emptyLabel.toUpperCase()} YET
          </p>
          <Link
            href="/studio"
            className="inline-block px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
          >
            [ 🎙 GO TO STUDIO ]
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-neutral-900">
          {posts.map((post) => (
            <article key={post.id} className="py-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {post.reverbOf && <Repeat2 className="w-3 h-3 text-neutral-600" />}
                  {post.orbitOf && <RefreshCw className="w-3 h-3 text-neutral-600" />}
                  <span className="font-mono text-[10px] text-neutral-500 uppercase">
                    {post.reverbOf ? `[ REPLY ] ON ${post.reverbOfHandle}` : post.orbitOf ? `[ RE-ECHO ] OF ${post.orbitOfHandle}` : "ECHO"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-neutral-600">
                  {timeAgo(post.createdAt)}
                </span>
              </div>

              <p className="font-mono text-sm sm:text-base font-bold text-white leading-snug">
                "{post.caption}"
              </p>

              {/* Mini audio player */}
              {post.audioUrl && (
                <MiniPlayer audioUrl={post.audioUrl} durationSec={post.durationSec || 15} />
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 font-mono text-xs text-neutral-300">
                  <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  <span>{post.pulseCount || 0} PULSES</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-neutral-500 uppercase">
                  {(post.reverbCount || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-neutral-400" />
                      {post.reverbCount} [ REPLIES ]
                    </span>
                  )}
                  {(post.orbitCount || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3 text-neutral-400" />
                      {post.orbitCount} [ RE-ECHOES ]
                    </span>
                  )}
                  <span>{post.duration || "0:00"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8 flex flex-col font-sans">
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-5 w-full flex-1">
        {/* ── Top Profile Telemetry Section: Avatar + Data Columns ── */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            {/* Left: Avatar with 24-Hour Expiring Thought Speech Bubble (Orbiters Only) */}
            <div className="relative flex flex-col items-center shrink-0">
              {/* 24-Hour Expiring Thought Capsule (Orbiters Only) */}
              {isThoughtActive({ thoughtText, thoughtAudioUrl, thoughtExpiresAt }) ? (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-white text-white font-mono text-[9px] px-2.5 py-0.5 whitespace-nowrap flex items-center gap-1.5 z-10 shadow-lg">
                  <button
                    onClick={thoughtAudioUrl ? handleToggleThoughtPlay : () => setThoughtModalOpen(true)}
                    className="flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>💭</span>
                    <span className="font-bold max-w-[110px] sm:max-w-[150px] truncate">
                      "{thoughtText}"
                    </span>
                    {thoughtAudioUrl && (
                      <span className="text-[8px] bg-white text-black font-bold px-1 py-0.2">
                        {isPlayingThought ? "PAUSE ∿" : "PLAY 🎙️"}
                      </span>
                    )}
                  </button>
                  <span className="text-[8px] text-neutral-500">
                    • {getThoughtRemainingHours({ thoughtExpiresAt })}H
                  </span>
                  <button
                    onClick={handleDeleteThought}
                    className="text-neutral-500 hover:text-red-400 ml-0.5 cursor-pointer"
                    title="Delete 24h thought"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setThoughtModalOpen(true)}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-dashed border-neutral-700 hover:border-white text-neutral-400 hover:text-white font-mono text-[9px] px-2 py-0.5 whitespace-nowrap flex items-center gap-1 z-10 transition-colors cursor-pointer shadow-md"
                  title="24-Hour Expiring Thought (Visible to Orbiters only)"
                >
                  <span>💭</span>
                  <span className="tracking-wider uppercase">+ 24H THOUGHT</span>
                </button>
              )}

              {/* Avatar Aperture with Shopped Neon Border / Equipped Suits */}
              <div className="relative group mt-2">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 overflow-hidden flex items-center justify-center text-2xl font-mono bg-black relative transition-all ${
                  equippedItems.border === "cosmetic_neon_border"
                    ? "border-emerald-400 ring-4 ring-emerald-400/80 ring-offset-2 ring-offset-black shadow-[0_0_35px_rgba(52,211,153,0.7)] animate-pulse"
                    : vibeRead
                    ? "border-white shadow-lg shadow-white/20"
                    : "border-neutral-700"
                }`}>
                  {avatarDisplayMode === "PHOTO" && (user?.photoURL || user?.avatarUrl || avatarPreview) ? (
                    <img
                      src={avatarPreview || user?.photoURL || user?.avatarUrl}
                      alt={handle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ExpressiveAvatar
                      config={avatarConfig}
                      gesture="IDLE"
                      size={96}
                      className="w-full h-full"
                      onClick={() => setAvatarStudioOpen(true)}
                    />
                  )}
                </div>

                {/* Edit / 3D Toggle Quick Buttons */}
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
                  {(user?.photoURL || user?.avatarUrl || avatarPreview) && (
                    <button
                      type="button"
                      onClick={() => setAvatarDisplayMode(avatarDisplayMode === "3D" ? "PHOTO" : "3D")}
                      className="w-6 h-6 bg-neutral-900 border border-neutral-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer hover:border-white transition-all text-[9px] font-black"
                      title={`Switch to ${avatarDisplayMode === "3D" ? "Uploaded Photo" : "3D Expressive Avatar"}`}
                    >
                      {avatarDisplayMode === "3D" ? "📷" : "👤"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAvatarStudioOpen(true)}
                    className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-neutral-200 transition-colors"
                    title="Customize 3D Avatar & Suits"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: 4 Stat Telemetry Columns */}
            <div className="flex-1 grid grid-cols-4 text-center">
              {/* 1. Echoes */}
              <button
                onClick={() => setActiveTab("ECHOES")}
                className="flex flex-col items-center cursor-pointer group py-1"
              >
                <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-neutral-300">
                  {echoePosts.length}
                </span>
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">
                  ECHOES
                </span>
              </button>

              {/* 2. Orbiters */}
              <button
                onClick={() => setFollowsModal("ORBITERS")}
                className="flex flex-col items-center cursor-pointer group py-1"
              >
                <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-neutral-300">
                  {followersList.length}
                </span>
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">
                  ORBITERS
                </span>
              </button>

              {/* 3. Orbiting */}
              <button
                onClick={() => setFollowsModal("ORBITING")}
                className="flex flex-col items-center cursor-pointer group py-1"
              >
                <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-neutral-300">
                  {followingList.length}
                </span>
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">
                  ORBITING
                </span>
              </button>

              {/* 4. Aura */}
              <Link
                href="/terminal"
                className="flex flex-col items-center cursor-pointer group py-1"
                title="Aura Score"
              >
                <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-neutral-300">
                  {auraScore.toLocaleString()}
                </span>
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">
                  AURA
                </span>
              </Link>
            </div>
          </div>

          {/* Identity & Domain Metadata */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-mono text-base font-bold text-white tracking-wide">
                {user?.displayName || handle}
              </h1>
              {user?.displayName && (
                <span className="font-mono text-xs text-neutral-400">
                  {handle}
                </span>
              )}
              <span className={`w-2 h-2 rounded-full ${signalStatus === "ONLINE" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />

              {/* Equipped Shopped Title */}
              {equippedItems.title === "title_shadow_broker" && (
                <span className="px-2 py-0.5 bg-purple-950 border border-purple-500 text-purple-300 font-mono text-[9px] uppercase font-black rounded-md shadow-sm">
                  🕵️ SHADOW BROKER
                </span>
              )}
              {equippedItems.title === "title_grandmaster" && (
                <span className="px-2 py-0.5 bg-amber-950 border border-amber-400 text-yellow-400 font-mono text-[9px] uppercase font-black rounded-md shadow-sm">
                  👑 GRANDMASTER TYCOON
                </span>
              )}
              {equippedItems.suit && (
                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-white font-mono text-[9px] uppercase font-bold rounded-md shadow-sm">
                  🥋 {equippedItems.suit.replace('suit_', '').replace(/_/g, ' ').toUpperCase()}
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
              {user?.bio || "Authenticated Voice Node on Echo"}
            </p>
            {tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {tags.map((tag) => {
                  const cleanTag = tag.replace(/^#+/, "");
                  return (
                    <span key={tag} className="font-mono text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-950 text-neutral-400 uppercase tracking-wider">
                      #{cleanTag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── PERMANENT VOICE BIO (PUBLIC TO EVERYONE) ── */}
          <div className="pt-1">
            {savedVoiceBioUrl ? (
              <div className="p-3 border border-neutral-800 bg-neutral-950 space-y-2 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white font-bold flex items-center gap-1.5 uppercase">
                    <Mic2 className="w-3.5 h-3.5 text-white" /> PERMANENT VOICE BIO ({savedVoiceBioDuration || "15S"})
                  </span>
                  <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest">
                    ● PUBLIC TO EVERYONE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleBioPlay}
                    className="flex-1 py-1.5 px-3 bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-lg"
                  >
                    {isPlayingBio ? <Pause className="w-3.5 h-3.5 fill-black text-black" /> : <Play className="w-3.5 h-3.5 fill-black text-black" />}
                    <span>{isPlayingBio ? "PAUSE VOICE BIO" : "PLAY VOICE BIO"}</span>
                  </button>
                  <button
                    onClick={() => setBioModalOpen(true)}
                    className="py-1.5 px-3 border border-neutral-700 hover:border-white text-neutral-300 hover:text-white font-mono text-xs uppercase transition-colors cursor-pointer rounded-lg"
                    title="Re-record voice bio"
                  >
                    ↺ UPDATE
                  </button>
                  <button
                    onClick={handleDeleteBio}
                    className="py-1.5 px-3 border border-neutral-800 hover:border-red-500 text-neutral-500 hover:text-red-400 font-mono text-xs uppercase transition-colors cursor-pointer rounded-lg"
                    title="Delete voice bio"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setBioModalOpen(true)}
                className="w-full p-3 border border-dashed border-neutral-700 hover:border-white bg-neutral-950/60 hover:bg-neutral-950 text-left transition-colors cursor-pointer group space-y-1 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white font-bold tracking-wider flex items-center gap-1.5 uppercase group-hover:text-white">
                    <Mic2 className="w-3.5 h-3.5" /> [ + RECORD PERMANENT VOICE BIO ]
                  </span>
                  <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest">
                    ● PUBLIC INTRO
                  </span>
                </div>
                <p className="font-mono text-[10px] text-neutral-400">
                  Record a 15-30s audio intro. Anyone visiting your profile can listen.
                </p>
              </button>
            )}
          </div>

          {/* Utilitarian Action Deck */}
          <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setEditProfileOpen(true)}
              className="flex-1 py-2 px-3 border border-neutral-800 bg-neutral-950 hover:border-white text-white font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer text-center rounded-xl"
            >
              [ EDIT PROFILE ]
            </button>
            <button
              onClick={() => setAvatarStudioOpen(true)}
              className="flex-1 py-2 px-3 border border-cyan-500/60 bg-cyan-950/20 hover:border-cyan-400 text-cyan-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>[ 👤 3D AVATAR ]</span>
            </button>
            <Link
              href="/shop"
              className="flex-1 py-2 px-3 border border-amber-500/60 bg-amber-950/20 hover:border-amber-400 text-amber-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              <span>[ 🛍️ STORE ]</span>
            </Link>
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex-1 py-2 px-3 border border-neutral-800 bg-neutral-950 hover:border-white text-white font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer text-center rounded-xl"
            >
              [ SHARE SIGNAL ]
            </button>
            <Link
              href="/terminal"
              className="p-2 border border-neutral-800 bg-neutral-950 hover:border-white text-white transition-colors cursor-pointer shrink-0 flex items-center justify-center rounded-xl"
              title="System Terminal Console"
            >
              <Terminal className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Echo Audio Channel Navigation Tabs with Icons ── */}
        <div className="grid grid-cols-4 border-t border-b border-neutral-900 mb-4">
          {(
            [
              { id: "ECHOES", icon: Mic2, label: "ECHOES", count: echoePosts.length },
              { id: "REPLIES", icon: MessageSquare, label: "REVERBS", count: reverbPosts.length },
              { id: "RE-ECHOES", icon: Repeat2, label: "RE-ECHOES", count: orbitPosts.length },
              { id: "PULSED", icon: Heart, label: "PULSES", count: pulsedPosts.length },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors border-b-2 font-mono text-xs ${
                  isActive ? "border-white text-white font-bold" : "border-transparent text-neutral-600 hover:text-neutral-400"
                }`}
                title={tab.label}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive && tab.id === "PULSED" ? "fill-white text-white" : ""}`} />
                  <span className="tracking-wider uppercase text-[10px] sm:text-[11px]">{tab.label}</span>
                </div>
                <span className="text-[10px] text-neutral-500 tabular-nums">
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "ECHOES"    && renderPostList(echoePosts,  "echoes")}
        {activeTab === "REPLIES"   && renderPostList(reverbPosts, "replies")}
        {activeTab === "RE-ECHOES" && renderPostList(orbitPosts,  "re-echoes")}
        {activeTab === "PULSED"    && renderPostList(pulsedPosts, "pulsed posts")}
        {activeTab === "VAULT"     && renderPostList(vaultPosts,  "saved echoes")}
      </main>

      {/* ORBITERS / ORBITING MODAL */}
      {followsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-black p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="font-mono text-xs tracking-widest text-white uppercase font-bold">
                // {followsModal} ({followsModal === "ORBITERS" ? followersList.length : followingList.length})
              </span>
              <button
                onClick={() => setFollowsModal(null)}
                className="font-mono text-xs text-neutral-500 hover:text-white cursor-pointer"
              >
                [ ✕ CLOSE ]
              </button>
            </div>

            {(followsModal === "ORBITERS" ? followersList : followingList).length === 0 ? (
              <p className="font-mono text-xs text-neutral-600 uppercase text-center py-6">
                NO {followsModal} YET.
              </p>
            ) : (
              <div className="space-y-2">
                {(followsModal === "ORBITERS" ? followersList : followingList).map((f) => {
                  const targetHandle = followsModal === "ORBITERS" ? f.followerHandle : f.followingHandle;
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 border border-neutral-900 bg-neutral-950">
                      <span className="font-mono text-xs text-white tracking-widest">{targetHandle}</span>
                      <Link
                        href={`/${targetHandle.replace("@", "")}`}
                        onClick={() => setFollowsModal(null)}
                        className="font-mono text-[10px] border border-neutral-800 px-2 py-1 text-neutral-400 hover:border-white hover:text-white uppercase"
                      >
                        VIEW PROFILE →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg border border-neutral-800 bg-black p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
              <span className="font-mono text-xs tracking-widest text-white uppercase font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> // EDIT AUTHENTICATED PROFILE
              </span>
              <button
                onClick={() => setEditProfileOpen(false)}
                className="font-mono text-xs text-neutral-500 hover:text-white cursor-pointer"
              >
                [ ✕ CLOSE ]
              </button>
            </div>

            {/* Avatar Photo Upload */}
            <div className="space-y-3">
              <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase block">
                // PROFILE PICTURE / AVATAR
              </span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-neutral-700 overflow-hidden flex items-center justify-center bg-neutral-950 font-mono text-xl text-white">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    handle.charAt(1).toUpperCase()
                  )}
                </div>
                <div>
                  <label className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer inline-flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" /> [ UPLOAD PHOTO ]
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
                  </label>
                  <p className="font-mono text-[10px] text-neutral-600 mt-1 uppercase">
                    SUPPORTS JPG, PNG, WEBP UP TO 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Handle & Bio Inputs */}
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs text-neutral-500 tracking-widest uppercase block mb-1">
                  HANDLE / USERNAME
                </label>
                <input
                  type="text"
                  value={userHandle}
                  onChange={(e) => setUserHandle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 font-mono text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-neutral-500 tracking-widest uppercase block mb-1">
                  BIO / CREDO
                </label>
                <textarea
                  rows={3}
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="Enter your voice bio or credo..."
                  className="w-full bg-neutral-950 border border-neutral-800 p-2.5 font-mono text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white"
                />
              </div>
            </div>

            {/* [ TAGS ] Section */}
            <div className="p-4 border border-neutral-900 bg-neutral-950/40 space-y-3">
              <span className="font-mono text-xs text-neutral-400 tracking-widest uppercase block">
                // [ TAGS ] - YOUR DOMAINS
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  maxLength={15}
                  placeholder="ADD TAG..."
                  className="flex-1 bg-transparent border border-neutral-800 px-3 py-1.5 font-mono text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-white uppercase"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="px-3 py-1.5 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-30"
                >
                  [ ADD ]
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div key={tag} className="flex items-center gap-2 px-2.5 py-1 border border-neutral-800 bg-neutral-900/50">
                    <span className="font-mono text-[10px] text-white tracking-widest uppercase">{tag}</span>
                    <button onClick={() => handleRemoveTag(tag)} className="text-neutral-600 hover:text-white cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* [ FREQ_MAP ] Section */}
            <div className="p-4 border border-neutral-900 bg-neutral-950/40 space-y-3">
              <span className="font-mono text-xs text-neutral-400 tracking-widest uppercase block">
                // [ FREQ_MAP ] - FOOTPRINT
              </span>
              {Object.keys(freqMap).length === 0 ? (
                <p className="font-mono text-[10px] text-neutral-600 uppercase">NO DATA YET.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(freqMap).slice(0, 5).map(([topic, count]) => (
                    <div key={topic} className="flex items-center gap-3 font-mono text-[10px]">
                      <span className="text-white uppercase w-20 truncate">{topic}</span>
                      <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, count * 10)}%` }} />
                      </div>
                      <span className="text-neutral-500">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* [ SIGNAL-OFF ] Section */}
            <div className="p-4 border border-neutral-900 bg-neutral-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-neutral-400 tracking-widest uppercase block">
                    // [ SIGNAL-OFF ] - SIGNAL RETENTION
                  </span>
                  <span className={`font-mono text-[10px] uppercase font-bold ${
                    signalStatus === "ONLINE" ? "text-green-500" : "text-red-500"
                  }`}>
                    STATUS: {signalStatus}
                  </span>
                </div>
                <button
                  onClick={handleSignalToggle}
                  className={`px-3 py-1.5 border font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer ${
                    signalStatus === "ONLINE"
                      ? "border-white text-white hover:bg-white hover:text-black"
                      : "border-red-500 text-red-500 hover:bg-red-500 hover:text-black"
                  }`}
                >
                  {signalStatus === "ONLINE" ? "[ GO SIGNAL-OFF ]" : "[ GO ONLINE ]"}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-3 bg-white text-black font-mono text-xs tracking-widest uppercase font-bold hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "[ SAVE PROFILE CHANGES ]"}
            </button>
          </div>
        </div>
      )}

      {/* Share Profile Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-black p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
                // SHARE PROFILE
              </span>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-2 py-4">
              <p className="font-mono text-2xl font-bold tracking-widest text-white">
                {handle}
              </p>
              <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
                ECHO AUDIO NETWORK
              </p>
            </div>

            <div className="p-3 border border-neutral-900 flex items-center justify-between font-mono text-xs text-neutral-400">
              <span className="truncate">{window?.location?.host || "echo.fm"}/{handle.replace("@", "")}</span>
              <button
                onClick={handleCopyLink}
                className="ml-2 text-white hover:underline cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Native share if available */}
            <button
              onClick={async () => {
                const shareUrl = `${window.location.origin}/${handle.replace("@", "")}`;
                if (navigator.share) {
                  try { await navigator.share({ title: `${handle} on Echo`, url: shareUrl }); } catch {}
                }
              }}
              className="w-full border border-neutral-800 text-neutral-400 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase py-3 transition-colors cursor-pointer"
            >
              [ SHARE PROFILE ]
            </button>
          </div>
        </div>
      )}

      {/* Voice Bio Record / Preview Modal */}
      {bioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-black p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="font-mono text-xs tracking-widest text-white uppercase font-bold flex items-center gap-1.5">
                <Mic2 className="w-4 h-4" /> // VOICE BIO (15S / 30S)
              </span>
              <button
                onClick={() => setBioModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bioState === "idle" && (
              <div className="space-y-4">
                {savedVoiceBioUrl && (
                  <div className="p-3 border border-neutral-800 bg-neutral-950/80 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-white tracking-widest uppercase flex items-center gap-1.5">
                        <Mic2 className="w-3 h-3" /> ACTIVE VOICE BIO
                      </span>
                      <span className="font-mono text-[10px] text-neutral-500 uppercase">SAVED</span>
                    </div>
                    <MiniPlayer audioUrl={savedVoiceBioUrl} durationSec={bioDuration || 15} />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBioDuration(15)}
                      className={`px-3 py-1 font-mono text-xs tracking-widest border transition-colors cursor-pointer ${
                        bioDuration === 15 ? "border-white text-white font-bold" : "border-neutral-800 text-neutral-600 hover:text-white"
                      }`}
                    >
                      [15S]
                    </button>
                    <button
                      onClick={() => setBioDuration(30)}
                      className={`px-3 py-1 font-mono text-xs tracking-widest border transition-colors cursor-pointer ${
                        bioDuration === 30 ? "border-white text-white font-bold" : "border-neutral-800 text-neutral-600 hover:text-white"
                      }`}
                    >
                      [30S]
                    </button>
                  </div>
                  <button
                    onClick={startBioRecording}
                    className="flex-1 px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mic2 className="w-3.5 h-3.5" /> [ RECORD ]
                  </button>
                </div>
              </div>
            )}

            {bioState === "recording" && (
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-2 font-mono text-xs text-white">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>00:{bioElapsed.toString().padStart(2, "0")} / 00:{bioDuration}</span>
                </div>
                <button
                  onClick={stopBioRecording}
                  className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
                >
                  [ STOP ]
                </button>
              </div>
            )}

            {(bioState === "preview" || bioState === "saved") && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleToggleBioPlay}
                    className="w-10 h-10 rounded-full border border-neutral-700 flex items-center justify-center hover:border-white transition-colors cursor-pointer"
                  >
                    {isPlayingBio ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="flex-1 flex items-center space-x-1 h-6 opacity-60">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-white rounded-full"
                        style={{ height: `${Math.max(20, (i % 5) * 20 + 20)}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  {bioState === "preview" && (
                    <button
                      onClick={async () => {
                        await saveVoiceBio();
                        setBioModalOpen(false);
                      }}
                      disabled={isSavingBio}
                      className="flex-1 px-4 py-2 bg-white text-black font-mono text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 font-bold"
                    >
                      {isSavingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "[ SAVE AS BIO ]"}
                    </button>
                  )}
                  <button
                    onClick={() => { setBioState("idle"); setBioBlob(null); if (bioAudioUrl) URL.revokeObjectURL(bioAudioUrl); setBioAudioUrl(null); setBioElapsed(0); setIsPlayingBio(false); audioRef.current = null; }}
                    className="px-4 py-2 border border-neutral-800 text-neutral-500 font-mono text-xs tracking-widest uppercase hover:border-neutral-600 hover:text-white transition-colors cursor-pointer"
                  >
                    RE-RECORD
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 24-Hour Expiring Thought (Orbiters Only) Record & Share Modal */}
      {thoughtModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-white bg-black p-6 space-y-4 font-mono shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <span className="text-xs tracking-widest text-white uppercase font-bold flex items-center gap-1.5">
                <span>💭</span> // 24H THOUGHT (ORBITERS ONLY)
              </span>
              <button
                onClick={() => setThoughtModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                ● EXPIRES IN 24 HOURS • VISIBLE TO YOUR ORBITERS ONLY
              </p>
              <input
                type="text"
                maxLength={90}
                value={thoughtInputText}
                onChange={(e) => setThoughtInputText(e.target.value)}
                placeholder="WHAT'S ON YOUR MIND? (STATUS TEXT)..."
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 focus:border-white text-xs text-white placeholder-neutral-600 outline-none"
              />
              <span className="text-[9px] text-neutral-600 text-right block">
                {thoughtInputText.length}/90 CHARACTERS
              </span>
            </div>

            {/* Voice Thought Recording Section (Optional Voice Note) */}
            <div className="p-3 border border-neutral-900 bg-neutral-950 space-y-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-bold">
                ATTACH VOICE NOTE (OPTIONAL)
              </span>

              {thoughtState === "idle" && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500">MAX 30 SECONDS</span>
                  <button
                    onClick={startThoughtRecording}
                    className="px-3 py-1.5 border border-white text-white text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center gap-1 font-bold"
                  >
                    <Mic2 className="w-3 h-3" /> [ RECORD VOICE NOTE ]
                  </button>
                </div>
              )}

              {thoughtState === "recording" && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2 text-xs text-white">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>00:{thoughtElapsed.toString().padStart(2, "0")} / 00:30</span>
                  </div>
                  <button
                    onClick={stopThoughtRecording}
                    className="px-3 py-1 border border-white text-white text-[10px] tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer font-bold"
                  >
                    [ STOP ]
                  </button>
                </div>
              )}

              {thoughtState === "preview" && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-white font-bold flex items-center gap-1">
                    <Mic2 className="w-3 h-3" /> VOICE NOTE RECORDED ({thoughtElapsed}S)
                  </span>
                  <button
                    onClick={() => {
                      setThoughtState("idle");
                      setThoughtBlob(null);
                      setThoughtAudioUrlPreview(null);
                    }}
                    className="text-[10px] text-neutral-500 hover:text-white uppercase underline cursor-pointer"
                  >
                    REDO
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveThought}
                disabled={isSavingThought || (!thoughtInputText.trim() && !thoughtBlob)}
                className="w-full py-2.5 bg-white text-black text-xs tracking-widest uppercase font-bold hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSavingThought ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "[ POST 24H THOUGHT ]"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Avatar Customizer Studio Modal */}
      <AvatarCustomizerModal
        isOpen={avatarStudioOpen}
        onClose={() => setAvatarStudioOpen(false)}
        initialConfig={avatarConfig}
        onSave={handleSaveAvatarConfig}
      />
    </div>
  );
}
