"use client";

/**
 * app/hashtag/[tag]/HashtagClient.tsx
 * ─────────────────────────────────────────────────────
 * Hashtag client component showing all posts with a specific hashtag
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Hash, TrendingUp, Users, Loader2, Plus, Play, Pause } from "lucide-react";
import { subscribeToHashtagPosts, getHashtag, followHashtag, unfollowHashtag, isFollowingHashtag, type Hashtag, type HashtagPost } from "@/lib/hashtags";
import { useAuth } from "@/app/components/AuthProvider";

// Simple audio player for hashtag page
function SimpleAudioPlayer({ audioUrl, durationSec }: { audioUrl: string; durationSec: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  };

  return (
    <div className="border border-neutral-800 p-3 flex items-center gap-3">
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="none" 
        onEnded={() => setPlaying(false)}
        style={{ display: "none" }}
      />
      <button 
        onClick={toggle}
        className="w-8 h-8 border border-white flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer"
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
      <span className="font-mono text-[10px] text-neutral-500">
        {Math.floor(durationSec / 60)}:{(durationSec % 60).toString().padStart(2, '0')}
      </span>
    </div>
  );
}

export default function HashtagClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tag = params.tag as string;
  const hashtagTag = `#${tag}`;
  
  const [hashtag, setHashtag] = useState<Hashtag | null>(null);
  const [posts, setPosts] = useState<HashtagPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    async function loadHashtag() {
      setLoading(true);
      try {
        const hashtagData = await getHashtag(hashtagTag);
        setHashtag(hashtagData);
        
        if (hashtagData && user) {
          const following = await isFollowingHashtag(user.uid, hashtagTag);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error("Error loading hashtag:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHashtag();
  }, [hashtagTag, user]);

  useEffect(() => {
    const unsub = subscribeToHashtagPosts(hashtagTag, (postsData) => {
      setPosts(postsData);
    });

    return () => unsub();
  }, [hashtagTag]);

  const handleFollowToggle = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setFollowingLoading(true);
    try {
      if (isFollowing) {
        await unfollowHashtag(user.uid, hashtagTag);
        setIsFollowing(false);
      } else {
        await followHashtag(user.uid, hashtagTag);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs tracking-[0.2em] uppercase">
        <div className="border border-neutral-800 p-6 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>
    );
  }

  if (!hashtag) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs tracking-[0.2em] uppercase">
        <div className="border border-neutral-800 p-6">
          HASHTAG NOT FOUND
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {/* Header */}
      <div className="border-b border-neutral-900 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Hash className="w-6 h-6 text-neutral-600" />
          <h1 className="font-mono font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">{hashtagTag}</h1>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 font-mono text-xs text-neutral-500 uppercase">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {hashtag.postCount} POSTS
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {hashtag.followerCount} FOLLOWERS
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href={`/record?topic=${encodeURIComponent(tag)}`}
              className="font-mono text-xs tracking-widest uppercase px-3 py-2 border border-white bg-white text-black hover:bg-neutral-200 transition-colors font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> [ RECORD TAKE ]
            </Link>

            {user && (
              <button
                onClick={handleFollowToggle}
                disabled={followingLoading}
                className={`font-mono text-xs tracking-widest uppercase px-3 py-2 border transition-colors cursor-pointer ${
                  isFollowing
                    ? "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                    : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
                } disabled:opacity-50`}
              >
                {followingLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isFollowing ? (
                  "FOLLOWING"
                ) : (
                  "FOLLOW"
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        {posts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="font-mono text-xs text-neutral-600 tracking-widest uppercase">
              NO POSTS YET
            </p>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
              Be the first to post with {hashtagTag}
            </p>
            <Link
              href={`/record?topic=${encodeURIComponent(tag)}`}
              className="inline-block px-6 py-3 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
            >
              [ + RECORD FIRST TAKE ]
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="border border-neutral-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/${post.postAuthorHandle.replace("@", "")}`}
                  className="font-mono text-xs tracking-widest text-white hover:underline uppercase cursor-pointer font-bold"
                >
                  {post.postAuthorHandle}
                </Link>
                <span className="font-mono text-[10px] text-neutral-700 uppercase">
                  {new Date(post.postedAt.toDate()).toLocaleDateString()}
                </span>
              </div>

              <p className="font-mono text-base sm:text-lg font-bold text-white leading-snug">
                "{post.postCaption}"
              </p>

              <SimpleAudioPlayer
                audioUrl={post.postAudioUrl}
                durationSec={post.durationSec || 15}
              />

              <div className="flex items-center gap-4 font-mono text-[10px] text-neutral-700 uppercase">
                <span>{post.postPulseCount || 0} PULSES</span>
                <span>{post.postDuration}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
