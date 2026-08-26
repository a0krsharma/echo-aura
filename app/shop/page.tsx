"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { ShoppingCart, Sparkles, Zap, Loader2, Info, Check, ShieldCheck, Shirt, Crown, User, ArrowLeft } from "lucide-react";
import { purchaseStoreItem, equipStoreItem } from "@/lib/userDoc";
import { soundSynth } from "@/lib/soundSynthesizer";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import Link from "next/link";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "Suits & Outfits" | "Cosmetics" | "Titles" | "Audio";
  cost: number;
  icon: string;
  type: "suit" | "border" | "title" | "dice" | "eyewear";
  outfitColor?: "OBSIDIAN" | "CRIMSON" | "EMERALD" | "AMBER" | "CYAN" | "WHITE";
  eyewear?: "CYBER_VISOR" | "RETRO_SHADES" | "WIREFRAME_GLASSES";
}

const SHOP_INVENTORY: ShopItem[] = [
  // Suits & Outfits
  {
    id: "suit_cyber_obsidian",
    name: "Obsidian Stealth Mech Suit",
    description: "Equips sleek black nanomesh stealth armor on your 3D profile avatar.",
    category: "Suits & Outfits",
    cost: 450,
    icon: "🥋",
    type: "suit",
    outfitColor: "OBSIDIAN",
  },
  {
    id: "suit_neon_crimson",
    name: "Crimson Cyber Battle Armor",
    description: "High-voltage crimson battle armor with glowing neon energy conduits.",
    category: "Suits & Outfits",
    cost: 650,
    icon: "🛡️",
    type: "suit",
    outfitColor: "CRIMSON",
  },
  {
    id: "suit_emerald_tux",
    name: "Royal Emerald Cyber Suit",
    description: "Ultra-luxurious holographic emerald silk tuxedo with digital trim.",
    category: "Suits & Outfits",
    cost: 800,
    icon: "💎",
    type: "suit",
    outfitColor: "EMERALD",
  },
  {
    id: "suit_gold_champion",
    name: "Golden Champion Aura Robes",
    description: "Radiant 24K gold cyber robes reserved for high-stakes victors.",
    category: "Suits & Outfits",
    cost: 1200,
    icon: "👑",
    type: "suit",
    outfitColor: "AMBER",
  },
  {
    id: "suit_cyan_runner",
    name: "Cyan Netrunner Exosuit",
    description: "Fiber-optic cyan runner suit designed for lightning cyber duels.",
    category: "Suits & Outfits",
    cost: 500,
    icon: "⚡",
    type: "suit",
    outfitColor: "CYAN",
  },

  // Cosmetics & Eyewear
  {
    id: "cosmetic_neon_border",
    name: "Neon Cyber Profile Halo",
    description: "Wraps your 3D avatar & profile picture in a pulsing cyberpunk neon halo.",
    category: "Cosmetics",
    cost: 500,
    icon: "✨",
    type: "border",
  },
  {
    id: "item_cyber_visor",
    name: "Holographic Cyber Visor",
    description: "Equips an animated glowing cyber HUD visor across your 3D avatar eyes.",
    category: "Cosmetics",
    cost: 600,
    icon: "🕶️",
    type: "eyewear",
    eyewear: "CYBER_VISOR",
  },
  {
    id: "cosmetic_gold_dice",
    name: "Solid Gold Ludo Dice",
    description: "Equip a solid 24K gold rolling die for all Ludo and Board matches.",
    category: "Cosmetics",
    cost: 950,
    icon: "🎲",
    type: "dice",
  },

  // Titles
  {
    id: "title_shadow_broker",
    name: "Title: Shadow Broker",
    description: "Display 'Shadow Broker' under your name and on the live leaderboard.",
    category: "Titles",
    cost: 1500,
    icon: "🕵️",
    type: "title",
  },
  {
    id: "title_grandmaster",
    name: "Title: Grandmaster Tycoon",
    description: "Display the elite 'Grandmaster Tycoon' badge across all match rooms.",
    category: "Titles",
    cost: 2000,
    icon: "🎖️",
    type: "title",
  },

  // Voice Modulator
  {
    id: "voice_mod_darth",
    name: "Darth Voice Modulator",
    description: "A premium robotic cyber voice filter for live audio rooms.",
    category: "Audio",
    cost: 2500,
    icon: "🎙️",
    type: "title",
  },
];

