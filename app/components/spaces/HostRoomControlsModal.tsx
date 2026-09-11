"use client";

import React, { useState } from "react";
import {
  X,
  Crown,
  Sparkles,
  Armchair,
  Palette,
  UtensilsCrossed,
  Share2,
  Check,
  Plus,
  Trash2,
  MapPin,
  Bell,
  Volume2,
  Shield,
  Layers,
  Heart,
  Sliders,
} from "lucide-react";
import { SpaceDoc, SpatialAvatar, SPACE_VIBES, SpaceVibe } from "@/lib/spaces";
import { ChairReservation, TableDish } from "@/lib/spacesEconomy";
import { spacesSfx } from "@/lib/spacesSfx";

export type HostControlTab = "chairs" | "decorations" | "cake" | "vibe";

interface HostRoomControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: SpaceDoc;
  onUpdateSpace: (updates: Partial<SpaceDoc>) => Promise<void> | void;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  chairReservations: ChairReservation[];
  onUpdateChairReservations: (reservations: ChairReservation[]) => void;
  tableDishes: TableDish[];
  onPlaceCakeOnTable: (cakeDish: TableDish) => void;
  onTeleportToSeat: (x: number, y: number) => void;
  onBroadcastSpeech: (text: string) => void;
  onTriggerConfetti: () => void;
}

// Cake Catalog
const CAKE_STYLES = [
  {
    id: "belgian_truffle",
    name: "Triple Chocolate Belgian Truffle Tower",
    icon: "🎂",
    desc: "Rich dark ganache with gold flakes & sparkler candles",
    bites: 8,
    color: "#3e2723",
  },
  {
    id: "royal_red_velvet",
    name: "Royal Red Velvet 3-Tier Celebration Cake",
    icon: "🍰",
    desc: "Crimson cream cheese layers with edible rose petals",
    bites: 10,
    color: "#e11d48",
  },
  {
    id: "gold_sparkler",
    name: "24K Gold Dust & Confetti Sparkler Cake",
    icon: "✨",
    desc: "Vanilla chiffon encrusted with shimmer dust & sparklers",
    bites: 12,
    color: "#f59e0b",
  },
  {
    id: "strawberry_fantasy",
    name: "Fresh Strawberry & Chantilly Cream Fantasy",
    icon: "🍓",
    desc: "Light airy sponge crowned with glazed wild strawberries",
    bites: 8,
    color: "#fb7185",
  },
  {
    id: "custom_frosting",
    name: "Custom Inscription VIP Birthday Cake",
    icon: "👑",
    desc: "Personalized frosting text with celebration fireworks",
    bites: 12,
    color: "#8b5cf6",
  },
];

// Table Decorations Catalog
const TABLECLOTH_THEMES = [
  { id: "crimson_velvet", name: "Royal Crimson Velvet", color: "#881337", icon: "🍷" },
  { id: "midnight_neon", name: "Cyberpunk Neon Blue", color: "#0284c7", icon: "🪩" },
  { id: "gold_silk", name: "Golden Silk Gala", color: "#ca8a04", icon: "👑" },
  { id: "emerald_marble", name: "Imperial Emerald Marble", color: "#065f46", icon: "🌲" },
  { id: "pastel_blossom", name: "Cozy Sakura Blossom", color: "#db2777", icon: "🌸" },
];

const TABLE_CENTERPIECES = [
  { id: "candelabra", name: "5-Arm Golden Candelabra", icon: "🕯️", desc: "Warm flickering candlelight ambiance" },
  { id: "rose_bouquet", name: "Fresh Red Rose Centerpiece", icon: "🌹", desc: "Velvet roses in crystal vase" },
  { id: "champagne_ice", name: "Vintage Champagne on Ice", icon: "🍾", desc: "Chilled bubbles with flute glasses" },
  { id: "disco_projector", name: "Holographic Disco Orb", icon: "🔮", desc: "Shoots pulsing laser stars onto table" },
  { id: "fairy_lights", name: "Enchanted Fairy Light Garland", icon: "✨", desc: "Gentle warm string lights" },
];

