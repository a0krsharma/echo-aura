"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, Loader2 } from 'lucide-react';
import { subscribeToPostComments, createComment, toggleLikeComment, deleteComment, type CommentItem } from '@/lib/comments';
import { createNotification } from '@/lib/notifications';
import { soundSynth } from '@/lib/soundSynthesizer';
import { formatNum, formatRelativeTime } from '@/app/utils/formatters';

export default function TextCommentSection({ postId, postAuthorUid, currentUser, onClose }: {
  postId: string; postAuthorUid: string; currentUser: any; onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToPostComments(postId, setComments);
    return () => unsub();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser || loading) return;
    setLoading(true);
    try {
      await createComment({
        postId,
        parentId: null,
        authorUid: currentUser.uid,
        authorHandle: currentUser.handle || "@ANON",
        text: text.trim(),
      });
      if (postAuthorUid && postAuthorUid !== currentUser.uid) {
        try {
          await createNotification(postAuthorUid, {
            type: "reverb" as any,
            fromUid: currentUser.uid,
            fromHandle: currentUser.handle || "@ANON",
            postId,
            text: `${currentUser.handle || "@ANON"} commented on your echo.`,
          });
        } catch (notifErr) {
          console.warn("[TextCommentSection] Notification warning:", notifErr);
        }
      }
      setText("");
      soundSynth.playSubtlePop();
    } catch (err) {
      console.warn("[TextCommentSection] Warning creating comment:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (c: CommentItem) => {
    if (!currentUser) return;
    soundSynth.playSubtlePop();
    const isLiked = (c.likedBy || []).includes(currentUser.uid);
    await toggleLikeComment(c.id, currentUser.uid, isLiked);
  };

  const handleDelete = async (cId: string) => {
    await deleteComment(cId, postId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-black border border-white sm:rounded-3xl h-[75vh] sm:h-[65vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm text-white">Comments</h3>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-neutral-500">
              <MessageCircle className="w-8 h-8 opacity-40" />
              <p className="text-xs">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map(c => {
              const liked = currentUser ? (c.likedBy || []).includes(currentUser.uid) : false;
              const isOwn = currentUser?.uid === c.authorUid;
              return (
                <div key={c.id} className="space-y-1 bg-black p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{c.authorHandle}</span>
                    <span className="text-[10px] text-neutral-500">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">{c.text}</p>
                  <div className="flex items-center gap-4 pt-1">
                    <button 
                      onClick={() => handleLike(c)} 
                      className={`flex items-center gap-1 text-[11px] cursor-pointer transition-colors ${
                        liked ? "text-white font-bold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-white text-white" : ""}`} />
                      <span>{c.likeCount > 0 ? formatNum(c.likeCount) : ""}</span>
                    </button>
                    {isOwn && (
                      <button onClick={() => handleDelete(c.id)} className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3.5 border-t border-neutral-900 bg-neutral-950">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={text} 
              onChange={e => setText(e.target.value)}
              placeholder={currentUser ? "Write a comment..." : "Sign in to comment"}
              disabled={!currentUser || loading}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-600 transition-colors"
            />
            <button 
              type="submit" 
              disabled={!text.trim() || !currentUser || loading}
              className="px-4 bg-white text-black font-semibold text-xs rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
