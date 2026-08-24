"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Swords,
  ShieldAlert,
  Flame,
  Clock,
  Zap,
} from "lucide-react";
import {
  subscribeIncomingChallenges,
  respondToChallenge,
  type ArcadeChallenge,
} from "@/lib/arcadeChallenges";
import { soundSynth } from "@/lib/soundSynthesizer";

interface IncomingChallengeListenerProps {
  user: { uid: string; handle: string } | null;
  onAcceptChallenge?: (challenge: ArcadeChallenge) => void;
}

export default function IncomingChallengeListener({
  user,
  onAcceptChallenge,
}: IncomingChallengeListenerProps) {
  const router = useRouter();
  const [activeChallenges, setActiveChallenges] = useState<ArcadeChallenge[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<ArcadeChallenge | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeIncomingChallenges(user.uid, (challenges) => {
      setActiveChallenges(challenges);
      if (challenges.length > 0 && !currentChallenge) {
        const top = challenges[0];
        setCurrentChallenge(top);
        soundSynth.playFanfare();
      }
    });

    return () => unsub();
  }, [user?.uid, currentChallenge]);

  // Countdown timer for pending challenge
  useEffect(() => {
    if (!currentChallenge) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((currentChallenge.expiresAt - Date.now()) / 1000));
      setTimeLeftSec(remaining);
      if (remaining <= 0) {
        setCurrentChallenge(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentChallenge]);

  if (!currentChallenge) return null;

  const handleAccept = async () => {
    soundSynth.playSnare();
    try {
      await respondToChallenge(currentChallenge.id, "ACCEPTED");
      if (onAcceptChallenge) {
        onAcceptChallenge(currentChallenge);
      } else {
        router.push(`/arcade?join=${currentChallenge.roomId}`);
      }
      setCurrentChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async () => {
    soundSynth.playBuzzer();
    try {
      await respondToChallenge(currentChallenge.id, "DECLINED");
      setCurrentChallenge(null);
    } catch (e) {
      console.error(e);
    }
  };

  const mins = Math.floor(timeLeftSec / 60);
  const secs = timeLeftSec % 60;
  const timerStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full p-2 animate-in slide-in-from-bottom-5 duration-300 font-mono text-white select-none">
      <div className="bg-black border-2 border-red-500 p-4 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.35)] space-y-3 relative overflow-hidden">
        {/* Top Warning Strip */}
        <div className="flex items-center justify-between border-b border-red-950 pb-2">
          <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-wider animate-pulse">
            <Swords className="w-4 h-4" />
            <span>&gt;&gt; INCOMING DUEL CHALLENGE</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold">
            <Clock className="w-3 h-3 text-red-400 animate-spin" />
            <span>EXPIRES: {timerStr}</span>
          </div>
        </div>

        {/* Challenger & Taunt Details */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-white truncate">
              {currentChallenge.challengerHandle} POKED YOU!
            </h3>
            <span className="px-2 py-0.5 bg-red-950 border border-red-700 text-red-300 font-mono text-[9px] font-bold uppercase rounded">
              {currentChallenge.gameName}
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-amber-300 text-xs font-bold italic">
            "{currentChallenge.trashTalkText}"
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDecline}
            className="py-2.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 font-bold text-xs uppercase rounded-lg transition-all cursor-pointer"
          >
            [ ❌ DECLINE ]
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>[ ⚔️ ACCEPT DUEL ]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
