"use client";

import React, { useState, useEffect } from 'react';
import { Mic2, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { subscribeToPostReverbs, togglePulsePostReverb, toggleReverbReaction, type PostReverbItem } from '@/lib/posts';
import { soundSynth } from '@/lib/soundSynthesizer';
import { formatNum } from '@/app/utils/formatters';
import AudioPlayer from '@/app/components/audio/AudioPlayer';

interface FeedPost { 
  id: string; 
  [key: string]: any; 
}

export default function PostReverbSection({
  post,
  currentUser,
  onProfileClick,
  onReplyClick,
  onClose,
}: {
  post: FeedPost;
  currentUser: any;
  onProfileClick: (h: string) => void;
  onReplyClick: (reverbOfId?: string, reverbOfHandle?: string) => void;
  onClose?: () => void;
}) {
  const [reverbs, setReverbs] = useState<PostReverbItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToPostReverbs(post.id, (list) => {
      setReverbs(list);
      setLoading(false);
    });
    return () => unsub();
  }, [post.id]);

  const handlePulse = async (rv: PostReverbItem) => {
    if (!currentUser) return;
    soundSynth.playSubtlePop();
    const isPulsed = (rv.pulsedBy || []).includes(currentUser.uid);
    await togglePulsePostReverb(post.id, rv.id, currentUser.uid, isPulsed);
  };

  const handleReact = async (rv: PostReverbItem, emoji: string) => {
    if (!currentUser) return;
    soundSynth.playSubtlePop();
    try {
      await toggleReverbReaction(
        post.id,
        rv.id,
        { uid: currentUser.uid, handle: currentUser.handle || "@ANON" },
        emoji,
        rv.handle
      );
    } catch (e) {
      console.warn("Reaction failed:", e);
    }
  };

  return (
    <div className="border-t border-white/10 bg-neutral-950 p-3.5 sm:p-4 space-y-3 rounded-b-2xl animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-black shadow-sm">
            <Mic2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Voice Takes ({reverbs.length})</span>
            </h4>
            <p className="text-[10px] text-neutral-400 font-mono">
              Live audio replies & community reactions recorded for this echo.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white px-2 py-1 text-xs font-mono transition-colors cursor-pointer border border-neutral-800 hover:border-neutral-600 rounded"
            title="Close Voice Takes"
          >
            [ ✕ ]
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 text-xs text-neutral-500 font-mono">
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2 text-white" />
          Loading voice takes...
        </div>
      ) : reverbs.length === 0 ? (
        <div className="text-center py-3.5 px-4 bg-black/60 border border-neutral-900 rounded-xl space-y-2.5">
          <p className="text-xs text-neutral-400 font-mono">No voice takes recorded for this echo yet.</p>
          {currentUser && (
            <button 
              type="button"
              onClick={() => onReplyClick()} 
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>[ + DROP FIRST VOICE TAKE ]</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reverbs.map((rv) => {
            const pulsed = currentUser ? (rv.pulsedBy || []).includes(currentUser.uid) : false;

            return (
              <div key={rv.id} className="space-y-2 bg-neutral-900/60 border border-white/10 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => onProfileClick(rv.handle)} 
                      className="text-xs font-semibold text-white hover:underline cursor-pointer"
                    >
                      {rv.handle}
                    </button>
                    {rv.isVoiceMeme && (
                      <span className="text-[9px] bg-white text-black px-1.5 py-0.5 rounded font-bold uppercase">
                        V-Meme
                      </span>
                    )}
                    {rv.reverbOfHandle && (
                      <span className="text-[11px] text-neutral-500">↩ {rv.reverbOfHandle}</span>
                    )}
                  </div>
                </div>

                {rv.caption && (
                  <p className="text-xs text-white leading-relaxed">{rv.caption}</p>
                )}

                {rv.audioUrl && (
                  <AudioPlayer audioUrl={rv.audioUrl} fallbackDurationSec={rv.durationSec || 5} small />
                )}

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => handlePulse(rv)} 
                      className={`flex items-center gap-1 text-xs cursor-pointer transition-colors ${
                        pulsed ? "text-white font-bold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${pulsed ? "fill-white text-white" : ""}`} />
                      <span>{rv.pulseCount > 0 ? formatNum(rv.pulseCount) : ""}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => onReplyClick(rv.id, rv.handle)} 
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {currentUser && (
            <button 
              type="button"
              onClick={() => onReplyClick()} 
              className="flex items-center justify-center gap-2 text-xs text-black bg-white hover:bg-neutral-200 py-2 px-3 rounded-xl transition-all w-full cursor-pointer font-bold uppercase shadow-sm active:scale-95"
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>[ + DROP A VOICE TAKE ]</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