export default function HostRoomControlsModal({
  isOpen,
  onClose,
  space,
  onUpdateSpace,
  localAvatar,
  remoteAvatars,
  chairReservations,
  onUpdateChairReservations,
  tableDishes,
  onPlaceCakeOnTable,
  onTeleportToSeat,
  onBroadcastSpeech,
  onTriggerConfetti,
}: HostRoomControlsModalProps) {
  const [activeTab, setActiveTab] = useState<HostControlTab>("chairs");

  // Chair Seating State
  const [selectedChairIdx, setSelectedChairIdx] = useState<number>(0);
  const [inviteHandleInput, setInviteHandleInput] = useState("");
  const [inviteSuccessToast, setInviteSuccessToast] = useState<string | null>(null);

  // Cake Customizer State
  const [selectedCakeStyle, setSelectedCakeStyle] = useState(CAKE_STYLES[0]);
  const [customInscription, setCustomInscription] = useState(`Happy Birthday ${localAvatar.handle}! 🎉`);
  const [candleCount, setCandleCount] = useState(18);

  // Table Decorator State
  const [activeTablecloth, setActiveTablecloth] = useState(TABLECLOTH_THEMES[0]);
  const [activeCenterpiece, setActiveCenterpiece] = useState(TABLE_CENTERPIECES[0]);

  if (!isOpen) return null;

  // Total 16 chairs around banquet table
  const CHAIR_LABELS = [
    "Chair 0 (Host Head)",
    ...Array.from({ length: 7 }, (_, i) => `Chair ${i + 1} (Top Flank)`),
    ...Array.from({ length: 7 }, (_, i) => `Chair ${i + 8} (Bottom Flank)`),
    "Chair 15 (Foot of Table)",
  ];

  const getChairReservation = (idx: number): ChairReservation | undefined => {
    return chairReservations.find((r) => r.chairIndex === idx);
  };

  // Assign or invite guest to a chair
  const handleAssignChair = (idx: number, handle: string) => {
    spacesSfx.playKeyNote(5);
    const cleanHandle = handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`;
    const updated = chairReservations.filter((r) => r.chairIndex !== idx);

    let x = 1018;
    let y = 350;
    if (idx >= 1 && idx <= 7) {
      x = 1065 + (idx - 1) * 44;
      y = 298;
    } else if (idx >= 8 && idx <= 14) {
      x = 1065 + (idx - 8) * 44;
      y = 400;
    } else if (idx === 15) {
      x = 1380;
      y = 350;
    }

    const newRes: ChairReservation = {
      chairIndex: idx,
      x,
      y,
      seatLabel: CHAIR_LABELS[idx],
      reservedForHandle: cleanHandle,
    };
    updated.push(newRes);
    onUpdateChairReservations(updated);

    setInviteSuccessToast(`Assigned ${CHAIR_LABELS[idx]} to ${cleanHandle}!`);
    setTimeout(() => setInviteSuccessToast(null), 3000);

    onBroadcastSpeech(`🪑 @${localAvatar.handle} reserved ${CHAIR_LABELS[idx]} for ${cleanHandle}! Welcome to the banquet table! ✨`);
    setInviteHandleInput("");
  };

  const handleClearChair = (idx: number) => {
    spacesSfx.playSitPop();
    const updated = chairReservations.filter((r) => r.chairIndex !== idx);
    onUpdateChairReservations(updated);
  };

  // Handle Placing Custom Cake on Table
  const handlePlaceCake = () => {
    spacesSfx.playPartyFanfare();
    onTriggerConfetti();

    const cakeName =
      selectedCakeStyle.id === "custom_frosting"
        ? `"${customInscription}" Custom Cake`
        : selectedCakeStyle.name;

    const newDish: TableDish = {
      id: `cake_${Date.now()}`,
      itemId: selectedCakeStyle.id,
      name: cakeName,
      icon: selectedCakeStyle.icon,
      x: 1200,
      y: 350,
      orderedBy: localAvatar.handle,
      orderedAt: Date.now(),
      bitesLeft: selectedCakeStyle.bites,
    };

    onPlaceCakeOnTable(newDish);
    onBroadcastSpeech(`🎂 The Grand ${cakeName} is served on the Banquet Table with ${candleCount} glowing sparklers! Gather round for cake cutting! ✨`);
    setInviteSuccessToast(`🎂 ${cakeName} placed on table!`);
    setTimeout(() => setInviteSuccessToast(null), 3000);
  };

  // Handle Changing Table Decor
  const handleApplyTableDecor = () => {
    spacesSfx.playKeyNote(4);
    onTriggerConfetti();
    onBroadcastSpeech(`✨ Table styled with ${activeTablecloth.name} and ${activeCenterpiece.name} centerpiece!`);
    setInviteSuccessToast("Table decor updated!");
    setTimeout(() => setInviteSuccessToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-950/60 via-neutral-900 to-amber-950/60 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm font-black uppercase text-white tracking-wider">
                  Host Space Command Suite
                </h2>
                <span className="text-[10px] bg-purple-600 text-white font-mono font-bold px-2 py-0.5 rounded-full">
                  VIP HOST
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-400">
                Full control over table seating, cake designer & room decor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-neutral-800 bg-neutral-900/50 px-4 pt-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              spacesSfx.playKeyNote(1);
              setActiveTab("chairs");
            }}
            className={`px-3.5 py-2 font-mono text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "chairs"
                ? "bg-neutral-950 text-sky-400 border-t-2 border-sky-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Armchair className="w-4 h-4" />
            <span>Chair Seating ({chairReservations.length}/16)</span>
          </button>

          <button
            onClick={() => {
              spacesSfx.playKeyNote(2);
              setActiveTab("cake");
            }}
            className={`px-3.5 py-2 font-mono text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "cake"
                ? "bg-neutral-950 text-pink-400 border-t-2 border-pink-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Cake Designer 🎂</span>
          </button>

          <button
            onClick={() => {
              spacesSfx.playKeyNote(3);
              setActiveTab("decorations");
            }}
            className={`px-3.5 py-2 font-mono text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "decorations"
                ? "bg-neutral-950 text-amber-400 border-t-2 border-amber-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Table Design & Decor</span>
          </button>
        </div>

        {/* Success Toast */}
        {inviteSuccessToast && (
          <div className="mx-4 mt-3 py-2 px-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-xl font-mono text-xs font-bold flex items-center justify-between animate-in slide-in-from-top">
            <span>✨ {inviteSuccessToast}</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: CHAIR SEATING & DIRECT INVITES */}
          {activeTab === "chairs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white">
                    16-Seat Banquet Seating Map
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-400">
                    Click any chair to assign guests, send invitations, or reserve seats
                  </p>
                </div>

                <button
                  onClick={() => {
                    spacesSfx.playKeyNote(5);
                    const allGuests = [localAvatar, ...remoteAvatars];
                    const autoAssigned: ChairReservation[] = [];
                    allGuests.slice(0, 16).forEach((g, idx) => {
                      let x = 1018;
                      let y = 350;
                      if (idx >= 1 && idx <= 7) {
                        x = 1065 + (idx - 1) * 44;
                        y = 298;
                      } else if (idx >= 8 && idx <= 14) {
                        x = 1065 + (idx - 8) * 44;
                        y = 400;
                      } else if (idx === 15) {
                        x = 1380;
                        y = 350;
                      }
                      autoAssigned.push({
                        chairIndex: idx,
                        x,
                        y,
                        seatLabel: CHAIR_LABELS[idx],
                        reservedForHandle: g.handle,
                        reservedForUid: g.uid,
                      });
                    });
                    onUpdateChairReservations(autoAssigned);
                    onBroadcastSpeech("🪑 Auto-seated all present guests around the banquet feast table!");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-sky-200 font-mono text-xs font-bold transition cursor-pointer"
                >
                  ⚡ Auto-Seat Present Guests
                </button>
              </div>

              {/* Visual Table Grid */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase text-center">
                  Top Flank (Chairs 1 to 7)
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const idx = i + 1;
                    const res = getChairReservation(idx);
                    const isSelected = selectedChairIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedChairIdx(idx)}
                        className={`p-2 rounded-xl text-center border font-mono text-xs transition cursor-pointer ${
                          isSelected
                            ? "border-sky-400 bg-sky-950/60 text-sky-300 ring-2 ring-sky-500/30"
                            : res
                            ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300"
                            : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="text-base">🪑</div>
                        <div className="text-[10px] font-bold">#{idx}</div>
                        <div className="text-[9px] truncate max-w-[50px] mx-auto">
                          {res ? res.reservedForHandle : "Open"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Banquet Table Center Slab */}
                <div className="py-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-neutral-800/80 to-amber-950/40 border border-amber-500/30 text-center font-mono text-xs text-amber-200 font-bold flex items-center justify-between px-4">
                  <button
                    onClick={() => setSelectedChairIdx(0)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition cursor-pointer ${
                      selectedChairIdx === 0
                        ? "border-purple-400 bg-purple-950/70 text-purple-300"
                        : "border-neutral-700 bg-neutral-900 text-neutral-300"
                    }`}
                  >
                    👑 Head #0
                  </button>
                  <span className="tracking-widest uppercase text-neutral-300">
                    🍽️ Banquet Feast Table
                  </span>
                  <button
                    onClick={() => setSelectedChairIdx(15)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition cursor-pointer ${
                      selectedChairIdx === 15
                        ? "border-purple-400 bg-purple-950/70 text-purple-300"
                        : "border-neutral-700 bg-neutral-900 text-neutral-300"
                    }`}
                  >
                    Foot #15
                  </button>
                </div>

                <div className="text-[10px] font-mono font-bold text-neutral-500 uppercase text-center">
                  Bottom Flank (Chairs 8 to 14)
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const idx = i + 8;
                    const res = getChairReservation(idx);
                    const isSelected = selectedChairIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedChairIdx(idx)}
                        className={`p-2 rounded-xl text-center border font-mono text-xs transition cursor-pointer ${
                          isSelected
                            ? "border-sky-400 bg-sky-950/60 text-sky-300 ring-2 ring-sky-500/30"
                            : res
                            ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300"
                            : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="text-base">🪑</div>
                        <div className="text-[10px] font-bold">#{idx}</div>
                        <div className="text-[9px] truncate max-w-[50px] mx-auto">
                          {res ? res.reservedForHandle : "Open"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Chair Action Pill */}
              <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🪑</span>
                    <div>
                      <div className="font-mono text-xs font-bold text-white">
                        Selected: {CHAIR_LABELS[selectedChairIdx]}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400">
                        Current occupant:{" "}
                        <span className="text-sky-300 font-bold">
                          {getChairReservation(selectedChairIdx)?.reservedForHandle || "Nobody (Available)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {getChairReservation(selectedChairIdx) && (
                    <button
                      onClick={() => handleClearChair(selectedChairIdx)}
                      className="p-2 rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 border border-rose-800/40 transition cursor-pointer"
                      title="Clear reservation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter guest handle (e.g. @abhishek or Priya)"
                    value={inviteHandleInput}
                    onChange={(e) => setInviteHandleInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => {
                      if (inviteHandleInput.trim()) {
                        handleAssignChair(selectedChairIdx, inviteHandleInput);
                      }
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-black rounded-xl transition cursor-pointer shadow-md"
                  >
                    Assign Seat
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAKE DESIGNER & TABLE PLACEMENT */}
          {activeTab === "cake" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase text-white">
                  Celebration Cake Designer
                </h3>
                <p className="text-[11px] font-mono text-neutral-400">
                  Choose cake flavor, custom frosting inscription, and place on table
                </p>
              </div>

              {/* Cake Style Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CAKE_STYLES.map((c) => {
                  const isSelected = selectedCakeStyle.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        spacesSfx.playKeyNote(2);
                        setSelectedCakeStyle(c);
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                        isSelected
                          ? "border-pink-500 bg-pink-950/30 shadow-lg shadow-pink-500/10"
                          : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300"
                      }`}
                    >
                      <span className="text-3xl p-2 rounded-xl bg-black/40 border border-neutral-800">
                        {c.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {c.desc}
                        </div>
                        <div className="text-[9px] text-pink-400 font-mono mt-1 font-bold">
                          🍽️ {c.bites} Slices for Friends
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Frosting Inscription */}
              <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="font-mono text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Custom Frosting Message Written on Cake</span>
                </div>
                <input
                  type="text"
                  value={customInscription}
                  onChange={(e) => setCustomInscription(e.target.value)}
                  placeholder="e.g. Happy 25th Birthday Abhishek! 🎉"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-neutral-400">
                    Glowing Sparkler Candles: <strong className="text-amber-400">{candleCount}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 16, 18, 21, 25].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setCandleCount(cnt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                          candleCount === cnt
                            ? "bg-amber-400 text-black"
                            : "bg-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Big CTA to Place Cake on Table */}
              <button
                onClick={handlePlaceCake}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-mono text-xs font-black uppercase tracking-wider transition shadow-xl shadow-pink-600/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🎂</span>
                <span>Place This Cake on Banquet Table</span>
                <span>✨</span>
              </button>
            </div>
          )}

          {/* TAB 3: TABLE DESIGN & DECORATIONS */}
          {activeTab === "decorations" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase text-white">
                  Tablecloth Themes & Centerpieces
                </h3>
                <p className="text-[11px] font-mono text-neutral-400">
                  Change tablecloth textiles, candle candelabras, and party props
                </p>
              </div>

              {/* Tablecloth Fabric Options */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold text-neutral-400 uppercase">
                  Tablecloth Textile
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TABLECLOTH_THEMES.map((theme) => {
                    const isSelected = activeTablecloth.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          spacesSfx.playKeyNote(2);
                          setActiveTablecloth(theme);
                        }}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                          isSelected
                            ? "border-amber-400 bg-amber-950/40 text-white shadow-md"
                            : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300"
                        }`}
                      >
                        <span className="text-xl">{theme.icon}</span>
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold truncate">
                            {theme.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Centerpiece Options */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold text-neutral-400 uppercase">
                  Table Centerpiece
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TABLE_CENTERPIECES.map((cp) => {
                    const isSelected = activeCenterpiece.id === cp.id;
                    return (
                      <button
                        key={cp.id}
                        onClick={() => {
                          spacesSfx.playKeyNote(3);
                          setActiveCenterpiece(cp);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                          isSelected
                            ? "border-amber-400 bg-amber-950/40 text-white shadow-md"
                            : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300"
                        }`}
                      >
                        <span className="text-2xl p-1.5 rounded-xl bg-black/40 border border-neutral-800">
                          {cp.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold truncate">
                            {cp.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            {cp.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleApplyTableDecor}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-mono text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer"
              >
                ✨ Apply Table Decor Styling
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
