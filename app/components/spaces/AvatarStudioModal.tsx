"use client";

import React, { useState, useEffect, useRef } from "react";
import { AvatarConfig } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  Sparkles,
  Palette,
  Check,
  X,
  Smile,
  Ghost,
  Eye,
  Headphones,
  Glasses,
  Shirt,
  Scissors,
  Crown,
  Flame,
  Zap,
} from "lucide-react";

interface AvatarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "#fed7aa",
  hairStyle: "short",
  hairColor: "#1e293b",
  outfit: "hoodie",
  outfitColor: "#38bdf8",
  accessory: "none",
  headwear: "none",
  aura: "none",
  expression: "smile",
  pet: "drone",
  isGhost: false,
};

const SKIN_TONES = ["#fef08a", "#fed7aa", "#fbcfe8", "#d4a373", "#a16207", "#451a03"];

const HAIR_STYLES = [
  { id: "short", label: "Short", icon: "✂️" },
  { id: "spiky", label: "Spiky", icon: "⚡" },
  { id: "waves", label: "Waves", icon: "🌊" },
  { id: "ponytail", label: "Ponytail", icon: "🎀" },
  { id: "afro", label: "Afro", icon: "☁️" },
  { id: "beanie", label: "Beanie", icon: "🧶" },
  { id: "cap", label: "Cap", icon: "🧢" },
  { id: "bald", label: "Bald", icon: "✨" },
];

const HAIR_COLORS = ["#1e293b", "#78350f", "#facc15", "#f43f5e", "#0284c7", "#10b981", "#e2e8f0"];

const OUTFITS = [
  { id: "hoodie", label: "Hoodie", icon: "🧥" },
  { id: "suit", label: "Suit", icon: "👔" },
  { id: "bomber", label: "Bomber", icon: "🦺" },
  { id: "tshirt", label: "Tee", icon: "👕" },
  { id: "robe", label: "Robe", icon: "🥋" },
];

const OUTFIT_COLORS = [
  "#38bdf8", // Cyan
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#fbbf24", // Amber
  "#a855f7", // Purple
  "#0f172a", // Obsidian
  "#ffffff", // White
  "#ea580c", // Orange
];

const ACCESSORIES = [
  { id: "none", label: "None", icon: "🚫" },
  { id: "glasses", label: "Glasses", icon: "👓" },
  { id: "shades", label: "Shades", icon: "🕶️" },
  { id: "headphones", label: "Studio", icon: "🎧" },
];

const HEADWEAR = [
  { id: "none", label: "None", icon: "🚫" },
  { id: "crown", label: "Crown", icon: "👑" },
  { id: "beret", label: "Beret", icon: "🎨" },
  { id: "cowboy", label: "Cowboy", icon: "🤠" },
  { id: "wizard", label: "Wizard", icon: "🧙" },
  { id: "cyber_visor", label: "Visor", icon: "🥽" },
];

const AURAS = [
  { id: "none", label: "None", icon: "🚫" },
  { id: "stardust", label: "Stardust", icon: "✨" },
  { id: "flame", label: "Flame", icon: "🔥" },
  { id: "electric", label: "Electric", icon: "⚡" },
  { id: "sakura", label: "Sakura", icon: "🌸" },
];

const PETS = [
  { id: "none", label: "None", icon: "🚫" },
  { id: "dog", label: "Puppy", icon: "🐕" },
  { id: "cat", label: "Kitten", icon: "🐈" },
  { id: "drone", label: "Drone", icon: "🛸" },
  { id: "duck", label: "Duckling", icon: "🦆" },
];