export default function ShopPage() {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const equipped = (user as any)?.equipped || {};

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;
    if ((user.auraScore || 0) < item.cost) {
      setError("Insufficient Aura. Play matches to earn more!");
      setTimeout(() => setError(null), 3000);
      soundSynth.playBuzzer();
      return;
    }

    setPurchasing(item.id);
    try {
      const success = await purchaseStoreItem(user.uid, item.id, item.cost);
      if (success) {
        soundSynth.playFanfare();
        setSuccessMsg(`Successfully purchased ${item.name}!`);
        // Auto-equip purchased suit/cosmetic
        await handleEquip(item);
      } else {
        setError("Purchase failed. Try again.");
        soundSynth.playBuzzer();
      }
    } catch (e) {
      setError("Error processing transaction.");
    } finally {
      setPurchasing(null);
      setTimeout(() => {
        setError(null);
        setSuccessMsg(null);
      }, 3500);
    }
  };

  const handleEquip = async (item: ShopItem) => {
    if (!user) return;
    setEquipping(item.id);
    soundSynth.playSubtlePop();

    try {
      const isCurrentlyEquipped = equipped[item.type] === item.id;
      const targetVal = isCurrentlyEquipped ? null : item.id;

      await equipStoreItem(user.uid, item.type, targetVal);

      // If item is a suit or eyewear, synchronize with 3D avatarConfig
      if (item.type === "suit" && item.outfitColor) {
        const db = getFirebaseDb();
        await updateDoc(doc(db, "users", user.uid), {
          "avatarConfig.outfitColor": isCurrentlyEquipped ? "OBSIDIAN" : item.outfitColor,
        });
      } else if (item.type === "eyewear" && item.eyewear) {
        const db = getFirebaseDb();
        await updateDoc(doc(db, "users", user.uid), {
          "avatarConfig.eyewear": isCurrentlyEquipped ? "NONE" : item.eyewear,
        });
      }

      soundSynth.playGong();
    } catch (err) {
      console.error("Failed to toggle equip:", err);
    } finally {
      setEquipping(null);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white p-4">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const categories = ["ALL", "Suits & Outfits", "Cosmetics", "Titles", "Audio"];
  const filteredItems = activeCategory === "ALL"
    ? SHOP_INVENTORY
    : SHOP_INVENTORY.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-emerald-500/30 overflow-x-hidden pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="p-1.5 border border-neutral-800 rounded-lg hover:border-white text-neutral-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <h1 className="font-black text-base sm:text-lg uppercase tracking-widest text-white">
                ECHO AURA STORE // BLACK MARKET
              </h1>
              <p className="text-[10px] text-neutral-400 uppercase font-bold">
                UNLOCK 3D SUITS • NEON HALOS • TITLES &amp; GEAR
              </p>
            </div>
          </div>
        </div>
        <div className="px-3.5 py-1.5 bg-neutral-900 border border-amber-400/50 rounded-xl font-bold text-xs sm:text-sm text-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-1.5">
          <span>🏆</span>
          <span>{user.auraScore || 0} AURA</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                soundSynth.playSubtlePop();
              }}
              className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? "bg-white text-black shadow-md scale-105"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3 bg-red-950 border border-red-500 text-red-400 text-xs font-bold uppercase rounded-xl flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950 border border-emerald-500 text-emerald-400 text-xs font-bold uppercase rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const ownsItem = (user.inventory || []).includes(item.id);
            const isEquipped = equipped[item.type] === item.id;
            const canAfford = (user.auraScore || 0) >= item.cost;
            
            return (
              <div 
                key={item.id} 
                className={`bg-neutral-950 border p-4 rounded-2xl flex flex-col justify-between transition-all relative overflow-hidden group ${
                  isEquipped
                    ? "border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    : ownsItem
                    ? "border-neutral-700 hover:border-neutral-500"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-xl">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm uppercase text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {isEquipped && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-400 text-black font-black rounded uppercase">
                              EQUIPPED
                            </span>
                          )}
                        </h3>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mb-4 min-h-8">{item.description}</p>
                </div>
                
                <div className="mt-auto pt-2 border-t border-neutral-900">
                  {ownsItem ? (
                    <button 
                      onClick={() => handleEquip(item)}
                      disabled={equipping === item.id}
                      className={`w-full py-2.5 font-black text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isEquipped
                          ? "bg-amber-400 hover:bg-amber-300 text-black shadow-md"
                          : "bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white"
                      }`}
                    >
                      {equipping === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>[ EQUIPPED • TAP TO UNEQUIP ]</span>
                        </>
                      ) : (
                        <span>[ EQUIP TO PROFILE ]</span>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePurchase(item)}
                      disabled={purchasing === item.id || !canAfford}
                      className={`w-full py-2.5 font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                        !canAfford 
                          ? 'bg-neutral-900 border border-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                      }`}
                    >
                      {purchasing === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>UNLOCK FOR</span>
                          <span className={canAfford ? 'text-amber-600 font-black' : 'text-neutral-500'}>
                            +{item.cost} AURA
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
