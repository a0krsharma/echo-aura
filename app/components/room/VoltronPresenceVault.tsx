"use client";

import React, { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Key, Users, Volume2, Play, Pause, Sparkles, Shield, Radio, Check } from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { type RoomParticipant } from "@/lib/rooms";

interface VoltronPresenceVaultProps {
  roomId: string;
  participants: RoomParticipant[];
  requiredKeys?: number;
  vaultTitle?: string;
  secretAudioUrl?: string;
  secretConfession?: string;
}

export default function VoltronPresenceVault({
  roomId,
  participants,
  requiredKeys = 3,
  vaultTitle = "VOLTRON MULTI-PRESENCE AUDIO VAULT",
  secretAudioUrl,
  secretConfession = "Confession Decrypted: 'The secret to winning every Echo tournament is controlling the tempo and baiting early dice rolls.'",
}: VoltronPresenceVaultProps) {
  const activeCount = participants.length;
  const isUnlocked = activeCount >= requiredKeys;
  const [hasPlayedUnlockSound, setHasPlayedUnlockSound] = useState(false);
  const [isPlayingSecret, setIsPlayingSecret] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isUnlocked && !hasPlayedUnlockSound) {
      soundSynth.playFanfare();
      setHasPlayedUnlockSound(true);
    }
  }, [isUnlocked, hasPlayedUnlockSound]);

  const handleTogglePlay = () => {
    if (!secretAudioUrl) return;
    if (isPlayingSecret) {
      audioRef.current?.pause();
      setIsPlayingSecret(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = secretAudioUrl;
        audioRef.current.play().catch(console.error);
        setIsPlayingSecret(true);
      }
    }
  };

  const keySlots = Array.from({ length: requiredKeys }, (_, i) => {
    const participant = participants[i];
    return {
      slot: i + 1,
      isOccupied: Boolean(participant),
      handle: participant?.handle || `NODE_KEY_0${i + 1}`,
      isSpeaker: participant?.isSpeaker || false,
    };
  });

  return (
    <div className="border border-neutral-800 bg-gradient-to-r from-neutral-950 via-neutral-900/80 to-neutral-950 p-4 sm:p-5 rounded-3xl space-y-4 font-mono text-white shadow-xl select-none">
      {secretAudioUrl && (
        <audio
          ref={audioRef}
          onEnded={() => setIsPlayingSecret(false)}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all ${
            isUnlocked
              ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
              : "bg-neutral-900 border-neutral-800 text-neutral-400"
          }`}>
            {isUnlocked ? <Unlock className="w-4 h-4 animate-bounce" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-white flex items-center gap-2">
              <span>{vaultTitle}</span>
              {isUnlocked && (
                <span className="text-[9px] px-2 py-0.5 bg-emerald-500 text-black font-black rounded-md uppercase">
                  DECRYPTED
                </span>
              )}
            </h3>
            <p className="text-[10px] text-neutral-400 font-sans">
              {isUnlocked
                ? "All presence keys synchronized. Vault unlocked!"
                : `Requires ${requiredKeys} squad members live in this room simultaneously to decrypt.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-black border border-neutral-800 rounded-xl text-xs font-black">
          <span className={isUnlocked ? "text-emerald-400" : "text-amber-400"}>
            {Math.min(activeCount, requiredKeys)} / {requiredKeys}
          </span>
          <span className="text-neutral-500 uppercase text-[10px]">KEYS</span>
        </div>
      </div>

      {/* Multi-Presence Key Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {keySlots.map((key) => (
          <div
            key={key.slot}
            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
              key.isOccupied
                ? "bg-neutral-900/90 border-emerald-500/80 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                : "bg-black/60 border-dashed border-neutral-800 text-neutral-600"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                key.isOccupied ? "bg-emerald-500 text-black" : "bg-neutral-900 text-neutral-600"
              }`}>
                {key.isOccupied ? <Check className="w-3.5 h-3.5" /> : `0${key.slot}`}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${key.isOccupied ? "text-white" : "text-neutral-500"}`}>
                  {key.isOccupied ? key.handle : "AWAITING SQUAD..."}
                </p>
                <span className="text-[9px] uppercase tracking-wider block text-neutral-500 font-mono">
                  {key.isOccupied ? "KEY INSERTED 🟢" : "LOCKED 🔒"}
                </span>
              </div>
            </div>

            <Key className={`w-4 h-4 shrink-0 ${key.isOccupied ? "text-emerald-400" : "text-neutral-700"}`} />
          </div>
        ))}
      </div>

      {/* Decrypted Vault Content */}
      {isUnlocked ? (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/60 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>CONFIDENTIAL AUDIO DROP UNLOCKED</span>
            </span>
            {secretAudioUrl && (
              <button
                onClick={handleTogglePlay}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isPlayingSecret ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingSecret ? "PAUSE DROP" : "LISTEN AUDIO"}</span>
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed italic bg-black/60 p-3 rounded-xl border border-neutral-900">
            {secretConfession}
          </p>
        </div>
      ) : (
        <div className="p-3 bg-black/60 border border-neutral-900 rounded-2xl flex items-center justify-between text-xs text-neutral-500">
          <span>Invite {requiredKeys - activeCount} more friend(s) to this room to unlock</span>
          <span className="text-[10px] text-amber-400 font-bold uppercase">ENCRYPTED 256-BIT</span>
        </div>
      )}
    </div>
  );
}
