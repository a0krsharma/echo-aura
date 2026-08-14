"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords, X, Users, Radio, Trash2, Share2 } from "lucide-react";
import { subscribeToClashes, createClash, voteOnClash, deleteClash, type ClashItem } from "@/lib/clashes";
import { useAuth } from "@/app/components/AuthProvider";

function fmt(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }

function ChallengeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [topic, setTopic]   = useState("");
  const [title, setTitle]   = useState("");
  const [posA, setPosA]     = useState("");
  const [posB, setPosB]     = useState("");
  const [busy, setBusy]     = useState(false);

  const canSend = topic.trim().length > 5 && posA.trim().length > 5 && posB.trim().length > 5;

  async function handleSend() {
    if (!canSend) return;
    setBusy(true);
    try {
      const newId = await createClash({
        title: title || "LIVE STAGE DEBATE",
        topic: topic.trim(),
        handleA: "@YOU",
        posA: posA.trim(),
        handleB: handle || "@CHALLENGER",
        posB: posB.trim(),
      });
      onClose();
      router.push(`/stage/${newId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-black border border-neutral-700 p-6 md:p-8 animate-slide-up space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest text-neutral-500 mb-1">// CHALLENGE TO [ STAGE ]</p>
            <p className="font-serif italic text-white text-lg">Set the debate motion.</p>
          </div>
          <button onClick={onClose} className="text-neutral-600 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">DEBATE TITLE</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. AI vs Human Creativity"
            className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-xs text-white py-1 tracking-widest"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">OPPONENT HANDLE</label>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="@HANDLE"
            className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none font-mono text-xs text-white py-1 tracking-widest"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] tracking-widest text-neutral-600 block mb-1">DEBATE TOPIC / MOTION</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="State the debate question..."
            rows={2}
            className="w-full bg-transparent border border-neutral-800 focus:border-neutral-600 outline-none font-serif italic text-white p-2 text-sm leading-relaxed resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[9px] tracking-widest text-neutral-600 block mb-1">SIDE A STANCE</label>
            <textarea
              value={posA}
              onChange={e => setPosA(e.target.value)}
              placeholder="Side A stance..."
              rows={2}
              className="w-full bg-transparent border border-neutral-800 p-2 font-serif text-xs italic text-white"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] tracking-widest text-neutral-600 block mb-1">SIDE B STANCE</label>
            <textarea
              value={posB}
              onChange={e => setPosB(e.target.value)}
              placeholder="Side B stance..."
              rows={2}
              className="w-full bg-transparent border border-neutral-800 p-2 font-serif text-xs italic text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            disabled={!canSend || busy}
            onClick={handleSend}
            className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-black bg-white px-5 py-3 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-30"
          >
            <Swords size={12} strokeWidth={2} /> [ LAUNCH DEBATE ]
          </button>
          <button onClick={onClose} className="font-mono text-xs tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StagePage() {
  const { user } = useAuth();
  const [clashes, setClashes] = useState<ClashItem[]>([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [votedClashes, setVotedClashes] = useState<Record<string, "A" | "B">>({});

  // Stream live clashes from Firestore
  useEffect(() => {
    const unsub = subscribeToClashes((liveClashes) => {
      setClashes(liveClashes);
    });
    return () => unsub();
  }, []);

  const handleVote = async (clashId: string, side: "A" | "B") => {
    if (votedClashes[clashId]) return;
    setVotedClashes((prev) => ({ ...prev, [clashId]: side }));
    try {
      await voteOnClash(clashId, side);
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  const handleDeleteClash = async (clashId: string) => {
    if (!confirm("Delete this debate?")) return;
    try {
      await deleteClash(clashId);
    } catch (error) {
      console.error("Error deleting clash:", error);
    }
  };

  const handleShareClash = async (clashId: string) => {
    const shareUrl = `${window.location.origin}/stage/${clashId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Debate link copied to clipboard!");
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {showChallenge && <ChallengeModal onClose={() => setShowChallenge(false)} />}

      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-white">[ STAGE ]</span>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8 md:pt-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <p className="font-mono text-xs tracking-widest text-neutral-700 mb-3">// [ STAGE ] — WHERE VOICES CLASH</p>
            <h1 className="font-serif text-4xl italic text-white leading-tight">
              Two voices.<br />One truth.
            </h1>
          </div>
          <button
            onClick={() => setShowChallenge(true)}
            className="shrink-0 flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-black bg-white px-4 py-2.5 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Swords size={11} strokeWidth={2} />
            CHALLENGE
          </button>
        </div>

        {/* Live Clashes Stream */}
        <section className="space-y-6 mb-12">
          <p className="font-mono text-xs tracking-widest text-white">// LIVE DEBATES ON [ STAGE ]</p>
          {clashes.length === 0 ? (
            <div className="border border-neutral-900 p-8 text-center space-y-4">
              <p className="font-serif italic text-neutral-500 text-lg">
                No active debates on [ STAGE ] right now.
              </p>
              <button
                onClick={() => setShowChallenge(true)}
                className="px-4 py-2 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors"
              >
                [ ⚔ LAUNCH FIRST DEBATE ]
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {clashes.map((c) => {
                const totalVotes = (c.sideA?.votes || 0) + (c.sideB?.votes || 0);
                const pctA = totalVotes > 0 ? ((c.sideA?.votes || 0) / totalVotes) * 100 : 50;
                const userVote = votedClashes[c.id];

                return (
                  <div key={c.id} className="border border-neutral-800 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-white tracking-widest">{c.title}</span>
                      <span className="font-mono text-[10px] text-neutral-600 uppercase">{fmt(totalVotes)} VOTES</span>
                    </div>

                    <h3 className="font-serif italic text-xl text-white">
                      "{c.topic}"
                    </h3>

                    {/* Side A & B */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3 border border-neutral-900 space-y-2">
                        <div className="text-neutral-500">{c.sideA?.handle || "SIDE A"}</div>
                        <p className="font-serif italic text-neutral-300">"{c.sideA?.position}"</p>
                        <button
                          onClick={() => handleVote(c.id, "A")}
                          disabled={!!userVote}
                          className={`w-full py-1.5 border tracking-widest uppercase transition-colors ${
                            userVote === "A"
                              ? "border-white text-white"
                              : "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                          }`}
                        >
                          {userVote === "A" ? "✓ VOTED A" : `VOTE SIDE A (${c.sideA?.votes || 0})`}
                        </button>
                      </div>

                      <div className="p-3 border border-neutral-900 space-y-2">
                        <div className="text-neutral-500">{c.sideB?.handle || "SIDE B"}</div>
                        <p className="font-serif italic text-neutral-300">"{c.sideB?.position}"</p>
                        <button
                          onClick={() => handleVote(c.id, "B")}
                          disabled={!!userVote}
                          className={`w-full py-1.5 border tracking-widest uppercase transition-colors ${
                            userVote === "B"
                              ? "border-white text-white"
                              : "border-neutral-800 text-neutral-500 hover:border-white hover:text-white"
                          }`}
                        >
                          {userVote === "B" ? "✓ VOTED B" : `VOTE SIDE B (${c.sideB?.votes || 0})`}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Enter Live Relay Link */}
                    <div className="space-y-3 pt-2">
                      <div className="w-full h-1 bg-neutral-900 relative">
                        <div className="h-full bg-white transition-all duration-500" style={{ width: `${pctA}%` }} />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShareClash(c.id)}
                            className="font-mono text-[10px] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            title="Share debate"
                          >
                            <Share2 size={12} />
                          </button>
                          {user && c.sideA?.handle === user.handle && (
                            <button
                              onClick={() => handleDeleteClash(c.id)}
                              className="font-mono text-[10px] text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                              title="Delete debate"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <Link
                          href={`/stage/${c.id}`}
                          className="font-mono text-xs text-white border border-white px-3 py-1.5 hover:bg-white hover:text-black uppercase transition-colors"
                        >
                          [ 🎧 ENTER LIVE AUDIO RELAY ]
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
