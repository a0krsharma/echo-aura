"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { ShoppingCart, Sparkles, Zap, Loader2, Info } from "lucide-react";
import { purchaseStoreItem } from "@/lib/userDoc";
import { soundSynth } from "@/lib/soundSynthesizer";

const SHOP_INVENTORY = [
  {
    id: "cosmetic_neon_border",
    name: "Neon Profile Border",
    description: "Wraps your profile picture in a pulsing cyberpunk neon border.",
    category: "Cosmetics",
    cost: 500,
    icon: <Sparkles className="w-5 h-5 text-emerald-400" />
  },
  {
    id: "cosmetic_gold_dice",
    name: "Solid Gold Ludo Dice",
    description: "Equip a solid gold rolling die for all Ludo matches.",
    category: "Cosmetics",
    cost: 1200,
    icon: <Zap className="w-5 h-5 text-yellow-400" />
  },
  {
    id: "voice_mod_darth",
    name: "Darth Voice Modulator",
    description: "A premium voice filter for live audio rooms.",
    category: "Audio",
    cost: 2500,
    icon: <Zap className="w-5 h-5 text-red-500" />
  },
  {
    id: "title_shadow_broker",
    name: "Title: Shadow Broker",
    description: "Display 'Shadow Broker' under your name globally.",
    category: "Titles",
    cost: 3000,
    icon: <Sparkles className="w-5 h-5 text-purple-400" />
  }
];

export default function ShopPage() {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (itemId: string, cost: number) => {
    if (!user) return;
    if ((user.auraScore || 0) < cost) {
      setError("Insufficient Aura.");
      setTimeout(() => setError(null), 3000);
      soundSynth.playBuzzer();
      return;
    }

    setPurchasing(itemId);
    try {
      const success = await purchaseStoreItem(user.uid, itemId, cost);
      if (success) {
        soundSynth.playFanfare();
        // Fire local update optionally, but user doc updates should naturally trigger if there is a snapshot listener.
      } else {
        setError("Purchase failed. Try again.");
        soundSynth.playBuzzer();
      }
    } catch (e) {
      setError("Error processing transaction.");
    } finally {
      setPurchasing(null);
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white p-4">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-emerald-500/30 overflow-x-hidden pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <h1 className="font-black text-lg sm:text-xl uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
            THE BLACK MARKET
          </h1>
        </div>
        <div className="px-3 py-1 bg-emerald-950 border border-emerald-500 rounded font-bold text-sm text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          {user.auraScore || 0} AURA
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase text-white">Spend Your Aura</h2>
          <p className="text-neutral-400 text-sm">
            Purchase exclusive cosmetics, voice modulators, and profile enhancements using your hard-earned Aura.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950 border border-red-500 text-red-400 text-xs font-bold uppercase rounded flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHOP_INVENTORY.map((item) => {
            const ownsItem = user.inventory?.includes(item.id);
            const canAfford = (user.auraScore || 0) >= item.cost;
            
            return (
              <div 
                key={item.id} 
                className="bg-neutral-950 border border-neutral-800 p-4 rounded-lg flex flex-col justify-between transition-all hover:border-neutral-600 relative overflow-hidden group"
              >
                {/* Background glow on hover */}
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-black border border-neutral-800 rounded">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm uppercase text-white">{item.name}</h3>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4 h-10">{item.description}</p>
                </div>
                
                <div className="mt-auto">
                  {ownsItem ? (
                    <button 
                      disabled 
                      className="w-full py-2 bg-neutral-900 border border-neutral-700 text-neutral-500 font-bold text-xs uppercase rounded cursor-not-allowed"
                    >
                      [ OWNED ]
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePurchase(item.id, item.cost)}
                      disabled={purchasing === item.id || !canAfford}
                      className={`w-full py-2 font-bold text-xs uppercase rounded transition-all flex items-center justify-center gap-2 shadow-sm ${
                        !canAfford 
                          ? 'bg-neutral-900 border border-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                      }`}
                    >
                      {purchasing === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>BUY FOR</span>
                          <span className={canAfford ? 'text-emerald-600 font-black' : 'text-neutral-500'}>
                            {item.cost} AURA
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
