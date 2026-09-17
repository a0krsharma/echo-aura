"use client";

import React, { useState, memo } from "react";
import Link from "next/link";
import {
  Mic2, Share, Repeat2, Trash2, Heart,
  Bookmark, BarChart2, Music, Play, Pause,
  Check, Plus, MessageCircle, Sparkle
} from "lucide-react";
import { formatNum, formatRelativeTime, getAvatarGradient, parseCaption } from "@/app/utils/formatters";
import AudioPlayer from "@/app/components/audio/AudioPlayer";
import PostReverbSection from "@/app/components/feed/PostReverbSection";
import { soundSynth } from "@/lib/soundSynthesizer";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FeedPost {
  id: string; audioUrl: string; caption: string;
  authorHandle: string; authorUid: string;
  pulseCount: number; pulsedBy: string[];
  orbitedBy?: string[]; duration: string; durationSec: number;
  reverbCount: number; commentCount: number;
  viewsCount?: number; bookmarkCount?: number; createdAt: any;
  newsTopic?: string | null;
  newsHeadline?: string | null;
  newsLink?: string | null;
  tags?: string[];
  category?: string;
  isNeural?: boolean;
  isCloned?: boolean;
  audioTrackId?: string;
  audioTrackTitle?: string;
  audioTrackArtist?: string;
  isVoiceMeme?: boolean;
}

// ─── Post Skeleton Loading ───────────────────────────────────────────────────
export function PostSkeleton() {
  return (
    <article className="py-6 px-4 space-y-3.5 animate-pulse border-b border-neutral-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-900" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 bg-neutral-900 rounded-md" />
          <div className="h-2.5 w-16 bg-neutral-900 rounded-md" />
        </div>
      </div>
      <div className="h-4 w-5/6 bg-neutral-900 rounded-md" />
      <div className="h-24 bg-neutral-900 rounded-2xl" />
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
        <div className="h-4 w-12 bg-neutral-900 rounded-md" />
      </div>
    </article>
  );
}

