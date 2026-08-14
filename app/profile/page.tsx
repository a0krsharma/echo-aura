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
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { uploadAudio, uploadImage, getPlayableUrl } from "@/lib/cloudinary";
import { subscribeToUserPosts, subscribeToUserPulsedPosts, type PostItem } from "@/lib/posts";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { addTag, removeTag, getUserTags, getFreqMap, setSignalStatus, getSignalStatus, getVibeRead, analyzeVibeRead, updateVibeRead } from "@/lib/userDoc";
import { subscribeToFollowers, subscribeToFollowing, type Follow } from "@/lib/follows";
import OrbitLogo from "@/app/components/OrbitLogo";

// Simple in-profile audio player
function MiniPlayer({ audioUrl, durationSec }: { audioUrl: string; durationSec: number }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dur, setDur] = useState(durationSec || 15);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const rawUrl = getPlayableUrl(audioUrl);
    const a = new Audio(rawUrl);
    a.preload = "auto";
    audioRef.current = a;

    a.addEventListener("loadedmetadata", () => {
      if (isFinite(a.duration) && a.duration > 0) setDur(Math.ceil(a.duration));
      setReady(true);
    });
    a.addEventListener("timeupdate", () => setCurrent(a.currentTime));
    a.addEventListener("ended", () => { setPlaying(false); setCurrent(0); a.currentTime = 0; });
    a.addEventListener("error", () => setReady(false));
    a.src = getPlayableUrl(audioUrl);
    a.load();

    return () => { a.pause(); a.src = ""; audioRef.current = null; };
  }, [audioUrl]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else {
      setLoading(true);
      try { await a.play(); setPlaying(true); } catch {}
      finally { setLoading(false); }
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
  const [activeTab, setActiveTab] = useState<"ECHOES" | "REPLIES" | "RE-ECHOES" | "PULSED">("ECHOES");
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [pulsedPosts, setPulsedPosts] = useState<PostItem[]>([]);
  const [followersList, setFollowersList] = useState<Follow[]>([]);
  const [followingList, setFollowingList] = useState<Follow[]>([]);
  const [followsModal, setFollowsModal] = useState<"ORBITERS" | "ORBITING" | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToFollowers(user.uid, setFollowersList);
    const unsub2 = subscribeToFollowing(user.uid, setFollowingList);
    return () => { unsub1(); unsub2(); };
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
  const [bioDuration, setBioDuration] = useState(30);
  const [bioElapsed, setBioElapsed] = useState(0);
  const [bioBlob, setBioBlob] = useState<Blob | null>(null);
  const [bioAudioUrl, setBioAudioUrl] = useState<string | null>(null);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isPlayingBio, setIsPlayingBio] = useState(false);

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
      const db = getFirebaseDb();
      await updateDoc(doc(db, "users", user.uid), {
        voiceBioUrl: uploaded.secureUrl,
        voiceBioDuration: `${bioElapsed}s`,
      });
      
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
    if (!bioAudioUrl) return;
    const playableUrl = getPlayableUrl(bioAudioUrl);
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
  const auraScore = user?.auraScore || 0;

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
          <p className="font-serif italic text-neutral-500 text-lg">
            No {emptyLabel.toLowerCase()} yet.
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

              <p className="font-serif italic text-lg text-white leading-snug">
                "{post.caption}"
              </p>

              {/* Mini audio player */}
              {post.audioUrl && (
                <MiniPlayer audioUrl={post.audioUrl} durationSec={post.durationSec || 15} />
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 font-mono text-xs text-neutral-500">
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>{post.pulseCount || 0} PULSES</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[10px] text-neutral-600 uppercase">
                  {(post.reverbCount || 0) > 0 && (
                    <span>{post.reverbCount} [ REPLIES ]</span>
                  )}
                  {(post.orbitCount || 0) > 0 && (
                    <span>{post.orbitCount} [ RE-ECHOES ]</span>
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
      {/* Top Header */}
      <header className="p-6 flex items-center justify-between border-b border-neutral-900">
        <OrbitLogo />
        <div className="flex items-center space-x-3">
          <Link
            href="/terminal"
            className="px-3 py-1.5 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5"
            title="System Terminal Console"
          >
            <Terminal className="w-3.5 h-3.5 text-white" /> [ TERMINAL ]
          </Link>
          <button
            onClick={() => setEditProfileOpen(true)}
            className="px-3 py-1.5 border border-white text-white hover:bg-white hover:text-black font-mono text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
          >
            <Edit3 className="w-3.5 h-3.5" /> [ EDIT PROFILE ]
          </button>
          <button
            onClick={() => setShareModalOpen(true)}
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Share profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 md:px-6 pt-8 w-full flex-1">
        {/* User Handle & Avatar Picture Section */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className={`w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center font-mono text-xl bg-neutral-950 ${
                  vibeRead ? "border-green-500 shadow-lg shadow-green-500/20" : "border-neutral-700"
                }`}>
                  {user?.photoURL || user?.avatarUrl || avatarPreview ? (
                    <img
                      src={avatarPreview || user?.photoURL || user?.avatarUrl}
                      alt={handle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold">{handle.charAt(1).toUpperCase()}</span>
                  )}
                </div>
                <button
                  onClick={() => setEditProfileOpen(true)}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Upload profile picture"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <h1 className="font-mono text-2xl font-bold tracking-widest text-white">
                    {handle}
                  </h1>
                  <span className={`w-2 h-2 rounded-full ${signalStatus === "ONLINE" ? "bg-green-500 animate-ping" : "bg-red-500"}`} />
                </div>
                <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                  {user?.bio || "AUTHENTICATED PROFILE"}
                </p>
                {/* Active Domain Tags */}
                {tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {tags.map((tag) => (
                      <span key={tag} className="font-mono text-[9px] px-1.5 py-0.5 border border-neutral-800 text-neutral-400 uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono text-xs text-neutral-500 tracking-widest uppercase mb-1">
                [ AURA ]
              </div>
              <div className="font-serif italic text-3xl text-white">
                {auraScore.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Functional Orbiters / Orbiting row */}
          <div className="flex items-center gap-6 font-mono text-xs tracking-widest border-t border-neutral-900 pt-3 mt-3">
            <button
              onClick={() => setFollowsModal("ORBITING")}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-white font-bold">{followingList.length}</span>
              <span className="text-neutral-500 uppercase">[ ORBITING ]</span>
            </button>
            <button
              onClick={() => setFollowsModal("ORBITERS")}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-white font-bold">{followersList.length}</span>
              <span className="text-neutral-500 uppercase">[ ORBITERS ]</span>
            </button>
          </div>
        </div>

        {/* Voice Bio Section */}
        <div className="p-6 border border-neutral-900 bg-neutral-950/40 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
              // VOICE BIO (30S / 60S)
            </span>
            {bioState === "saved" && (
              <span className="font-mono text-[10px] tracking-widest text-white border border-neutral-700 px-2 py-0.5 uppercase">
                LIVE ON PROFILE
              </span>
            )}
          </div>

          {bioState === "idle" && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBioDuration(30)}
                  className={`px-3 py-1 font-mono text-xs tracking-widest border transition-colors cursor-pointer ${
                    bioDuration === 30 ? "border-white text-white" : "border-neutral-800 text-neutral-600"
                  }`}
                >
                  [30S]
                </button>
                <button
                  onClick={() => setBioDuration(60)}
                  className={`px-3 py-1 font-mono text-xs tracking-widest border transition-colors cursor-pointer ${
                    bioDuration === 60 ? "border-white text-white" : "border-neutral-800 text-neutral-600"
                  }`}
                >
                  [60S]
                </button>
              </div>
              <button
                onClick={startBioRecording}
                className="w-full sm:w-auto px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Mic2 className="w-3.5 h-3.5" /> [ RECORD VOICE BIO ]
              </button>
            </div>
          )}

          {bioState === "recording" && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2 font-mono text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>00:{bioElapsed.toString().padStart(2, "0")} / 00:{bioDuration}</span>
              </div>
              <button
                onClick={stopBioRecording}
                className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                [ STOP & PREVIEW ]
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
                    onClick={saveVoiceBio}
                    disabled={isSavingBio}
                    className="px-4 py-2 bg-white text-black font-mono text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isSavingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "[ SAVE AS VOICE BIO ]"}
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

        {/* [ VIBE_READ ] Section */}
        <div className="p-6 border border-neutral-900 bg-neutral-950/40 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neutral-500 tracking-widest uppercase flex items-center gap-2">
              // [ LIVE VIBE_READ ]
            </span>
            <button
              onClick={() => setEditProfileOpen(true)}
              className="font-mono text-[10px] text-neutral-500 hover:text-white uppercase cursor-pointer"
            >
              [ EDIT PROFILE SETTINGS ]
            </button>
          </div>

          <div className="space-y-3">
            {!vibeRead ? (
              <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase">
                NO DATA YET. RECORD YOUR VOICE BIO TO GENERATE YOUR VIBE READ.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">PITCH</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${vibeRead.pitch}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white tabular-nums">{vibeRead.pitch}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">TEMPO</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${vibeRead.tempo}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white tabular-nums">{vibeRead.tempo}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">ENERGY</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
                        style={{ width: `${vibeRead.energy}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white tabular-nums">{vibeRead.energy}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">CLARITY</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${vibeRead.clarity}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-white tabular-nums">{vibeRead.clarity}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-900 mb-6 font-mono text-xs tracking-widest overflow-x-auto no-scrollbar">
          {(["ECHOES", "REPLIES", "RE-ECHOES", "PULSED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 uppercase whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab
                  ? "border-b-2 border-white text-white font-bold"
                  : "text-neutral-600 hover:text-white"
              }`}
            >
              {tab}
              <span className="ml-1 text-neutral-700">
                ({tab === "ECHOES" ? echoePosts.length : tab === "REPLIES" ? reverbPosts.length : tab === "RE-ECHOES" ? orbitPosts.length : pulsedPosts.length})
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "ECHOES"    && renderPostList(echoePosts,  "echoes")}
        {activeTab === "REPLIES"   && renderPostList(reverbPosts, "replies")}
        {activeTab === "RE-ECHOES" && renderPostList(orbitPosts,  "re-echoes")}
        {activeTab === "PULSED"    && renderPostList(pulsedPosts, "pulsed posts")}
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
              className="w-full border border-neutral-800 text-neutral-500 hover:border-white hover:text-white font-mono text-xs tracking-widest uppercase py-3 transition-colors cursor-pointer"
            >
              [ SHARE PROFILE ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
