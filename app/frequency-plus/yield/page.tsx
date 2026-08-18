"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  Flame,
  Radio,
  Headphones,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { type FrequencyPlusEpisode, calculateVoltYield } from "@/lib/frequencyPlus";

export default function VoltYieldDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [episodes, setEpisodes] = useState<FrequencyPlusEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [voltsBalance, setVoltsBalance] = useState(0);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!user) return;
    setVoltsBalance((user as any).volts || user.auraScore || 0);

    const loadCreatorEpisodes = async () => {
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, "frequency_plus_episodes"),
          where("creatorUid", "==", user.uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => {
          const data = d.data();
          const metrics = {
            listens: data.metrics?.listens || data.listensCount || 0,
            pulses: data.metrics?.pulses || data.pulsesCount || 0,
            voiceReplies: data.metrics?.voiceReplies || data.voiceRepliesCount || 0,
            shares: data.metrics?.shares || 0,
          };
          return {
            id: d.id,
            ...data,
            metrics,
            totalVoltsGenerated: data.totalVoltsGenerated || calculateVoltYield(metrics),
          } as FrequencyPlusEpisode;
        });
        setEpisodes(list);
      } catch (err) {
        console.error("Failed to load episodes:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCreatorEpisodes();
  }, [user]);

  // Volt Spending Action (Room Boost)
  const handleBoostRoom = async () => {
    if (!user) return;
    if (voltsBalance < 100) {
      setActionError("[ INSUFFICIENT VOLTS ] You need 100 Volts to boost your room.");
      return;
    }

    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, "users", user.uid), {
        volts: increment(-100),
      });
      setVoltsBalance((prev) => prev - 100);
      setActionSuccess("[ ROOM BOOST ACTIVATED ] Your frequency is pinned to #1 on Radar for 30 minutes.");
      setActionError("");
    } catch (err) {
      setActionError("Failed to apply boost.");
    }
  };

  const totalVoltsMined = episodes.reduce((acc, ep) => acc + ep.totalVoltsGenerated, 0);

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-8 pb-4 border-b border-neutral-900 max-w-4xl mx-auto">
        <Link
          href="/frequency-plus"
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          <span>FREQUENCY+</span>
        </Link>
        <span className="text-[10px] text-yellow-400 uppercase tracking-widest font-bold flex items-center gap-1">
          <Zap size={12} className="fill-yellow-400" />
          VOLT YIELD ECONOMY
        </span>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Wallet Card */}
        <div className="border border-white bg-neutral-950 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
            <span>// CREATOR TELEMETRY DASHBOARD</span>
            <span>PROOF-OF-TRANSMISSION MINT</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="border border-neutral-800 bg-black p-4 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase">AVAILABLE VOLTS</span>
              <p className="text-2xl font-bold text-yellow-400 flex items-center gap-1.5">
                <Zap size={20} className="fill-yellow-400" />
                {voltsBalance.toLocaleString()} V
              </p>
            </div>

            <div className="border border-neutral-800 bg-black p-4 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase">LIFETIME VOLTS MINED</span>
              <p className="text-2xl font-bold text-white">
                +{totalVoltsMined.toLocaleString()} V
              </p>
            </div>

            <div className="border border-neutral-800 bg-black p-4 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase">TRANSMISSIONS</span>
              <p className="text-2xl font-bold text-white">
                {episodes.length} EPISODES
              </p>
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="p-3 border border-neutral-800 bg-black text-xs text-neutral-400 space-y-1">
            <p className="font-bold text-white uppercase text-[10px] tracking-widest">// THE VOLT YIELD FORMULA</p>
            <p className="font-mono text-[11px] text-neutral-300">
              Yield = (Listens × 0.1) + (Pulses × 0.5) + (Voice Takes × 2.0)
            </p>
            <p className="text-[10px] text-neutral-500">
              Volts are passively minted by the Echo protocol based on real audience engagement with your 15-minute transmissions.
            </p>
          </div>
        </div>

        {/* Action Status Messages */}
        {actionSuccess && (
          <div className="p-3 border border-green-800 bg-green-950/40 text-green-400 text-xs flex items-center gap-2">
            <Check size={14} />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3 border border-red-800 bg-red-950/40 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Volt Sinks / Spending Actions */}
        <div className="border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <p className="text-xs font-bold text-white uppercase tracking-widest">// SPEND VOLTS (INTERNAL ECONOMY)</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Boost Room */}
            <div className="border border-neutral-800 bg-black p-4 space-y-2 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-white uppercase">[ 🚀 BOOST ACTIVE LIVE ROOM ]</p>
                <p className="text-[10px] text-neutral-400 pt-1">
                  Pin your currently broadcast live room to the top #1 spot on Radar for 30 minutes.
                </p>
              </div>
              <button
                onClick={handleBoostRoom}
                className="w-full mt-3 py-2 border border-yellow-400 bg-yellow-400 text-black font-bold text-xs uppercase hover:bg-yellow-300 transition-colors cursor-pointer"
              >
                SPEND 100 VOLTS ➔
              </button>
            </div>

            {/* Aura Amplifier */}
            <div className="border border-neutral-800 bg-black p-4 space-y-2 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-white uppercase">[ ⚡ AURA AMPLIFIER (2X REPUTATION) ]</p>
                <p className="text-[10px] text-neutral-400 pt-1">
                  Double Aura score gain on all new echoes and clashes for the next 24 hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setActionSuccess("[ AMPLIFIER ACTIVATED ] 2X Aura multiplier active.");
                }}
                className="w-full mt-3 py-2 border border-neutral-800 text-neutral-300 hover:border-white text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                SPEND 50 VOLTS ➔
              </button>
            </div>
          </div>
        </div>

        {/* Transmission Breakdown Table */}
        <div className="border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <p className="text-xs font-bold text-white uppercase tracking-widest">// RECENT TRANSMISSION YIELDS</p>

          {episodes.length === 0 ? (
            <p className="text-center py-6 text-xs text-neutral-600 uppercase tracking-widest">
              NO TRANSMISSIONS LOGGED YET. PUBLISH IN THE STUDIO TO MINT VOLTS.
            </p>
          ) : (
            <div className="space-y-2 divide-y divide-neutral-900">
              {episodes.map((ep) => (
                <div key={ep.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-white truncate max-w-sm">{ep.title}</p>
                    <span className="text-[10px] text-neutral-500">
                      {ep.metrics.listens} Listens • {ep.metrics.pulses} Pulses • {ep.metrics.voiceReplies} Takes
                    </span>
                  </div>
                  <span className="text-yellow-400 font-bold font-mono text-xs">
                    +{ep.totalVoltsGenerated} VOLTS
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
