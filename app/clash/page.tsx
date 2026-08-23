"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Swords, X, Users, Radio, Trash2, Share2 } from "lucide-react";
import { subscribeToClashes, voteOnClash, deleteClash, type ClashItem } from "@/lib/clashes";
import { useAuth } from "@/app/components/AuthProvider";
import ChallengeModal from "@/app/components/ChallengeModal";

function fmt(n: number): string { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }

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
    if (!confirm("Are you sure you want to end and delete this debate?")) return;
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
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      <ChallengeModal isOpen={showChallenge} onClose={() => setShowChallenge(false)} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8 w-full">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-900 pb-6">
          <div className="space-y-1">
            <p className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <Swords className="w-3.5 h-3.5 text-white animate-pulse" />
              // 1V1 LIVE AUDIO DEBATES
            </p>
            <h1 className="text-2xl font-bold tracking-widest text-white uppercase">
              [ STAGE ]
            </h1>
          </div>
          <button
            onClick={() => setShowChallenge(true)}
            className="shrink-0 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-black bg-white px-4 py-2.5 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <Swords size={13} strokeWidth={2.5} />
            [ + CHALLENGE ]
          </button>
        </div>

        {/* Live Clashes Stream */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
            <span>// LIVE DEBATES ON [ STAGE ] ({clashes.length})</span>
            <span>AUDIENCE VOTE ARENA</span>
          </div>

          {clashes.length === 0 ? (
            <div className="border border-neutral-900 bg-neutral-950 p-12 text-center space-y-4">
              <Swords className="w-8 h-8 text-neutral-700 mx-auto animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                  NO ACTIVE DEBATES ON [ STAGE ] RIGHT NOW
                </p>
                <p className="text-[10px] text-neutral-600 max-w-sm mx-auto">
                  Challenge any node to a 1v1 live audio debate on stage.
                </p>
              </div>
              <button
                onClick={() => setShowChallenge(true)}
                className="inline-block mt-2 px-4 py-2 border border-white bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 cursor-pointer"
              >
                [ + LAUNCH FIRST DEBATE ]
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {clashes.map((c) => {
                const totalVotes = (c.sideA?.votes || 0) + (c.sideB?.votes || 0);
                const pctA = totalVotes > 0 ? ((c.sideA?.votes || 0) / totalVotes) * 100 : 50;
                const userVote = votedClashes[c.id];
                const isCreator = Boolean(
                  user && (
                    c.creatorUid === user.uid ||
                    (c.creatorHandle && user.handle && c.creatorHandle.toLowerCase() === user.handle.toLowerCase()) ||
                    (c.sideA?.handle && user.handle && c.sideA.handle.toLowerCase() === user.handle.toLowerCase()) ||
                    c.sideA?.handle === "@YOU" ||
                    c.creatorHandle === "@YOU"
                  )
                );

                return (
                  <div key={c.id} className="border border-neutral-800 bg-neutral-950 p-5 space-y-4 hover:border-neutral-700 transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="uppercase tracking-wider font-bold text-white">
                        {c.title || "LIVE STAGE DEBATE"}
                      </span>
                      <span className="text-neutral-500 uppercase tracking-wider font-bold">
                        {fmt(totalVotes)} VOTES // {c.listeners || 1} NODES
                      </span>
                    </div>

                    {/* Debate Topic */}
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">
                      "{c.topic}"
                    </h3>

                    {/* Side A & B Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 border border-neutral-900 bg-black space-y-2">
                        <div className="text-[10px] text-neutral-400 font-bold uppercase">
                          {c.sideA?.handle || "SIDE A"}
                        </div>
                        <p className="text-xs text-neutral-300 line-clamp-2">
                          "{c.sideA?.position}"
                        </p>
                        <button
                          onClick={() => handleVote(c.id, "A")}
                          disabled={!!userVote}
                          className={`w-full py-2 text-[10px] font-bold border uppercase tracking-wider transition-colors cursor-pointer ${
                            userVote === "A"
                              ? "border-white bg-white text-black"
                              : "border-neutral-800 text-neutral-400 hover:border-white hover:text-white bg-neutral-950"
                          }`}
                        >
                          {userVote === "A" ? "[ ✓ VOTED A ]" : `VOTE SIDE A (${c.sideA?.votes || 0})`}
                        </button>
                      </div>

                      <div className="p-3 border border-neutral-900 bg-black space-y-2">
                        <div className="text-[10px] text-neutral-400 font-bold uppercase">
                          {c.sideB?.handle || "SIDE B"}
                        </div>
                        <p className="text-xs text-neutral-300 line-clamp-2">
                          "{c.sideB?.position}"
                        </p>
                        <button
                          onClick={() => handleVote(c.id, "B")}
                          disabled={!!userVote}
                          className={`w-full py-2 text-[10px] font-bold border uppercase tracking-wider transition-colors cursor-pointer ${
                            userVote === "B"
                              ? "border-white bg-white text-black"
                              : "border-neutral-800 text-neutral-400 hover:border-white hover:text-white bg-neutral-950"
                          }`}
                        >
                          {userVote === "B" ? "[ ✓ VOTED B ]" : `VOTE SIDE B (${c.sideB?.votes || 0})`}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="space-y-3 pt-2">
                      <div className="w-full h-1 bg-neutral-900 relative">
                        <div className="h-full bg-white transition-all duration-500" style={{ width: `${pctA}%` }} />
                      </div>

                      <div className="flex justify-between items-center gap-2 pt-1 border-t border-neutral-900 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShareClash(c.id)}
                            className="p-1.5 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
                            title="Share debate"
                          >
                            <Share2 size={12} />
                          </button>
                          {isCreator && (
                            <button
                              onClick={() => handleDeleteClash(c.id)}
                              className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-200 border border-red-900/60 hover:border-red-500 bg-red-950/30 px-2 py-1 uppercase tracking-wider transition-colors cursor-pointer"
                              title="Delete debate"
                            >
                              <Trash2 size={11} />
                              <span>[ DELETE ]</span>
                            </button>
                          )}
                        </div>
                        <Link
                          href={`/stage/${c.id}`}
                          className="text-xs font-bold text-white border border-white px-4 py-2 hover:bg-white hover:text-black uppercase tracking-wider transition-colors whitespace-nowrap shrink-0"
                        >
                          [ 🎧 ENTER STAGE ]
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
