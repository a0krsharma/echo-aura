"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Mic2, Bookmark, Radio, Sparkle, Check } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  subscribeToPosts, togglePulsePost, createPost, deletePost,
  incrementPostViews,
} from "@/lib/posts";
import {
  addBookmark, removeBookmark, subscribeToUserBookmarks,
} from "@/lib/bookmarks";
import { useRouter } from "next/navigation";
import { createNotification } from "@/lib/notifications";
import { followUser, unfollowUser, subscribeToFollowing } from "@/lib/follows";
import { soundSynth } from "@/lib/soundSynthesizer";

// ─── Extracted Components ─────────────────────────────────────────────────────
import PostCard, { PostSkeleton, type FeedPost } from "@/app/components/feed/PostCard";
import ReplyRecordModal from "@/app/components/feed/ReplyRecordModal";
import TextCommentSection from "@/app/components/feed/TextCommentSection";

// ─── Home Feed Page ───────────────────────────────────────────────────────────
export default function HomeFeedPage() {
  const { user }                      = useAuth();
  const router                        = useRouter();
  const [posts, setPosts]             = useState<FeedPost[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"for-you" | "following" | "bookmarks">("for-you");
  const [orbitedPosts, setOrbited]    = useState<Set<string>>(new Set());
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [activePostId, setActiveId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [replyModal, setReplyModal]   = useState<{ post: FeedPost; rid?: string; rh?: string } | null>(null);
  const [commentPost, setCommentPost] = useState<FeedPost | null>(null);
  const [following, setFollowing]     = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg]       = useState<string | null>(null);

  const articleRefs     = useRef<Map<string, HTMLElement>>(new Map());
  const viewedPostsRef  = useRef<Set<string>>(new Set());

  // 1. Subscribe to Live Frequency Posts
  useEffect(() => {
    const unsub = subscribeToPosts(live => {
      setPosts(live.map(p => ({
        id: p.id,
        audioUrl: p.audioUrl,
        caption: p.caption,
        authorHandle: p.authorHandle || "@ANON",
        authorUid: p.authorUid || "anon",
        pulseCount: p.pulseCount || 0,
        pulsedBy: p.pulsedBy || [],
        orbitedBy: (p as any).orbitedBy || [],
        duration: p.duration || "00:15",
        durationSec: p.durationSec || 15,
        reverbCount: p.reverbCount || 0,
        commentCount: (p as any).commentCount || 0,
        viewsCount: (p as any).viewsCount || 0,
        bookmarkCount: (p as any).bookmarkCount || 0,
        createdAt: p.createdAt,
        newsTopic: p.newsTopic,
        newsHeadline: p.newsHeadline,
        newsLink: p.newsLink,
        audioTrackId: p.audioTrackId,
        audioTrackTitle: p.audioTrackTitle,
        audioTrackArtist: p.audioTrackArtist,
        isVoiceMeme: p.isVoiceMeme,
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to Following for authenticated user
  useEffect(() => {
    if (!user?.uid) {
      setFollowing(new Set());
      return;
    }
    const unsub = subscribeToFollowing(user.uid, (list) => {
      setFollowing(new Set(list.map((f) => f.followingUid)));
    });
    return () => unsub();
  }, [user?.uid]);

  // 3. Subscribe to Bookmarks for authenticated user
  useEffect(() => {
    if (!user?.uid) {
      setBookmarkedPostIds(new Set());
      return;
    }
    const unsub = subscribeToUserBookmarks(user.uid, (bookmarks) => {
      setBookmarkedPostIds(new Set(bookmarks.map(b => b.postId)));
    });
    return () => unsub();
  }, [user?.uid]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const setRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) articleRefs.current.set(id, el);
    else articleRefs.current.delete(id);
  }, []);

  // Mark view on impression / play
  const handleFirstPlay = useCallback((post: FeedPost) => {
    if (viewedPostsRef.current.has(post.id)) return;
    viewedPostsRef.current.add(post.id);
    incrementPostViews(post.id);
  }, []);

  const handlePulse = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    soundSynth.playSubtlePop();
    const pulsed = post.pulsedBy.includes(user.uid);
    await togglePulsePost(post.id, user.uid, pulsed);
    if (!pulsed) {
      await createNotification(post.authorUid, {
        type: "pulse",
        fromUid: user.uid,
        fromHandle: user.handle || "@ANON",
        postId: post.id,
        postCaption: post.caption,
        text: `${user.handle} pulsed your echo.`
      });
    }
  };

  const handleOrbit = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    if (orbitedPosts.has(post.id)) return;
    soundSynth.playSubtlePop();
    setOrbited(prev => new Set([...prev, post.id]));
    await createPost({
      audioUrl: post.audioUrl,
      caption: `[ RE-ECHO ] "${post.caption.slice(0, 60)}${post.caption.length > 60 ? "…" : ""}" — ${post.authorHandle}`,
      authorUid: user.uid,
      authorHandle: user.handle || "@ANON",
      duration: post.duration,
      durationSec: post.durationSec,
      orbitOf: post.id,
      orbitOfHandle: post.authorHandle
    } as any);
    await createNotification(post.authorUid, {
      type: "reverb",
      fromUid: user.uid,
      fromHandle: user.handle || "@ANON",
      postId: post.id,
      postCaption: post.caption,
      text: `${user.handle} re-echoed your post.`
    });
    showToast("Re-echoed to your profile!");
  };

  const handleBookmark = async (post: FeedPost) => {
    if (!user) { router.push("/login"); return; }
    soundSynth.playSubtlePop();
    const isBookmarked = bookmarkedPostIds.has(post.id);

    // Optimistic UI state
    setBookmarkedPostIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    try {
      if (isBookmarked) {
        await removeBookmark(user.uid, post.id);
        showToast("Bookmark removed");
      } else {
        await addBookmark(
          user.uid,
          post.id,
          post.authorUid,
          post.authorHandle,
          post.caption,
          post.audioUrl,
          post.duration,
          post.durationSec,
          post.pulseCount
        );
        showToast("Saved to Bookmarks");
      }
    } catch (e) {
      console.error("Bookmark toggle failed:", e);
    }
  };

  const handleShare = async (post: FeedPost) => {
    soundSynth.playSubtlePop();
    const url = `${window.location.origin}/${post.authorHandle.replace(/^@/, "")}`;
    const d = { title: `Echo by ${post.authorHandle}`, text: `"${post.caption}"`, url };
    if (navigator.share && navigator.canShare?.(d)) {
      try { await navigator.share(d); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${d.text} ${d.url}`);
        showToast("Link copied to clipboard!");
      } catch {}
    }
  };

  const handleDelete = async (postId: string) => {
    if (deletingId === postId) {
      try {
        await deletePost(postId);
        setDeletingId(null);
        showToast("Echo deleted");
      } catch (e) {
        console.error(e);
        setDeletingId(null);
      }
    } else {
      setDeletingId(postId);
      setTimeout(() => setDeletingId(p => p === postId ? null : p), 3000);
    }
  };

  const handleFollow = async (uid: string, handle: string) => {
    if (!user) return;
    soundSynth.playSubtlePop();
    try {
      await followUser(user.uid, user.handle || "@ANON", uid, handle);
      setFollowing(prev => new Set([...prev, uid]));
      showToast(`Orbiting ${handle}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnfollow = async (uid: string) => {
    if (!user) return;
    soundSynth.playSubtlePop();
    try {
      await unfollowUser(user.uid, uid);
      setFollowing(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
      showToast("Stopped orbiting");
    } catch (e) {
      console.error(e);
    }
  };

  // Filter posts based on active tab
  const displayedPosts = useMemo(() => {
    if (activeTab === "following") {
      return posts.filter(p => following.has(p.authorUid) || p.authorUid === user?.uid);
    }
    if (activeTab === "bookmarks") {
      return posts.filter(p => bookmarkedPostIds.has(p.id));
    }
    return posts;
  }, [posts, activeTab, following, bookmarkedPostIds, user?.uid]);

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-16 flex flex-col font-sans selection:bg-neutral-800">
      
      {/* ── Sticky Header with Segment Control (Twitter / X Style) ── */}
      <header className="sticky top-[49px] md:top-0 z-30 w-full bg-black/85 backdrop-blur-md border-b border-neutral-900">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          
          {/* Feed Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 h-full">
            <button
              onClick={() => { setActiveTab("for-you"); soundSynth.playSubtlePop(); }}
              className={`relative px-3 sm:px-4 h-full flex items-center text-sm font-bold transition-colors cursor-pointer ${
                activeTab === "for-you" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span>For You</span>
              {activeTab === "for-you" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab("following"); soundSynth.playSubtlePop(); }}
              className={`relative px-3 sm:px-4 h-full flex items-center text-sm font-bold transition-colors cursor-pointer ${
                activeTab === "following" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span>Following</span>
              {activeTab === "following" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab("bookmarks"); soundSynth.playSubtlePop(); }}
              className={`relative px-3 sm:px-4 h-full flex items-center gap-1.5 text-sm font-bold transition-colors cursor-pointer ${
                activeTab === "bookmarks" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${activeTab === "bookmarks" ? "fill-white text-white" : ""}`} />
              <span className="hidden xs:inline">Bookmarks</span>
              {activeTab === "bookmarks" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Feed Container ── */}
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col border-x border-neutral-900/60">
        {loading ? (
          <div className="divide-y divide-neutral-900">
            {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shadow-inner">
              {activeTab === "bookmarks" ? (
                <Bookmark className="w-6 h-6" />
              ) : activeTab === "following" ? (
                <Radio className="w-6 h-6" />
              ) : (
                <Mic2 className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-lg font-bold text-white">
                {activeTab === "bookmarks" 
                  ? "No Bookmarks Yet" 
                  : activeTab === "following" 
                  ? "No Followed Echoes" 
                  : "The Stream is Silent"}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {activeTab === "bookmarks"
                  ? "Save interesting voice takes by tapping the bookmark icon to revisit them anytime."
                  : activeTab === "following"
                  ? "Orbit creators you love to see their latest voice takes directly in this feed."
                  : "Be the voice that starts the wave. Record your first unfiltered audio take."}
              </p>
            </div>

            {activeTab === "for-you" && (
              <Link 
                href="/studio" 
                className="px-5 py-2.5 bg-white text-black font-semibold text-xs rounded-full hover:bg-neutral-200 transition-colors shadow-md"
              >
                Drop First Echo
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {displayedPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                orbitedPosts={orbitedPosts}
                isBookmarked={bookmarkedPostIds.has(post.id)}
                activePostId={activePostId}
                deletingId={deletingId}
                onPulse={handlePulse}
                onOrbit={handleOrbit}
                onShare={handleShare}
                onBookmark={handleBookmark}
                onDelete={handleDelete}
                onReplyClick={(rid?: string, rh?: string) => {
                  if (!user) { router.push("/login"); return; }
                  setReplyModal({ post, rid, rh });
                }}
                onComment={(p: FeedPost) => {
                  if (!user) { router.push("/login"); return; }
                  setCommentPost(p);
                }}
                onProfileClick={h => router.push(`/${h.replace(/^@/, "")}`)}
                onActiveChange={setActiveId}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                following={following}
                setRef={setRef}
                onFirstPlay={handleFirstPlay}
              />
            ))}
          </div>
        )}

        {/* ── Footer Topic Discovery Chips ── */}
        <section className="p-6 border-t border-neutral-900 space-y-4 text-xs select-none">
          <div className="space-y-1">
            <h3 className="font-bold text-neutral-200 text-xs uppercase tracking-wider flex items-center gap-2">
              <Sparkle className="w-3.5 h-3.5 text-white" />
              Discover Topics & Channels
            </h3>
            <p className="text-neutral-500 text-xs">
              Explore unfiltered discussions, trending voice reels, and audio rooms across topics.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              "tech", "ai", "crypto", "startup", "music", "debates", "news",
              "philosophy", "gaming", "culture", "india", "global", "finance", "podcasts"
            ].map((tag) => (
              <Link
                key={tag}
                href={`/hashtag/${tag}`}
                className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-xs text-neutral-400 hover:text-white transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-3 border-t border-neutral-900">
            <span>© {new Date().getFullYear()} Echo Audio Network</span>
            <div className="flex items-center gap-3">
              <Link href="/waves" className="hover:text-white transition-colors">Waves</Link>
              <Link href="/clash" className="hover:text-white transition-colors">Stage</Link>
              <Link href="/rooms" className="hover:text-white transition-colors">Rooms</Link>
              <Link href="/arcade" className="hover:text-white transition-colors">Arcade</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Voice Reply Modal */}
      {replyModal && (
        <ReplyRecordModal
          postId={replyModal.post.id}
          postCaption={replyModal.post.caption}
          postAuthorHandle={replyModal.post.authorHandle}
          postAuthorUid={replyModal.post.authorUid}
          reverbOfReverbId={replyModal.rid}
          reverbOfHandle={replyModal.rh}
          currentUser={user}
          onClose={() => setReplyModal(null)}
        />
      )}

      {/* Text Comments Sheet */}
      {commentPost && (
        <TextCommentSection
          postId={commentPost.id}
          postAuthorUid={commentPost.authorUid}
          currentUser={user}
          onClose={() => setCommentPost(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-4 py-2 rounded-full text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