export default function AvatarStudioModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: AvatarStudioModalProps) {
  const [config, setConfig] = useState<AvatarConfig>(currentConfig || DEFAULT_AVATAR_CONFIG);
  const [activeCategory, setActiveCategory] = useState<
    "hair" | "outfit" | "headwear" | "accessories" | "pet" | "aura"
  >("hair");
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (currentConfig) {
      setConfig({ ...DEFAULT_AVATAR_CONFIG, ...currentConfig });
    }
  }, [currentConfig]);

  // Live Canvas Preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cX = canvas.width / 2;
      const cY = canvas.height * 0.56;

      ctx.save();
      ctx.translate(cX, cY);

      // Ghost mode transparency
      if (config.isGhost) {
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 18;
      }

      // 1. Aura Particle Effects
      if (config.aura && config.aura !== "none") {
        const aTime = performance.now() * 0.003;
        for (let i = 0; i < 8; i++) {
          const angle = aTime + (i * Math.PI * 2) / 8;
          const aDist = 28 + Math.sin(aTime * 2 + i) * 6;
          const aX = Math.cos(angle) * aDist;
          const aY = Math.sin(angle) * (aDist * 0.6) - 10;

          ctx.save();
          if (config.aura === "stardust") {
            ctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#38bdf8";
            ctx.beginPath();
            ctx.arc(aX, aY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (config.aura === "flame") {
            ctx.fillStyle = i % 2 === 0 ? "#f97316" : "#ef4444";
            ctx.beginPath();
            ctx.arc(aX, aY, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (config.aura === "electric") {
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(aX - 2, aY - 2, 4, 4);
          } else if (config.aura === "sakura") {
            ctx.fillStyle = "#fb7185";
            ctx.beginPath();
            ctx.ellipse(aX, aY, 4, 2.5, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // 2. Ground Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 18, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Trailing Pet
      if (config.pet !== "none") {
        const petX = 40;
        const petY = 8 + Math.sin(performance.now() * 0.008) * 3;
        ctx.save();
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        const petIcon =
          config.pet === "dog"
            ? "🐕"
            : config.pet === "cat"
            ? "🐈"
            : config.pet === "drone"
            ? "🛸"
            : "🦆";
        ctx.fillText(petIcon, petX, petY);
        ctx.restore();
      }

      // 4. Legs & Shoes
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-14, 2, 11, 16);
      ctx.fillRect(3, 2, 11, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-16, 14, 13, 6);
      ctx.fillRect(3, 14, 13, 6);

      // 5. Torso / Outfit
      ctx.fillStyle = config.outfitColor || "#38bdf8";
      ctx.beginPath();
      ctx.roundRect(-22, -32, 44, 36, 8);
      ctx.fill();

      // Outfit accents
      if (config.outfit === "suit") {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-8, -32);
        ctx.lineTo(8, -32);
        ctx.lineTo(0, -18);
        ctx.fill();
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(-3, -24, 6, 16);
      } else if (config.outfit === "hoodie") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-2, -32, 4, 32);
      } else if (config.outfit === "bomber") {
        ctx.fillStyle = "#d97706";
        ctx.fillRect(-2, -32, 4, 32);
      } else if (config.outfit === "robe") {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(-22, -8, 44, 5);
      }

      // 6. Hair Back
      if (config.hairStyle !== "bald") {
        ctx.fillStyle = config.hairColor || "#1e293b";
        ctx.beginPath();
        ctx.arc(0, -44, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Face
      ctx.fillStyle = config.skinTone || "#fed7aa";
      ctx.beginPath();
      ctx.arc(0, -40, 16, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const blink = Math.sin(performance.now() * 0.002) > 0.98;
      ctx.fillStyle = "#0f172a";
      if (!blink) {
        ctx.fillRect(-6, -42, 3.5, 4);
        ctx.fillRect(3, -42, 3.5, 4);
      } else {
        ctx.fillRect(-6, -40, 4, 2);
        ctx.fillRect(3, -40, 4, 2);
      }

      // Smile mouth
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -34, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // 8. Hair Style Front
      ctx.fillStyle = config.hairColor || "#1e293b";
      if (config.hairStyle === "spiky") {
        ctx.beginPath();
        ctx.moveTo(-16, -48);
        ctx.lineTo(-8, -62);
        ctx.lineTo(0, -48);
        ctx.lineTo(8, -62);
        ctx.lineTo(16, -48);
        ctx.fill();
      } else if (config.hairStyle === "waves") {
        ctx.beginPath();
        ctx.arc(-8, -48, 8, 0, Math.PI * 2);
        ctx.arc(8, -48, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.hairStyle === "afro") {
        ctx.beginPath();
        ctx.arc(0, -46, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = config.skinTone;
        ctx.beginPath();
        ctx.arc(0, -40, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-6, -42, 3.5, 4);
        ctx.fillRect(3, -42, 3.5, 4);
      } else if (config.hairStyle === "beanie") {
        ctx.fillStyle = "#e11d48";
        ctx.beginPath();
        ctx.roundRect(-18, -60, 36, 22, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -64, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.hairStyle === "cap") {
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(0, -46, 17, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-18, -46, 36, 6);
      }

      // 9. Headwear
      if (config.headwear && config.headwear !== "none") {
        ctx.save();
        if (config.headwear === "crown") {
          ctx.fillStyle = "#eab308";
          ctx.beginPath();
          ctx.moveTo(-14, -58);
          ctx.lineTo(-14, -68);
          ctx.lineTo(-7, -62);
          ctx.lineTo(0, -72);
          ctx.lineTo(7, -62);
          ctx.lineTo(14, -68);
          ctx.lineTo(14, -58);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.arc(0, -64, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (config.headwear === "beret") {
          ctx.fillStyle = "#1e1b4b";
          ctx.beginPath();
          ctx.ellipse(2, -58, 20, 8, -Math.PI / 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (config.headwear === "cowboy") {
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.ellipse(0, -56, 26, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(-12, -68, 24, 14, 4);
          ctx.fill();
        } else if (config.headwear === "wizard") {
          ctx.fillStyle = "#4c1d95";
          ctx.beginPath();
          ctx.moveTo(-16, -56);
          ctx.lineTo(0, -82);
          ctx.lineTo(16, -56);
          ctx.closePath();
          ctx.fill();
        } else if (config.headwear === "cyber_visor") {
          ctx.fillStyle = "#06b6d4";
          ctx.fillRect(-14, -44, 28, 7);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1;
          ctx.strokeRect(-14, -44, 28, 7);
        }
        ctx.restore();
      }

      // 10. Accessories
      if (config.accessory === "glasses") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(-9, -44, 7, 6);
        ctx.strokeRect(2, -44, 7, 6);
        ctx.beginPath();
        ctx.moveTo(-2, -41);
        ctx.lineTo(2, -41);
        ctx.stroke();
      } else if (config.accessory === "shades") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(-11, -44, 22, 7);
      } else if (config.accessory === "headphones") {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -44, 19, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(-21, -48, 6, 14);
        ctx.fillRect(15, -48, 6, 14);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [config]);

  if (!isOpen) return null;

  const handleSave = () => {
    spacesSfx.playZoneChime();
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Palette className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white font-mono tracking-wider">
              AVATAR STUDIO
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Canvas Bar */}
        <div className="relative h-44 bg-gradient-to-b from-neutral-900/70 to-neutral-950 flex items-center justify-center border-b border-neutral-800 overflow-hidden">
          <canvas ref={previewCanvasRef} width={280} height={176} className="touch-none" />

          {/* Quick Ghost Mode Toggle in Preview */}
          <button
            onClick={() => {
              setConfig((prev) => ({ ...prev, isGhost: !prev.isGhost }));
              spacesSfx.playKeyNote(4);
            }}
            className={`absolute bottom-3 right-4 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              config.isGhost
                ? "border-indigo-400 bg-indigo-950/80 text-indigo-300 shadow-md"
                : "border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white"
            }`}
          >
            <Ghost className="w-3.5 h-3.5" />
            <span>{config.isGhost ? "GHOST ON" : "GHOST MODE"}</span>
          </button>
        </div>

        {/* Icon-Driven Category Navigation Tabs */}
        <div className="flex items-center justify-around px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/40 text-xs font-mono">
          {[
            { id: "hair", icon: "💇", label: "Hair" },
            { id: "outfit", icon: "👕", label: "Outfit" },
            { id: "headwear", icon: "👑", label: "Hats" },
            { id: "accessories", icon: "👓", label: "Eyewear" },
            { id: "pet", icon: "🐾", label: "Pets" },
            { id: "aura", icon: "✨", label: "Auras" },
          ].map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  spacesSfx.playKeyNote(1);
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500 text-black font-bold shadow-md"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span className="hidden sm:inline text-[11px]">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB: HAIR & SKIN */}
          {activeCategory === "hair" && (
            <div className="space-y-4">
              {/* Skin Tones Swatches */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Skin Tone
                </span>
                <div className="flex items-center gap-2">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setConfig({ ...config, skinTone: tone })}
                      className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${
                        config.skinTone === tone
                          ? "ring-2 ring-cyan-400 scale-110 shadow-lg"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: tone }}
                    />
                  ))}
                </div>
              </div>

              {/* Hairstyle Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Hairstyle
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {HAIR_STYLES.map((h) => {
                    const isSelected = config.hairStyle === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          setConfig({ ...config, hairStyle: h.id as any });
                          spacesSfx.playKeyNote(2);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                            : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span className="text-lg">{h.icon}</span>
                        <span className="text-[10px] font-mono">{h.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hair Colors Swatches */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Hair Color
                </span>
                <div className="flex items-center gap-2">
                  {HAIR_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => setConfig({ ...config, hairColor: col })}
                      className={`w-8 h-8 rounded-xl transition-all cursor-pointer ${
                        config.hairColor === col
                          ? "ring-2 ring-cyan-400 scale-110 shadow-lg"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: OUTFIT */}
          {activeCategory === "outfit" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Apparel Cut
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {OUTFITS.map((o) => {
                    const isSelected = config.outfit === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          setConfig({ ...config, outfit: o.id as any });
                          spacesSfx.playKeyNote(3);
                        }}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                            : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span className="text-xl">{o.icon}</span>
                        <span className="text-[10px] font-mono">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outfit Color Swatches */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Colorway
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {OUTFIT_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => setConfig({ ...config, outfitColor: col })}
                      className={`h-9 rounded-xl transition-all cursor-pointer border border-neutral-700 ${
                        config.outfitColor === col
                          ? "ring-2 ring-cyan-400 scale-110 shadow-lg"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: HEADWEAR */}
          {activeCategory === "headwear" && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Select Headwear
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {HEADWEAR.map((hw) => {
                  const isSelected = (config.headwear || "none") === hw.id;
                  return (
                    <button
                      key={hw.id}
                      onClick={() => {
                        setConfig({ ...config, headwear: hw.id as any });
                        spacesSfx.playKeyNote(2);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl">{hw.icon}</span>
                      <span className="text-xs font-mono">{hw.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: ACCESSORIES */}
          {activeCategory === "accessories" && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Select Eyewear / Audio
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ACCESSORIES.map((acc) => {
                  const isSelected = config.accessory === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setConfig({ ...config, accessory: acc.id as any });
                        spacesSfx.playKeyNote(2);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl">{acc.icon}</span>
                      <span className="text-xs font-mono">{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: PETS */}
          {activeCategory === "pet" && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Choose Companion Pet
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {PETS.map((p) => {
                  const isSelected = config.pet === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setConfig({ ...config, pet: p.id as any });
                        spacesSfx.playKeyNote(3);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <span className="text-xs font-mono">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: AURAS */}
          {activeCategory === "aura" && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Ambient Particle Aura
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {AURAS.map((au) => {
                  const isSelected = (config.aura || "none") === au.id;
                  return (
                    <button
                      key={au.id}
                      onClick={() => {
                        setConfig({ ...config, aura: au.id as any });
                        spacesSfx.playKeyNote(4);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-white font-bold"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl">{au.icon}</span>
                      <span className="text-xs font-mono">{au.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-4 h-4" />
            <span>EQUIP AVATAR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
