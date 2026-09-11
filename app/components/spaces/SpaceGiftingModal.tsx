"use client";

/**
 * app/components/spaces/SpaceGiftingModal.tsx
 * ─────────────────────────────────────────────────────
 * Virtual Gifting & Boutique Wardrobe Store:
 * - Send gifts (Roses, Crown, Teddy Bear, Chocolates) to friends
 * - Buy & Equip luxury outfits (Gala Tuxedo, Rave Suit, Gold Aviators)
 * - Uses Virtual Paper Cash (💵 Echo Cash)
 */

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Gift,
  Shirt,
  Heart,
  Crown,
  Send,
  Check,
  DollarSign,
  User,
} from "lucide-react";
import {
  GIFTS_CATALOG,
  BOUTIQUE_OUTFITS,
  GiftItem,
  BoutiqueOutfit,
  getWalletState,
  spendCash,
} from "@/lib/spacesEconomy";
import { SpatialAvatar, AvatarConfig } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface SpaceGiftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onSendGift: (targetHandle: string, gift: GiftItem, note: string) => void;
  onEquipOutfit: (newConfig: Partial<AvatarConfig>) => void;
}

export default function SpaceGiftingModal({
  isOpen,
  onClose,
  localAvatar,
  remoteAvatars,
  onSendGift,
  onEquipOutfit,
}: SpaceGiftingModalProps) {
  const [activeTab, setActiveTab] = useState<"gifts" | "wardrobe">("gifts");
  const [wallet, setWallet] = useState(getWalletState());

  // Gifting state
  const [selectedRecipient, setSelectedRecipient] = useState<string>(
    remoteAvatars[0]?.handle || "@FRIEND"
  );
  const [giftNote, setGiftNote] = useState("");
  const [justSentGift, setJustSentGift] = useState<string | null>(null);

  // Wardrobe state
  const [justEquippedId, setJustEquippedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendGift = (gift: GiftItem) => {
    if (wallet.balance < gift.price) {
      spacesSfx.playKeyNote(1);
      alert(`Not enough paper money! You need $${gift.price} Cash (Balance: $${wallet.balance})`);
      return;
    }

    const success = spendCash(gift.price, `Sent ${gift.name} to ${selectedRecipient}`);
    if (success) {
      setWallet(getWalletState());
      setJustSentGift(gift.id);
      spacesSfx.playCashRegister();
      setTimeout(() => spacesSfx.playPartyFanfare(), 250);

      onSendGift(selectedRecipient, gift, giftNote.trim() || "A special gift for you in Echo Spaces!");
      setTimeout(() => setJustSentGift(null), 2000);
      setGiftNote("");
    }
  };

  const handleBuyOutfit = (outfit: BoutiqueOutfit) => {
    if (wallet.balance < outfit.price) {
      spacesSfx.playKeyNote(1);
      alert(`Not enough paper money! You need $${outfit.price} Cash (Balance: $${wallet.balance})`);
      return;
    }

    const success = spendCash(outfit.price, `Bought outfit: ${outfit.name}`);
    if (success) {
      setWallet(getWalletState());
      setJustEquippedId(outfit.id);
      spacesSfx.playCashRegister();

      onEquipOutfit({
        outfit: outfit.outfitType as any,
        outfitColor: outfit.color,
        accessory: outfit.accessory || "none",
      });

      setTimeout(() => setJustEquippedId(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-900 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-lg text-lg">
              🎁
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white font-mono flex items-center gap-2">
                <span>VIRTUAL GIFTS & BOUTIQUE WARDROBE</span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Surprise friends with luxury presents or buy stylish gala outfits!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-mono text-xs font-black flex items-center gap-1.5 shadow-sm">
              <span>💵</span>
              <span>${wallet.balance}</span>
              <span className="text-[10px] text-emerald-500 font-normal">CASH</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 border-b border-neutral-900 bg-neutral-950 flex items-center gap-2">
          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setActiveTab("gifts");
            }}
            className={`px-4 py-2 rounded-t-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === "gifts"
                ? "bg-neutral-900 text-pink-400 border-pink-400"
                : "text-neutral-400 hover:text-white border-transparent"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Send Gifts to Friends</span>
          </button>

          <button
            onClick={() => {
              spacesSfx.playKeyNote(3);
              setActiveTab("wardrobe");
            }}
            className={`px-4 py-2 rounded-t-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === "wardrobe"
                ? "bg-neutral-900 text-cyan-400 border-cyan-400"
                : "text-neutral-400 hover:text-white border-transparent"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Boutique Wardrobe Outfits</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: GIFTS */}
          {activeTab === "gifts" && (
            <div className="space-y-6 animate-in fade-in">
              {/* Recipient Selector */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="font-mono text-xs font-bold text-neutral-300 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  <span>Choose Friend Recipient:</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {remoteAvatars.length === 0 ? (
                    <div className="text-xs font-mono text-neutral-500 py-1">
                      No other friends in room currently — gifts will be delivered to invite link friends!
                    </div>
                  ) : (
                    remoteAvatars.map((rem) => (
                      <button
                        key={rem.uid}
                        onClick={() => setSelectedRecipient(rem.handle)}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          selectedRecipient === rem.handle
                            ? "bg-pink-500 text-white border-pink-400"
                            : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white"
                        }`}
                      >
                        <span>👤</span>
                        <span>{rem.handle}</span>
                      </button>
                    ))
                  )}
                </div>

                <input
                  type="text"
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Attach a sweet note (e.g. 'You're awesome!' or 'Happy Birthday!')..."
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-xs text-white placeholder-neutral-500 outline-none focus:border-pink-500 transition-all"
                />
              </div>

              {/* Gifts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GIFTS_CATALOG.map((gift) => {
                  const canAfford = wallet.balance >= gift.price;
                  const isSent = justSentGift === gift.id;
                  return (
                    <div
                      key={gift.id}
                      className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-pink-500/50 flex flex-col justify-between transition-all group shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-3xl p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner">
                              {gift.icon}
                            </span>
                            <div>
                              <h3 className="font-mono text-xs font-bold text-white group-hover:text-pink-300">
                                {gift.name}
                              </h3>
                              <span className="font-mono text-[10px] text-pink-400">
                                Gift for {selectedRecipient}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400">
                            ${gift.price}
                          </span>
                        </div>

                        <p className="font-mono text-xs text-neutral-400 leading-relaxed">
                          {gift.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSendGift(gift)}
                        disabled={!canAfford || isSent}
                        className={`mt-4 w-full py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSent
                            ? "bg-emerald-500 text-black font-black"
                            : canAfford
                            ? "bg-pink-500 hover:bg-pink-400 text-white font-black shadow-pink-500/20"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Gift Sent!</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{canAfford ? `Send to ${selectedRecipient} ($${gift.price})` : "Not Enough Cash"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: WARDROBE BOUTIQUE */}
          {activeTab === "wardrobe" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BOUTIQUE_OUTFITS.map((outfit) => {
                  const canAfford = wallet.balance >= outfit.price;
                  const isEquipped = justEquippedId === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-cyan-500/50 flex flex-col justify-between transition-all group shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-3xl p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner">
                              {outfit.icon}
                            </span>
                            <div>
                              <h3 className="font-mono text-xs font-bold text-white group-hover:text-cyan-300">
                                {outfit.name}
                              </h3>
                              <span className="font-mono text-[10px] text-cyan-400 uppercase">
                                {outfit.outfitType} fit
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400">
                            ${outfit.price}
                          </span>
                        </div>

                        <p className="font-mono text-xs text-neutral-400 leading-relaxed">
                          {outfit.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleBuyOutfit(outfit)}
                        disabled={!canAfford || isEquipped}
                        className={`mt-4 w-full py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                          isEquipped
                            ? "bg-emerald-500 text-black font-black"
                            : canAfford
                            ? "bg-cyan-500 hover:bg-cyan-400 text-black font-black shadow-cyan-500/20"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Equipped on Avatar!</span>
                          </>
                        ) : (
                          <>
                            <Shirt className="w-3.5 h-3.5" />
                            <span>{canAfford ? `Buy & Equip ($${outfit.price})` : "Not Enough Cash"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
