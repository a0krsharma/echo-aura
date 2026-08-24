"use client";

import React, { useState } from "react";
import { X, Sparkles, ShoppingCart, Lock, Check } from "lucide-react";
import { VOICE_FILTERS } from "@/lib/voiceModulator";
import { purchaseItem } from "@/lib/userDoc";
import type { EchoUser } from "@/lib/userDoc";

interface ArcadeAuraStoreProps {
  isOpen: boolean;
  onClose: () => void;
  user: EchoUser | null;
}

export default function ArcadeAuraStore({ isOpen, onClose, user }: ArcadeAuraStoreProps) {
  const [activeTab, setActiveTab] = useState<"VOICE" | "SKINS">("VOICE");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async (itemId: string, cost: number) => {
    if (!user) return;
    setPurchasing(itemId);
    setError(null);
    try {
      const success = await purchaseItem(user.uid, itemId, cost);
      if (!success) {
        setError("Not enough Aura or already owned.");
      }
    } catch (err) {
      setError("Purchase failed. Try again.");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-950 border border-neutral-800 shadow-[0_0_40px_rgba(16,185,129,0.1)] w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-black uppercase tracking-widest text-lg">AURA STORE</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 text-neutral-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aura Balance */}
        <div className="p-4 flex items-center justify-between border-b border-neutral-900 bg-neutral-900/20">
          <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">YOUR BALANCE</span>
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span className="font-mono font-bold text-lg">{user?.auraScore || 0}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-neutral-900 text-xs font-bold uppercase tracking-widest">
          <button
            onClick={() => setActiveTab("VOICE")}
            className={`flex-1 py-3 text-center transition-colors ${activeTab === "VOICE" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20" : "text-neutral-500 hover:text-white"}`}
          >
            PREMIUM VOICE FILTERS
          </button>
          <button
            onClick={() => setActiveTab("SKINS")}
            className={`flex-1 py-3 text-center transition-colors ${activeTab === "SKINS" ? "text-emerald-400 border-b-2 border-emerald-400 bg-emerald-950/20" : "text-neutral-500 hover:text-white"}`}
          >
            COSMETIC SKINS
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-black">
          {error && <div className="mb-4 p-2 bg-red-950/50 border border-red-900 text-red-500 text-xs text-center font-bold">{error}</div>}

          {activeTab === "VOICE" && (
            <div className="space-y-3">
              {VOICE_FILTERS.map((f) => {
                const isOwned = !f.isPremium || user?.inventory?.includes(f.id);
                const isPurchasing = purchasing === f.id;

                return (
                  <div key={f.id} className="border border-neutral-800 bg-neutral-950 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{f.icon}</span>
                      <div>
                        <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2">
                          {f.name}
                          {!f.isPremium && <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5">DEFAULT</span>}
                        </h3>
                        <p className="text-neutral-400 text-xs mt-1">{f.description}</p>
                      </div>
                    </div>

                    <div>
                      {isOwned ? (
                        <div className="flex items-center gap-1 text-neutral-500 text-xs font-bold bg-neutral-900 px-3 py-1.5">
                          <Check className="w-3.5 h-3.5" /> OWNED
                        </div>
                      ) : (
                        <button
                          disabled={isPurchasing || (user?.auraScore || 0) < f.cost}
                          onClick={() => handlePurchase(f.id, f.cost)}
                          className="flex items-center gap-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500 text-emerald-400 px-4 py-1.5 font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPurchasing ? <span className="animate-pulse">BUYING...</span> : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>{f.cost} AURA</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "SKINS" && (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-neutral-800 space-y-3">
              <span className="text-4xl">🎨</span>
              <h3 className="text-white font-bold uppercase tracking-widest">COSMETIC SKINS DROP IN v2.1</h3>
              <p className="text-neutral-500 text-xs max-w-xs">Gold Ludo Boards, Neon Mallets, and custom Player Avatars are coming in the next major patch. Keep saving your Aura!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
