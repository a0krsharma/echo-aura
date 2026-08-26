"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  ShoppingCart,
  Sparkles,
  Zap,
  Loader2,
  Info,
  Check,
  ShieldCheck,
  Shirt,
  Crown,
  User,
  ArrowLeft,
  Flame,
  Lock,
} from "lucide-react";
import { purchaseStoreItem, equipStoreItem } from "@/lib/userDoc";
import { soundSynth } from "@/lib/soundSynthesizer";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import Link from "next/link";
import ExpressiveAvatar from "@/app/components/avatar/ExpressiveAvatar";
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from "@/lib/avatarRig";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "SUITS & MECHS" | "CYBER HALOS & GEAR" | "TITLES" | "VOICE MODS";
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
    name: "Obsidian Stealth Mech",
    description: "Nanomesh carbon stealth armor with matte obsidian plating.",
    category: "SUITS & MECHS",
    cost: 450,
    icon: "🥋",
    type: "suit",
    outfitColor: "OBSIDIAN",
  },
  {
    id: "suit_neon_crimson",
    name: "Crimson Battle Armor",
    description: "High-voltage battle armor with radiant red energy conduits.",
    category: "SUITS & MECHS",
    cost: 650,
    icon: "🛡️",
    type: "suit",
    outfitColor: "CRIMSON",
  },
  {
    id: "suit_emerald_tux",
    name: "Royal Emerald Cyber Suit",
    description: "Ultra-luxury holographic emerald silk tuxedo with digital trim.",
    category: "SUITS & MECHS",
    cost: 800,
    icon: "💎",
    type: "suit",
    outfitColor: "EMERALD",
  },
  {
    id: "suit_gold_champion",
    name: "Golden Champion Robes",
    description: "Radiant 24K gold cyber robes reserved for tournament victors.",
    category: "SUITS & MECHS",
    cost: 1200,
    icon: "👑",
    type: "suit",
    outfitColor: "AMBER",
  },
  {
    id: "suit_cyan_runner",
    name: "Cyan Netrunner Exosuit",
    description: "Fiber-optic runner suit crafted for high-speed cyber duels.",
    category: "SUITS & MECHS",
    cost: 500,
    icon: "⚡",
    type: "suit",
    outfitColor: "CYAN",
  },

  // Cosmetics & Eyewear
  {
    id: "cosmetic_neon_border",
    name: "Neon Cyber Profile Halo",
    description: "Pulsing cyberpunk emerald halo ring with ambient glow.",
    category: "CYBER HALOS & GEAR",
    cost: 500,
    icon: "✨",
    type: "border",
  },
  {
    id: "item_cyber_visor",
    name: "Hologram Cyber Visor",
    description: "Glowing cyber HUD optic visor across avatar eyes.",
    category: "CYBER HALOS & GEAR",
    cost: 600,
    icon: "🕶️",
    type: "eyewear",
    eyewear: "CYBER_VISOR",
  },
  {
    id: "cosmetic_gold_dice",
    name: "Solid Gold 3D Dice",
    description: "Solid 24K gold die for Ludo, Monopoly & board tactics.",
    category: "CYBER HALOS & GEAR",
    cost: 950,
    icon: "🎲",
    type: "dice",
  },

  // Titles
  {
    id: "title_shadow_broker",
    name: "Shadow Broker",
    description: "Display the elite 'Shadow Broker' badge globally.",
    category: "TITLES",
    cost: 1500,
    icon: "🕵️",
    type: "title",
  },
  {
    id: "title_grandmaster",
    name: "Grandmaster Tycoon",
    description: "Display 'Grandmaster Tycoon' on your profile & match rooms.",
    category: "TITLES",
    cost: 2000,
    icon: "🎖️",
    type: "title",
  },

  // Voice Modulator
  {
    id: "voice_mod_darth",
    name: "Darth Voice Modulator",
    description: "Robotic cyber voice filter for live audio rooms.",
    category: "VOICE MODS",
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
  const userAura = user?.auraScore || 0;
  const rawAvatarConfig = (user as any)?.avatarConfig || DEFAULT_AVATAR_CONFIG;

  const effectiveAvatarConfig: AvatarConfig = {
    skinTone: rawAvatarConfig.skinTone || "ALMOND",
    hairStyle: rawAvatarConfig.hairStyle || "CYBER_FADE",
    hairColor: rawAvatarConfig.hairColor || "CYAN",
    eyewear:
      equipped.eyewear === "item_cyber_visor"
        ? "CYBER_VISOR"
        : rawAvatarConfig.eyewear || "CYBER_VISOR",
    outfitColor:
      equipped.suit === "suit_neon_crimson"
        ? "CRIMSON"
        : equipped.suit === "suit_emerald_tux"
        ? "EMERALD"
        : equipped.suit === "suit_gold_champion"
        ? "AMBER"
        : equipped.suit === "suit_cyan_runner"
        ? "CYAN"
        : equipped.suit === "suit_cyber_obsidian"
        ? "OBSIDIAN"
        : rawAvatarConfig.outfitColor || "OBSIDIAN",
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;
    if (userAura < item.cost) {
      setError("Insufficient Aura. Win matches in Echo Club to earn Aura!");
      setTimeout(() => setError(null), 3000);
      soundSynth.playBuzzer();
      return;
    }

    setPurchasing(item.id);
    try {
      const success = await purchaseStoreItem(user.uid, item.id, item.cost);
      if (success) {
        soundSynth.playFanfare();
        setSuccessMsg(`Unlocked ${item.name}!`);
        await handleEquip(item);
      } else {
        setError("Transaction failed. Please try again.");
        soundSynth.playBuzzer();
      }
    } catch {
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
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  const categories = [
    { id: "ALL", label: "ALL GEAR", count: SHOP_INVENTORY.length },
    { id: "SUITS & MECHS", label: "3D SUITS", count: SHOP_INVENTORY.filter(i => i.category === "SUITS & MECHS").length },
    { id: "CYBER HALOS & GEAR", label: "HALOS & GEAR", count: SHOP_INVENTORY.filter(i => i.category === "CYBER HALOS & GEAR").length },
    { id: "TITLES", label: "TITLES", count: SHOP_INVENTORY.filter(i => i.category === "TITLES").length },
    { id: "VOICE MODS", label: "AUDIO MODS", count: SHOP_INVENTORY.filter(i => i.category === "VOICE MODS").length },
  ];

  const filteredItems = activeCategory === "ALL"
    ? SHOP_INVENTORY
    : SHOP_INVENTORY.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-amber-500/30 overflow-x-hidden pb-28">
      {/* ── Minimal Sticky Navigation Header ── */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="p-2 border border-neutral-800 rounded-xl hover:border-white text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="Return to Profile"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-black text-sm sm:text-base uppercase tracking-widest text-white flex items-center gap-2">
              <span>ECHO VAULT // BLACK MARKET</span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-bold uppercase hidden sm:block">
              3D MECH SUITS • CYBER HALOS • PROFILE GEAR
            </p>
          </div>
        </div>

        {/* Aura Balance Capsule */}
        <Link
          href="/terminal"
          className="px-3 py-1.5 bg-neutral-950 border border-amber-400/60 rounded-xl font-black text-xs sm:text-sm text-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-1.5 hover:scale-105 transition-transform"
        >
          <span>🏆</span>
          <span>{userAura.toLocaleString()} AURA</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ── Equipped Wardrobe Spotlight Capsule ── */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900/80 to-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-between flex-wrap gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            {/* Live 3D Avatar Preview in Shop */}
            <div className={`w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center bg-black relative shrink-0 ${
              equipped.border === "cosmetic_neon_border"
                ? "border-emerald-400 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                : "border-neutral-700"
            }`}>
              <ExpressiveAvatar config={effectiveAvatarConfig} gesture="IDLE" size={64} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-white tracking-wide">
                  CURRENTLY EQUIPPED GEAR
                </span>
                <span className="text-[9px] px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full font-bold uppercase">
                  ACTIVE ON PROFILE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 flex items-center gap-2 flex-wrap">
                <span>SUIT: <strong className="text-white">{equipped.suit ? equipped.suit.replace('suit_', '').replace(/_/g, ' ').toUpperCase() : 'DEFAULT OBSIDIAN'}</strong></span>
                <span>•</span>
                <span>HALO: <strong className="text-emerald-400">{equipped.border ? 'NEON CYBER' : 'NONE'}</strong></span>
                <span>•</span>
                <span>TITLE: <strong className="text-yellow-400">{equipped.title ? equipped.title.replace('title_', '').replace(/_/g, ' ').toUpperCase() : 'NONE'}</strong></span>
              </p>
            </div>
          </div>

          <Link
            href="/profile"
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
          >
            VIEW PROFILE →
          </Link>
        </div>

        {/* ── Minimal Category Filter Pills ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                soundSynth.playSubtlePop();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-white text-black font-black shadow-md scale-105"
                  : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* ── Status Notifications ── */}
        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-xs font-bold uppercase rounded-xl flex items-center gap-2 animate-in fade-in">
            <Info className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold uppercase rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── World-Class Minimal Luxury Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const ownsItem = (user.inventory || []).includes(item.id);
            const isEquipped = equipped[item.type] === item.id;
            const canAfford = userAura >= item.cost;
            
            return (
              <div 
                key={item.id} 
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden backdrop-blur-md ${
                  isEquipped
                    ? "bg-neutral-950/90 border-amber-400 ring-1 ring-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]"
                    : ownsItem
                    ? "bg-neutral-950/80 border-neutral-700 hover:border-neutral-500"
                    : "bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-black text-sm uppercase text-white tracking-wide flex items-center gap-2">
                          <span>{item.name}</span>
                          {isEquipped && (
                            <span className="text-[9px] px-2 py-0.5 bg-amber-400 text-black font-black rounded-md uppercase">
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
                  <p className="text-xs text-neutral-400 mb-4 min-h-[32px] leading-relaxed">
                    {item.description}
                  </p>
                </div>
                
                <div className="mt-auto pt-3 border-t border-neutral-900">
                  {ownsItem ? (
                    <button 
                      onClick={() => handleEquip(item)}
                      disabled={equipping === item.id}
                      className={`w-full py-2.5 font-black text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isEquipped
                          ? "bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                          : "bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white active:scale-95"
                      }`}
                    >
                      {equipping === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>[ ⚡ EQUIPPED • TAP TO UNEQUIP ]</span>
                        </>
                      ) : (
                        <span>[ 🥋 EQUIP TO PROFILE ]</span>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePurchase(item)}
                      disabled={purchasing === item.id || !canAfford}
                      className={`w-full py-2.5 font-black text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                        !canAfford 
                          ? 'bg-neutral-900/60 border border-neutral-800 text-neutral-600 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.25)] active:scale-95'
                      }`}
                    >
                      {purchasing === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {!canAfford && <Lock className="w-3.5 h-3.5" />}
                          <span>{canAfford ? 'UNLOCK GEAR •' : 'LOCKED •'}</span>
                          <span className={canAfford ? 'font-black' : 'text-neutral-500'}>
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
