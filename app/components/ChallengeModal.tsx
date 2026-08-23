"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords, X, Calendar, Clock, Sparkles, CheckCircle2, User, HelpCircle } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { createClash } from "@/lib/clashes";
import { Timestamp } from "firebase/firestore";

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOpponentHandle?: string;
  defaultOpponentUid?: string;
  defaultTopic?: string;
}

export default function ChallengeModal({
  isOpen,
  onClose,
  defaultOpponentHandle = "",
  defaultOpponentUid,
  defaultTopic = "",
}: ChallengeModalProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [handle, setHandle] = useState(defaultOpponentHandle || "");
  const [topic, setTopic] = useState(defaultTopic || "");
  const [title, setTitle] = useState("");
  const [posA, setPosA] = useState("");
  const [posB, setPosB] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getDefaultScheduledTime = (hoursAhead = 1) => {
    const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    const pad = (n: number) => (n < 10 ? "0" + n : String(n));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Topic only needs >= 2 chars; stances have default fallbacks
  const canSend = Boolean(topic.trim().length >= 2 && user);

  const handleSend = async () => {
    if (!canSend || !user) {
      if (!user) setError("You must be logged in to challenge.");
      else if (topic.trim().length < 2) setError("Please enter a debate topic or motion.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const myHandle = user.handle || "@YOU";
      const cleanOpponentHandle = handle.trim() 
        ? (handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`)
        : "@CHALLENGER";

      const finalPosA = posA.trim() || "IN FAVOR / PRO";
      const finalPosB = posB.trim() || "AGAINST / CON";
      const finalTitle = title.trim() || `1V1 DEBATE: ${topic.trim().toUpperCase()}`;

      let schedTimestamp: Timestamp | null = null;
      if (scheduleMode && scheduledFor) {
        schedTimestamp = Timestamp.fromDate(new Date(scheduledFor));
      }

      const newId = await createClash({
        title: finalTitle,
        topic: topic.trim(),
        handleA: myHandle,
        posA: finalPosA,
        handleB: cleanOpponentHandle,
        posB: finalPosB,
        creatorUid: user.uid,
        creatorHandle: myHandle,
        targetUid: defaultOpponentUid,
        status: scheduleMode ? "upcoming" : "live",
        scheduledFor: schedTimestamp,
      });

      onClose();
      router.push(`/stage/${newId}`);
    } catch (err: any) {
      console.error("[ChallengeModal] Failed to launch debate:", err);
      setError(err?.message || "Failed to initialize debate stage. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in font-mono text-white">
      <div className="w-full max-w-lg bg-neutral-950 border border-white p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-neutral-900 pb-3">
          <div className="space-y-0.5">
            <p className="text-[10px] tracking-widest text-[#1DB954] uppercase flex items-center gap-1.5 font-bold">
              <Swords className="w-3.5 h-3.5 text-[#1DB954]" />
              // 1V1 STAGE DEBATE CHALLENGE
            </p>
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              SET DEBATE MOTION & ARENA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 border border-red-800 bg-red-950/50 text-red-300 text-xs font-bold uppercase">
            ⚠️ {error}
          </div>
        )}

        {/* Transmission Type Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScheduleMode(false)}
            className={`p-2.5 text-center border font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
              !scheduleMode
                ? "border-white bg-white text-black shadow-md"
                : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
            }`}
          >
            <Swords size={13} />
            <span>[ ⚡ LIVE NOW ]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScheduleMode(true);
              if (!scheduledFor) setScheduledFor(getDefaultScheduledTime(1));
            }}
            className={`p-2.5 text-center border font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
              scheduleMode
                ? "border-white bg-white text-black shadow-md"
                : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600 hover:text-white"
            }`}
          >
            <Calendar size={13} />
            <span>[ 📅 SCHEDULE ]</span>
          </button>
        </div>

        {/* Schedule Time Selector */}
        {scheduleMode && (
          <div className="p-3 border border-neutral-800 bg-black space-y-1.5 animate-fade-in">
            <label className="text-[10px] tracking-widest text-neutral-400 block uppercase font-bold">
              TRANSMISSION DATE & TIME:
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              style={{ colorScheme: "dark" }}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 p-2 text-xs text-white outline-none focus:border-white cursor-pointer"
            />
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3 text-xs">
          {/* Opponent Handle */}
          <div>
            <label className="text-[10px] tracking-widest text-neutral-400 block mb-1 uppercase font-bold flex items-center justify-between">
              <span>OPPONENT HANDLE</span>
              <span className="text-[9px] text-neutral-500 font-normal">OPPONENT WILL BE NOTIFIED</span>
            </label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@abhishek or @CHALLENGER"
              className="w-full bg-black border border-neutral-800 focus:border-white p-2.5 text-xs text-white placeholder-neutral-700 outline-none uppercase"
            />
          </div>

          {/* Debate Topic / Motion (Required) */}
          <div>
            <label className="text-[10px] tracking-widest text-neutral-400 block mb-1 uppercase font-bold flex items-center justify-between">
              <span>DEBATE TOPIC / MOTION *</span>
              <span className="text-[9px] text-[#1DB954]">REQUIRED</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Is AI going to replace junior developers by 2027?"
              rows={2}
              className="w-full bg-black border border-neutral-800 focus:border-white p-2.5 text-xs text-white placeholder-neutral-700 outline-none resize-none"
            />
          </div>

          {/* Debate Title (Optional) */}
          <div>
            <label className="text-[10px] tracking-widest text-neutral-500 block mb-1 uppercase font-bold">
              DEBATE TITLE (OPTIONAL)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. THE AI CODING DISRUPTION"
              className="w-full bg-black border border-neutral-800 focus:border-white p-2.5 text-xs text-white placeholder-neutral-700 outline-none uppercase"
            />
          </div>

          {/* Stances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[9px] tracking-widest text-neutral-500 block mb-1 uppercase font-bold">
                SIDE A STANCE ({user?.handle || "@YOU"})
              </label>
              <textarea
                value={posA}
                onChange={(e) => setPosA(e.target.value)}
                placeholder="Defaults to: IN FAVOR / PRO"
                rows={2}
                className="w-full bg-black border border-neutral-800 focus:border-white p-2 text-xs text-white placeholder-neutral-700 outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-[9px] tracking-widest text-neutral-500 block mb-1 uppercase font-bold">
                SIDE B STANCE ({handle || "@OPPONENT"})
              </label>
              <textarea
                value={posB}
                onChange={(e) => setPosB(e.target.value)}
                placeholder="Defaults to: AGAINST / CON"
                rows={2}
                className="w-full bg-black border border-neutral-800 focus:border-white p-2 text-xs text-white placeholder-neutral-700 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Actions & Launch Button */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-900 flex-wrap">
          <span className="text-[10px] text-neutral-500 uppercase">
            {canSend ? "● READY TO TRANSMIT" : "⚠️ ENTER A DEBATE TOPIC TO LAUNCH"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs tracking-widest uppercase text-neutral-500 hover:text-white px-3 py-2 transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={!canSend || busy}
              onClick={handleSend}
              className="flex items-center gap-2 text-xs tracking-widest uppercase border border-white bg-white text-black font-bold px-5 py-2.5 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            >
              <Swords size={13} strokeWidth={2.5} />
              <span>{busy ? "LAUNCHING..." : scheduleMode ? "[ SCHEDULE DEBATE ]" : "[ LAUNCH DEBATE ]"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
