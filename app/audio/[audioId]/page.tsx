"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Music, 
  Play, 
  Pause, 
  ArrowLeft, 
  Headphones, 
  Users, 
  Radio, 
  Sparkles,
  Flame,
  Volume2
} from "lucide-react";
import { getSoundById, SoundItem } from "@/lib/soundCatalog";
import { PostItem, getPostsByAudioTrackId } from "@/lib/posts";
import { useAuth } from "@/app/components/AuthProvider";

export default function AudioTrackPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const audioId = String(params.audioId || "");

  const [sound, setSound] = useState<SoundItem | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePostAudio, setActivePostAudio] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const postAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const s = getSoundById(audioId);
    if (s) {
      setSound(s);
    } else {
      setSound({
        id: audioId,
        title: `Community Audio // ${audioId.slice(0, 8)}`,
        artist: "@ECHO_NODE",
        category: "COMMUNITY",
        audioUrl: "",
        durationSec: 15,
        usageCount: 1,
      });
    }

    getPostsByAudioTrackId(audioId)
      .then((res) => setPosts(res))
      .catch((err) => console.error("Failed to load derivative posts:", err))
      .finally(() => setLoading(false));

    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (postAudioRef.current) postAudioRef.current.pause();
    };
  }, [audioId]);

  const togglePlay = () => {
    if (!audioRef.current || !sound?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (postAudioRef.current) {
        postAudioRef.current.pause();
        setActivePostAudio(null);
      }
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTogglePostPlay = (post: PostItem) => {
    if (activePostAudio === post.id) {
      postAudioRef.current?.pause();
      setActivePostAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      if (postAudioRef.current) {
        postAudioRef.current.src = post.audioUrl;
        postAudioRef.current.play().then(() => {
          setActivePostAudio(post.id);
        }).catch(() => setActivePostAudio(null));
      }
    }
  };

  const handleUseAudio = () => {
    if (!sound) return;
    const url = `/studio?soundId=${encodeURIComponent(sound.id)}&soundUrl=${encodeURIComponent(sound.audioUrl)}&soundTitle=${encodeURIComponent(sound.title)}&soundArtist=${encodeURIComponent(sound.artist)}${sound.isVoiceMeme ? "&isMeme=true" : ""}`;
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-mono select-none pb-32 md:pb-16 max-w-4xl mx-auto space-y-6">
      {/* Hidden Audio Players */}
      {sound?.audioUrl && (
        <audio
          ref={audioRef}
          src={sound.audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      <audio
        ref={postAudioRef}
        onEnded={() => setActivePostAudio(null)}
        className="hidden"
      />

      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <Link
          href="/"
          className="text-neutral-400 hover:text-white border border-neutral-800 px-3 py-1.5 text-xs uppercase font-bold hover:border-white transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>[ RETURN ]</span>
        </Link>
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          // COMMUNITY SOUND HUB
        </span>
      </header>

      {/* Track Hero Banner */}
      <div className="border border-white bg-neutral-950 p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1 max-w-lg">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-white animate-pulse" />
              <span className="text-xs text-neutral-400 uppercase tracking-widest">
                // {sound?.category || "COMMUNITY SOUND"}
              </span>
              {sound?.isVoiceMeme && (
                <span className="text-[9px] bg-white text-black font-extrabold px-1.5 py-0.2 uppercase">
                  VIRAL MEME
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
              {sound?.title || "Original Audio Track"}
            </h1>
            <p className="text-xs text-neutral-400 uppercase">
              ORIGINAL CREATOR: <span className="text-white font-bold">{sound?.artist || "@ANON"}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-white block">
              {posts.length || sound?.usageCount || 1} TRANSMISSIONS
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
              DERIVATIVE ECHOS
            </span>
          </div>
        </div>

        {/* Player & Use Audio Action Bar */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-900 flex-wrap">
          {sound?.audioUrl && (
            <button
              type="button"
              onClick={togglePlay}
              className="px-4 py-2.5 border border-white bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "PAUSE PREVIEW" : "PLAY ORIGINAL"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleUseAudio}
            className="flex-1 sm:flex-none px-6 py-2.5 border border-white bg-black hover:bg-white text-white hover:text-black font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Headphones className="w-4 h-4" />
            <span>[ + USE THIS AUDIO IN STUDIO ]</span>
          </button>
        </div>
      </div>

      {/* Derivative Community Posts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-400 uppercase tracking-widest border-b border-neutral-900 pb-2">
          <span className="flex items-center gap-2 font-bold text-white">
            <Radio className="w-4 h-4 text-white" />
            // TRANSMISSIONS USING THIS SOUND ({posts.length})
          </span>
          <span className="text-[10px] text-neutral-500">NEWEST TAKES FIRST</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-500 uppercase animate-pulse">
            LOADING COMMUNITY TAKES...
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-neutral-900 bg-neutral-950 p-8 text-center space-y-3">
            <p className="text-xs text-neutral-400 uppercase tracking-wider">
              BE THE FIRST NODE TO BROADCAST USING THIS AUDIO
            </p>
            <button
              type="button"
              onClick={handleUseAudio}
              className="border border-white bg-white text-black font-bold px-4 py-2 text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>RECORD FIRST TAKE</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const isPostPlaying = activePostAudio === post.id;
              return (
                <div
                  key={post.id}
                  className="p-4 border border-neutral-800 bg-neutral-950 space-y-3 hover:border-neutral-600 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase tracking-wider">
                      {post.authorHandle}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {post.duration || `${post.durationSec || 15}s`}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 font-mono">
                    "{post.caption}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                    <button
                      type="button"
                      onClick={() => handleTogglePostPlay(post)}
                      className={`px-3 py-1.5 border text-xs font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isPostPlaying
                          ? "border-white bg-white text-black"
                          : "border-neutral-700 bg-black text-white hover:border-white"
                      }`}
                    >
                      {isPostPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isPostPlaying ? "PAUSE" : "LISTEN TAKE"}</span>
                    </button>

                    <Link
                      href={`/studio?soundId=${encodeURIComponent(post.audioTrackId || sound?.id || "")}&soundUrl=${encodeURIComponent(post.audioUrl)}&soundTitle=${encodeURIComponent(post.audioTrackTitle || sound?.title || "Audio Take")}&soundArtist=${encodeURIComponent(post.authorHandle)}`}
                      className="text-[10px] uppercase font-bold text-neutral-400 hover:text-white border border-neutral-800 hover:border-white px-2.5 py-1 transition-colors"
                    >
                      [ 🎵 DUET / RECORD TAKE ]
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
