"use client";

/**
 * app/components/spaces/SpaceCateringModal.tsx
 * ─────────────────────────────────────────────────────
 * Virtual Restaurant & Food Catering Menu:
 * - Butter Naan & Dal Makhani Feast
 * - Italian Truffle Alfredo Pasta
 * - Chilli Paneer & Hakka Noodles
 * - Chills & Spicy Nachos
 * - Vintage French Champagne (with cork pop SFX)
 * - Belgian Chocolate Birthday Cake
 * - Cutting Masala Chai & Samosa Set
 * 
 * Order dishes for the banquet table using Virtual Paper Cash (💵 Echo Cash)
 */

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Utensils,
  Wine,
  Cake,
  Coffee,
  DollarSign,
  Plus,
  Check,
  Flame,
  Layers,
} from "lucide-react";
import {
  CATERING_MENU,
  CateringItem,
  TableDish,
  getWalletState,
  spendCash,
} from "@/lib/spacesEconomy";
import { spacesSfx } from "@/lib/spacesSfx";

interface SpaceCateringModalProps {
  isOpen: boolean;
  onClose: () => void;
  userHandle: string;
  activeDishes: TableDish[];
  onOrderDish: (dish: TableDish) => void;
  onEatBite: (dishId: string) => void;
  onBroadcastSpeech: (text: string) => void;
}

export default function SpaceCateringModal({
  isOpen,
  onClose,
  userHandle,
  activeDishes,
  onOrderDish,
  onEatBite,
  onBroadcastSpeech,
}: SpaceCateringModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [wallet, setWallet] = useState(getWalletState());
  const [justOrderedId, setJustOrderedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = CATERING_MENU.filter((item) => {
    if (selectedCategory === "ALL") return true;
    return item.category === selectedCategory;
  });

  const handleOrder = (item: CateringItem) => {
    if (wallet.balance < item.price) {
      spacesSfx.playKeyNote(1);
      alert(`Not enough paper money! You need $${item.price} Cash (Balance: $${wallet.balance})`);
      return;
    }

    const success = spendCash(item.price, `Ordered ${item.name}`);
    if (success) {
      setWallet(getWalletState());
      setJustOrderedId(item.id);
      spacesSfx.playCashRegister();

      if (item.category === "drink") {
        setTimeout(() => spacesSfx.playChampagneCork(), 250);
      }

      // Random position along banquet conference table (x: 1060 to 1340, y: 340)
      const dishX = 1070 + Math.floor(Math.random() * 240);
      const dishY = 338 + Math.floor(Math.random() * 16);

      const newDish: TableDish = {
        id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        itemId: item.id,
        name: item.name,
        icon: item.icon,
        x: dishX,
        y: dishY,
        orderedBy: userHandle,
        orderedAt: Date.now(),
        bitesLeft: item.servings,
      };

      onOrderDish(newDish);
      onBroadcastSpeech(`🍽️ ${userHandle} ordered ${item.name} for the banquet table! Enjoy everyone! 😋✨`);

      setTimeout(() => setJustOrderedId(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-900 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 text-lg">
              🍽️
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white font-mono flex items-center gap-2">
                <span>VIRTUAL CATERING & BANQUET FEAST</span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Order steaming butter naan, pasta, champagne & cake for the table with Paper Cash!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet Balance Display */}
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

        {/* Category Selector */}
        <div className="px-6 pt-3 border-b border-neutral-900 bg-neutral-950 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "Full Menu", icon: "🌐" },
            { id: "food", label: "Mains & Feasts", icon: "🫓" },
            { id: "snacks", label: "Chills & Snacks", icon: "🌶️" },
            { id: "drink", label: "Champagne & Drinks", icon: "🍾" },
            { id: "dessert", label: "Cakes & Sweet", icon: "🎂" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                spacesSfx.playKeyNote(2);
                setSelectedCategory(cat.id);
              }}
              className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-900"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const canAfford = wallet.balance >= item.price;
              const isSuccess = justOrderedId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-amber-500/50 flex flex-col justify-between transition-all group shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-inner">
                          {item.icon}
                        </span>
                        <div>
                          <h3 className="font-mono text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            {item.name}
                          </h3>
                          <span className="font-mono text-[10px] text-neutral-500 uppercase">
                            Serves {item.servings} friends
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400">
                        ${item.price}
                      </span>
                    </div>

                    <p className="font-mono text-xs text-neutral-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleOrder(item)}
                    disabled={!canAfford || isSuccess}
                    className={`mt-4 w-full py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSuccess
                        ? "bg-emerald-500 text-black font-black"
                        : canAfford
                        ? "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-amber-500/20"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {isSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Served to Table!</span>
                      </>
                    ) : (
                      <>
                        <Utensils className="w-3.5 h-3.5" />
                        <span>{canAfford ? `Order for Table ($${item.price})` : "Not Enough Cash"}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Dishes on Table */}
          {activeDishes.length > 0 && (
            <div className="pt-4 border-t border-neutral-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🍽️</span>
                  <span>Currently Served on Banquet Table</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  Click to eat a bite!
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activeDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{dish.icon}</span>
                      <div>
                        <div className="font-mono text-xs font-bold text-white truncate max-w-[110px]">
                          {dish.name}
                        </div>
                        <div className="font-mono text-[9px] text-neutral-500">
                          {dish.bitesLeft} bites left
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        spacesSfx.playNomEating();
                        onEatBite(dish.id);
                        onBroadcastSpeech(`😋 ${userHandle} took a delicious bite of ${dish.name}!`);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                    >
                      Bite
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