// ─── Post Card (Twitter / Instagram Inspired) ────────────────────────────────
const PostCard = memo(function PostCard({ 
  post, user, orbitedPosts, activePostId, deletingId, 
  isBookmarked, onPulse, onOrbit, onShare, onBookmark, onDelete, 
  onReplyClick, onProfileClick, onActiveChange, setRef, 
  onFollow, onUnfollow, following, onComment, onFirstPlay
}: {
  post: FeedPost; user: any; orbitedPosts: Set<string>; activePostId: string | null;
  deletingId: string | null; isBookmarked: boolean;
  onPulse: (p: FeedPost) => void; onOrbit: (p: FeedPost) => void;
  onShare: (p: FeedPost) => void; onBookmark: (p: FeedPost) => void;
  onDelete: (id: string) => void; onReplyClick: (rid?: string, rh?: string) => void;
  onProfileClick: (h: string) => void; onActiveChange: (id: string | null) => void; 
  setRef: (id: string, el: HTMLElement | null) => void;
  onFollow: (uid: string, handle: string) => void; onUnfollow: (uid: string) => void; 
  following: Set<string>; onComment: (p: FeedPost) => void; onFirstPlay: (p: FeedPost) => void;
}) {
  const [showVoiceTakes, setShowVoiceTakes] = useState(false);
  const isPulsed = user ? post.pulsedBy.includes(user.uid) : false;
  const isOrbited = orbitedPosts.has(post.id) || (user ? (post.orbitedBy || []).includes(user.uid) : false);
  const isOwn = user?.uid === post.authorUid;
  const isDel = deletingId === post.id;
  const isFollowingAuthor = following.has(post.authorUid);

  // Deterministic avatar gradient
  const gradient = getAvatarGradient(post.authorHandle);
  const initial = post.authorHandle.replace(/^@/, "").charAt(0).toUpperCase() || "E";

  // Use real views count only
  const displayViews = post.viewsCount || 0;

  return (
    <article
      ref={el => setRef(post.id, el)}
      data-post-id={post.id}
      className="py-5 px-4 sm:px-6 hover:bg-neutral-950/40 transition-colors border-b border-neutral-900/80 space-y-3"
    >
      {/* Author Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <button 
            onClick={() => onProfileClick(post.authorHandle)}
            className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 hover:opacity-90 transition-opacity shadow-md`}
          >
            {initial}
          </button>

          {/* Handle & Time */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <button 
              onClick={() => onProfileClick(post.authorHandle)}
              className="font-bold text-sm text-white hover:underline truncate cursor-pointer"
            >
              {post.authorHandle}
            </button>
            <span className="text-neutral-500 text-xs">·</span>
            <span className="text-neutral-500 text-xs shrink-0">
              {formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>

        {/* Orbit / Follow / Delete Action */}
        <div className="flex items-center gap-2 shrink-0">
          {!isOwn && user && (
            <button
              onClick={() => isFollowingAuthor ? onUnfollow(post.authorUid) : onFollow(post.authorUid, post.authorHandle)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                isFollowingAuthor
                  ? "border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white bg-neutral-900/60"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              {isFollowingAuthor ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Orbiting</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>Orbit</span>
                </>
              )}
            </button>
          )}

          {isOwn && (
            <button 
              onClick={() => onDelete(post.id)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isDel 
                  ? "text-white bg-neutral-900 border border-white" 
                  : "text-neutral-500 hover:text-white hover:bg-neutral-900"
              }`}
              title={isDel ? "Confirm Delete" : "Delete Echo"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* News Dispatch Header Badge (if linked to topic) */}
      {(post.newsTopic || post.newsHeadline) && (
        <div className="px-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            {post.newsTopic && (
              <Link
                href={`/hashtag/${encodeURIComponent(post.newsTopic.replace(/^#+/, ""))}`}
                className="font-bold text-white uppercase hover:underline shrink-0"
              >
                #{post.newsTopic.replace(/^#+/, "")}
              </Link>
            )}
            {post.newsHeadline && (
              <span className="text-neutral-400 truncate">
                &quot;{post.newsHeadline}&quot;
              </span>
            )}
          </div>
          {post.newsLink && post.newsLink !== "#" && (
            <a
              href={post.newsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white hover:underline shrink-0 font-bold uppercase"
            >
              Dispatch ↗
            </a>
          )}
        </div>
      )}

      {/* Post Caption */}
      <div className="text-neutral-100 text-[15px] sm:text-base leading-relaxed break-words font-normal select-text">
        {parseCaption(post.caption)}
      </div>

      {/* Audio Stem / Track Attribution Chip */}
      <div className="flex items-center justify-between gap-2 py-1 text-xs text-neutral-400">
        <Link
          href={`/audio/${post.audioTrackId || post.id}`}
          className="flex items-center gap-1.5 hover:text-white transition-colors truncate max-w-[240px] sm:max-w-xs"
        >
          <Music className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="truncate text-neutral-400 hover:text-white">
            {post.audioTrackTitle || "Original Voice Take"} • {post.audioTrackArtist || post.authorHandle}
          </span>
        </Link>
        <Link
          href={`/studio?soundId=${encodeURIComponent(post.audioTrackId || post.id)}&soundUrl=${encodeURIComponent(post.audioUrl)}&soundTitle=${encodeURIComponent(post.audioTrackTitle || post.caption.slice(0, 30) || "Original Voice Take")}&soundArtist=${encodeURIComponent(post.audioTrackArtist || post.authorHandle)}${post.isVoiceMeme ? "&isMeme=true" : ""}`}
          className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-[11px] font-medium text-neutral-300 hover:text-white transition-all flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Use Audio</span>
        </Link>
      </div>

      {/* Modern Audio Player */}
      <AudioPlayer 
        audioUrl={post.audioUrl} 
        fallbackDurationSec={post.durationSec || 15}
        isActive={activePostId === post.id}
        onPlayToggle={p => {
          if (p) onActiveChange(post.id);
          else if (activePostId === post.id) onActiveChange(null);
        }}
        onFirstPlay={() => onFirstPlay(post)}
      />

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-1 text-neutral-400 select-none">
        {/* 1. Comment */}
        <button
          type="button"
          onClick={() => onComment(post)}
          className="group flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors p-1.5 -ml-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          title="Comments / Replies"
        >
          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-mono">{post.commentCount > 0 ? formatNum(post.commentCount) : ""}</span>
        </button>

        {/* 2. Voice Takes */}
        <button
          type="button"
          onClick={() => {
            soundSynth.playSubtlePop();
            setShowVoiceTakes((prev) => !prev);
          }}
          className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer ${
            showVoiceTakes ? "text-white font-bold bg-white/15 ring-1 ring-white/30" : "text-neutral-400 hover:text-white"
          }`}
          title="Voice Takes (Live Audio Replies)"
        >
          <Mic2 className={`w-4 h-4 group-hover:scale-110 transition-transform ${showVoiceTakes ? "text-white fill-white/20" : ""}`} />
          <span className={`text-xs font-mono ${showVoiceTakes ? "text-white font-bold" : ""}`}>
            {(post.reverbCount || 0) > 0 ? formatNum(post.reverbCount) : ""}
          </span>
        </button>

        {/* 3. Re-Echo (Repost) */}
        {!isOwn ? (
          <button
            type="button"
            onClick={() => onOrbit(post)}
            disabled={isOrbited}
            className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer ${
              isOrbited ? "text-white font-bold" : "text-neutral-400 hover:text-white"
            }`}
            title={isOrbited ? "Re-Echoed" : "Re-Echo to Followers"}
          >
            <Repeat2 className={`w-4 h-4 group-hover:scale-110 transition-transform ${isOrbited ? "text-white" : ""}`} />
            <span className={`text-xs font-mono ${isOrbited ? "text-white font-bold" : ""}`}>
              {(post.orbitedBy?.length || 0) > 0 ? formatNum(post.orbitedBy?.length || 0) : ""}
            </span>
          </button>
        ) : (
          <button type="button" disabled className="group flex items-center gap-1.5 p-1.5 rounded-full invisible" aria-hidden="true">
            <Repeat2 className="w-4 h-4" />
          </button>
        )}

        {/* 4. Pulse (Like) */}
        <button
          type="button"
          onClick={() => onPulse(post)}
          className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer ${
            isPulsed ? "text-white font-bold" : "text-neutral-400 hover:text-white"
          }`}
          title="Pulse / Like"
        >
          <Heart className={`w-4 h-4 group-hover:scale-110 transition-transform ${isPulsed ? "fill-white text-white" : ""}`} />
          <span className={`text-xs font-mono ${isPulsed ? "text-white font-bold" : ""}`}>
            {post.pulseCount > 0 ? formatNum(post.pulseCount) : ""}
          </span>
        </button>

        {/* 5. Bookmark */}
        <button
          type="button"
          onClick={() => onBookmark(post)}
          className={`group flex items-center gap-1.5 transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer ${
            isBookmarked ? "text-white font-bold" : "text-neutral-400 hover:text-white"
          }`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark Echo"}
        >
          <Bookmark className={`w-4 h-4 group-hover:scale-110 transition-transform ${isBookmarked ? "fill-white text-white" : ""}`} />
        </button>

        {/* 6. Views Count */}
        {displayViews > 0 && (
          <div 
            className="flex items-center gap-1.5 text-neutral-500 p-1.5"
            title={`${displayViews} views`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="text-xs font-mono">{formatNum(displayViews)}</span>
          </div>
        )}

        {/* 7. Share */}
        <button
          type="button"
          onClick={() => onShare(post)}
          className="group flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors p-1.5 -mr-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          title="Share Echo"
        >
          <Share className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Voice Replies Accordion (Toggled on Demand) */}
      {showVoiceTakes && (
        <PostReverbSection 
          post={post} 
          currentUser={user}
          onReplyClick={onReplyClick}
          onProfileClick={onProfileClick}
          onClose={() => setShowVoiceTakes(false)} 
        />
      )}
    </article>
  );
});

export default PostCard;
