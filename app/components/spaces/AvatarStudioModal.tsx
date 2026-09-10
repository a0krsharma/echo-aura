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
  Shield,
  Ghost,
  Eye,
  Headphones,
  Glasses,
  Shirt,
  Scissors,
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
  pet: "drone",
  isGhost: false,
};

export default function AvatarStudioModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: AvatarStudioModalProps) {
  const [config, setConfig] = useState<AvatarConfig>(currentConfig || DEFAULT_AVATAR_CONFIG);
  const [activeTab, setActiveTab] = useState<"appearance" | "outfit" | "accessories" | "pet">("appearance");
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
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
      const cY = canvas.height * 0.58;

      ctx.save();
      ctx.translate(cX, cY);

      // Ghost mode transparency
      if (config.isGhost) {
        ctx.globalAlpha = 0.55;
        // Cyan ghost glow aura
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 18;
      }

      // 1. Ground Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 18, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Trailing Pet
      if (config.pet !== "none") {
        const petX = 38;
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

      // 3. Legs & Shoes
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-14, 2, 11, 16);
      ctx.fillRect(3, 2, 11, 16);
      // Shoes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-16, 14, 13, 6);
      ctx.fillRect(3, 14, 13, 6);

      // 4. Torso / Outfit
      ctx.fillStyle = config.outfitColor || "#38bdf8";
      ctx.beginPath();
      ctx.roundRect(-22, -32, 44, 36, 8);
      ctx.fill();

      // Outfit-specific details
      if (config.outfit === "suit") {
        // White shirt collar + red tie
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-8, -32);
        ctx.lineTo(8, -32);
        ctx.lineTo(0, -18);
        ctx.fill();

        ctx.fillStyle = "#dc2626"; // Tie
        ctx.fillRect(-3, -24, 6, 16);
      } else if (config.outfit === "hoodie") {
        // White zipper
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-2, -32, 4, 32);
      } else if (config.outfit === "robe") {
        // Golden sash
        ctx.fillStyle = "#facc15";
        ctx.fillRect(-22, -8, 44, 5);
      }

      // 5. Head & Neck
      ctx.fillStyle = config.skinTone || "#fed7aa";
      ctx.beginPath();
      ctx.arc(0, -48, 18, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-6, -48, 4, 4);
      ctx.fillRect(3, -48, 4, 4);

      // 6. Hair Styles
      ctx.fillStyle = config.hairColor || "#1e293b";
      if (config.hairStyle === "short") {
        ctx.beginPath();
        ctx.arc(0, -53, 19, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-19, -54, 38, 8);
      } else if (config.hairStyle === "spiky") {
        ctx.beginPath();
        ctx.moveTo(-18, -48);
        ctx.lineTo(-12, -70);
        ctx.lineTo(-4, -58);
        ctx.lineTo(4, -72);
        ctx.lineTo(12, -58);
        ctx.lineTo(18, -48);
        ctx.fill();
      } else if (config.hairStyle === "waves") {
        ctx.beginPath();
        ctx.arc(0, -52, 20, Math.PI, Math.PI * 2);
        ctx.fill();
        // Long waves on sides
        ctx.fillRect(-21, -52, 8, 28);
        ctx.fillRect(13, -52, 8, 28);
      } else if (config.hairStyle === "ponytail") {
        ctx.beginPath();
        ctx.arc(0, -52, 19, Math.PI, Math.PI * 2);
        ctx.fill();
        // High ponytail plume
        ctx.fillRect(8, -72, 10, 24);
      } else if (config.hairStyle === "afro") {
        ctx.beginPath();
        ctx.arc(0, -56, 26, 0, Math.PI * 2);
        ctx.fill();
      } else if (config.hairStyle === "beanie") {
        // Knit Beanie cap
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(0, -54, 20, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-20, -56, 40, 8);
      } else if (config.hairStyle === "cap") {
        // Snapback cap with visor
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(0, -52, 19, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(4, -54, 16, 5); // Visor
      }

      // 7. Accessories
      if (config.accessory === "glasses") {
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-9, -51, 8, 7);
        ctx.strokeRect(2, -51, 8, 7);
        ctx.beginPath();
        ctx.moveTo(-1, -48);
        ctx.lineTo(2, -48);
        ctx.stroke();
      } else if (config.accessory === "shades") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-10, -52, 10, 8);
        ctx.fillRect(1, -52, 10, 8);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-10, -52, 10, 8);
        ctx.strokeRect(1, -52, 10, 8);
      } else if (config.accessory === "headphones") {
        // Headphone headband
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -52, 21, Math.PI, Math.PI * 2);
        ctx.stroke();
        // Ear cups
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-22, -54, 6, 14);
        ctx.fillRect(16, -54, 6, 14);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [config]);

  if (!isOpen) return null;

  const skinTones = [
    { name: "Fair", hex: "#fef08a" },
    { name: "Warm Peach", hex: "#fed7aa" },
    { name: "Golden Tan", hex: "#fdba74" },
    { name: "Rich Bronze", hex: "#d97706" },
    { name: "Espresso", hex: "#78350f" },
  ];

  const hairStyles: { id: AvatarConfig["hairStyle"]; name: string }[] = [
    { id: "short", name: "Short Crop" },
    { id: "spiky", name: "Spiky Fade" },
    { id: "waves", name: "Long Waves" },
    { id: "ponytail", name: "High Ponytail" },
    { id: "afro", name: "Afro Puff" },
    { id: "beanie", name: "Red Beanie" },
    { id: "cap", name: "Snapback Cap" },
    { id: "bald", name: "Sleek Bald" },
  ];

  const hairColors = [
    { name: "Jet Black", hex: "#0f172a" },
    { name: "Chestnut", hex: "#78350f" },
    { name: "Blonde", hex: "#fde047" },
    { name: "Platinum", hex: "#e2e8f0" },
    { name: "Cyber Cyan", hex: "#38bdf8" },
    { name: "Crimson", hex: "#ef4444" },
  ];

  const outfits: { id: AvatarConfig["outfit"]; name: string }[] = [
    { id: "hoodie", name: "Classic Hoodie" },
    { id: "suit", name: "Business Suit & Tie" },
    { id: "bomber", name: "Bomber Jacket" },
    { id: "tshirt", name: "Casual T-Shirt" },
    { id: "robe", name: "Scholar Robe" },
  ];

  const outfitColors = [
    "#38bdf8", // Cyan
    "#a855f7", // Purple
    "#f43f5e", // Rose
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#0f172a", // Obsidian
    "#ffffff", // Clean White
    "#475569", // Slate Gray
  ];

  const accessories: { id: AvatarConfig["accessory"]; name: string; icon: string }[] = [
    { id: "none", name: "None", icon: "🚫" },
    { id: "glasses", name: "Nerd Glasses", icon: "👓" },
    { id: "shades", name: "Dark Aviators", icon: "🕶️" },
    { id: "headphones", name: "Studio Headphones", icon: "🎧" },
  ];

  const pets: { id: AvatarConfig["pet"]; name: string; icon: string }[] = [
    { id: "none", name: "No Companion", icon: "🚫" },
    { id: "dog", name: "Golden Puppy", icon: "🐕" },
    { id: "cat", name: "Calico Kitten", icon: "🐈" },
    { id: "drone", name: "Hover-Drone", icon: "🛸" },
    { id: "duck", name: "Rubber Duckling", icon: "🦆" },
  ];

  const handleSave = () => {
    spacesSfx.playSitPop();
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 font-mono">
      <div className="w-full max-w-2xl bg-neutral-950 border-2 border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-black uppercase text-white tracking-widest">
              // AVATAR CREATOR STUDIO // GATHER IDENTITY
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 overflow-y-auto">
          {/* Left Preview Pane */}
          <div className="sm:col-span-5 bg-black/60 p-4 border-b sm:border-b-0 sm:border-r border-neutral-800 flex flex-col items-center justify-center">
            <canvas
              ref={previewCanvasRef}
              width={180}
              height={190}
              className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 shadow-inner"
            />

            {/* Ghost Mode Toggle */}
            <div className="w-full mt-4 p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/90 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Ghost className={`w-4 h-4 ${config.isGhost ? "text-cyan-400 animate-pulse" : "text-neutral-500"}`} />
                <span className="text-xs font-bold text-white">GHOST MODE (G)</span>
              </div>
              <button
                type="button"
                onClick={() => setConfig((p) => ({ ...p, isGhost: !p.isGhost }))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                  config.isGhost
                    ? "bg-cyan-500 text-black shadow-sm font-black"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {config.isGhost ? "ON" : "OFF"}
              </button>
            </div>
            <p className="text-[9px] text-neutral-500 mt-1 text-center">
              Pass freely through crowds and walls
            </p>
          </div>

          {/* Right Customization Controls */}
          <div className="sm:col-span-7 p-4 space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-neutral-800 pb-2">
              {[
                { id: "appearance", label: "HAIR & SKIN" },
                { id: "outfit", label: "OUTFIT" },
                { id: "accessories", label: "ITEMS" },
                { id: "pet", label: "PET" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-white text-black font-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Hair & Skin */}
            {activeTab === "appearance" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                    SKIN COMPLEXION
                  </label>
                  <div className="flex items-center gap-2">
                    {skinTones.map((s) => (
                      <button
                        key={s.hex}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, skinTone: s.hex }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                          config.skinTone === s.hex ? "border-white scale-110 shadow-md" : "border-transparent"
                        }`}
                        style={{ backgroundColor: s.hex }}
                        title={s.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                    HAIR STYLE
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {hairStyles.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, hairStyle: h.id }))}
                        className={`p-2 rounded-xl border text-xs text-left transition-all cursor-pointer font-bold ${
                          config.hairStyle === h.id
                            ? "border-cyan-400 bg-cyan-500/20 text-white"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                    HAIR COLOR
                  </label>
                  <div className="flex items-center gap-2">
                    {hairColors.map((hc) => (
                      <button
                        key={hc.hex}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, hairColor: hc.hex }))}
                        className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                          config.hairColor === hc.hex ? "border-white scale-110 shadow-md" : "border-transparent"
                        }`}
                        style={{ backgroundColor: hc.hex }}
                        title={hc.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Outfit */}
            {activeTab === "outfit" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                    APPAREL TYPE
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {outfits.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, outfit: o.id }))}
                        className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer font-bold ${
                          config.outfit === o.id
                            ? "border-cyan-400 bg-cyan-500/20 text-white"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {o.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                    OUTFIT COLOR PALETTE
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {outfitColors.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, outfitColor: col }))}
                        className={`w-8 h-8 rounded-xl border-2 transition-all cursor-pointer ${
                          config.outfitColor === col ? "border-white scale-110 shadow-md" : "border-neutral-800"
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Accessories */}
            {activeTab === "accessories" && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                  FACIAL & HEAD ACCESSORIES
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {accessories.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setConfig((p) => ({ ...p, accessory: acc.id }))}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-all cursor-pointer font-bold ${
                        config.accessory === acc.id
                          ? "border-cyan-400 bg-cyan-500/20 text-white"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-base">{acc.icon}</span>
                      <span>{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Companion Pet */}
            {activeTab === "pet" && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1.5">
                  CHOOSE A COMPANION PET (FOLLOWS AVATAR)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pets.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setConfig((p) => ({ ...p, pet: pt.id }))}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-all cursor-pointer font-bold ${
                        config.pet === pt.id
                          ? "border-cyan-400 bg-cyan-500/20 text-white"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xl">{pt.icon}</span>
                      <span>{pt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-neutral-900 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-white text-black font-black text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>SAVE AVATAR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
