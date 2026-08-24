"use client";

import React, { useState } from "react";
import ExpressiveAvatar from "./ExpressiveAvatar";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  type AvatarConfig,
  type AvatarGesture,
  type AvatarSkinTone,
  type AvatarHairStyle,
  type AvatarHairColor,
  type AvatarEyewear,
  type AvatarOutfitColor,
  DEFAULT_AVATAR_CONFIG,
  GESTURE_CATALOG,
  SKIN_PALETTES,
  HAIR_PALETTES,
  OUTFIT_PALETTES,
} from "@/lib/avatarRig";
import { X, Sparkles, Check, Play, RefreshCw, Palette, User } from "lucide-react";

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
}

const SKIN_OPTIONS: { id: AvatarSkinTone; label: string }[] = [
  { id: "IVORY", label: "Ivory" },
  { id: "ALMOND", label: "Almond" },
  { id: "CARAMEL", label: "Caramel" },
  { id: "ESPRESSO", label: "Espresso" },
  { id: "CYAN", label: "Neon Cyan" },
  { id: "OBSIDIAN", label: "Obsidian" },
];

const HAIR_STYLES: { id: AvatarHairStyle; label: string }[] = [
  { id: "CYBER_FADE", label: "Cyber Fade" },
  { id: "SPIKY_ANIME", label: "Spiky Anime" },
  { id: "NEON_BOB", label: "Neon Bob" },
  { id: "CURLY_AFRO", label: "Curly Afro" },
  { id: "PUNK_DREADS", label: "Punk Dreads" },
  { id: "BALD", label: "Minimal / Bald" },
];

const HAIR_COLORS: { id: AvatarHairColor; label: string }[] = [
  { id: "CYAN", label: "Cyan" },
  { id: "NEON_PINK", label: "Pink" },
  { id: "PURPLE", label: "Purple" },
  { id: "EMERALD", label: "Emerald" },
  { id: "BLONDE", label: "Blonde" },
  { id: "BLACK", label: "Black" },
  { id: "WHITE", label: "White" },
];

const EYEWEAR_OPTIONS: { id: AvatarEyewear; label: string }[] = [
  { id: "CYBER_VISOR", label: "Cyber Visor" },
  { id: "RETRO_SHADES", label: "Retro Shades" },
  { id: "WIREFRAME_GLASSES", label: "Wireframe" },
  { id: "NONE", label: "None" },
];

const OUTFIT_OPTIONS: { id: AvatarOutfitColor; label: string }[] = [
  { id: "OBSIDIAN", label: "Obsidian" },
  { id: "WHITE", label: "White" },
  { id: "CRIMSON", label: "Crimson" },
  { id: "EMERALD", label: "Emerald" },
  { id: "CYAN", label: "Cyan" },
  { id: "AMBER", label: "Amber" },
];

export default function AvatarCustomizerModal({
  isOpen,
  onClose,
  initialConfig = DEFAULT_AVATAR_CONFIG,
  onSave,
}: AvatarCustomizerModalProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [testGesture, setTestGesture] = useState<AvatarGesture>("GREETING_WAVE");
  const [activeTab, setActiveTab] = useState<"FACE" | "HAIR" | "STYLE" | "GESTURES">("FACE");

  if (!isOpen) return null;

  const handleSave = () => {
    soundSynth.playFanfare();
    onSave(config);
    onClose();
  };

  const handleGesturePreview = (g: AvatarGesture) => {
    setTestGesture(g);
    const meta = GESTURE_CATALOG[g];
    if (meta.soundType === "fanfare") soundSynth.playFanfare();
    else if (meta.soundType === "airhorn") soundSynth.playAirhorn();
    else if (meta.soundType === "gong") soundSynth.playGong();
    else if (meta.soundType === "snare") soundSynth.playSnare();
    else soundSynth.playSubtlePop();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-neutral-950 border-2 border-white p-5 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] font-mono text-white space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-black text-xs uppercase tracking-widest text-white">
              // 2.5D AVATAR STUDIO [ CUSTOMIZER ]
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white hover:border-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live 3D Avatar Preview Pod */}
        <div className="flex flex-col items-center justify-center py-3 bg-black border-2 border-neutral-800 rounded-xl relative overflow-hidden shadow-inner">
          <div className="w-36 h-36 rounded-full border-4 border-white bg-neutral-950 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] relative">
            <ExpressiveAvatar config={config} gesture={testGesture} size={144} />
          </div>
          <div className="mt-2 text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1.5">
            <span>PREVIEWING:</span>
            <span className="text-white font-black">{GESTURE_CATALOG[testGesture].emoji} {GESTURE_CATALOG[testGesture].label}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 border-b border-neutral-800 pb-2">
          {(["FACE", "HAIR", "STYLE", "GESTURES"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                soundSynth.playSubtlePop();
              }}
              className={`py-1.5 text-[10px] font-black uppercase rounded transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-white text-black font-extrabold shadow"
                  : "bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Face & Skin */}
        {activeTab === "FACE" && (
          <div className="space-y-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">
              CHOOSE SKIN TONE:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {SKIN_OPTIONS.map((opt) => {
                const isSelected = config.skinTone === opt.id;
                const palette = SKIN_PALETTES[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, skinTone: opt.id });
                      soundSynth.playSubtlePop();
                    }}
                    className={`p-2.5 border rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-white bg-neutral-900 ring-2 ring-white"
                        : "border-neutral-800 bg-black hover:border-neutral-600"
                    }`}
                  >
                    <div
                      style={{ backgroundColor: palette.base }}
                      className="w-5 h-5 rounded-full border border-black shadow"
                    />
                    <span className="text-[10px] font-bold truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Hairstyle & Hair Color */}
        {activeTab === "HAIR" && (
          <div className="space-y-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">
              HAIR STYLE:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setConfig({ ...config, hairStyle: h.id });
                    soundSynth.playSubtlePop();
                  }}
                  className={`py-2 px-2 border rounded text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${
                    config.hairStyle === h.id
                      ? "border-white bg-white text-black font-black"
                      : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-neutral-400 font-bold uppercase block pt-1">
              HAIR COLOR:
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {HAIR_COLORS.map((c) => {
                const isSelected = config.hairColor === c.id;
                const palette = HAIR_PALETTES[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, hairColor: c.id });
                      soundSynth.playSubtlePop();
                    }}
                    className={`py-2 flex flex-col items-center gap-1 border rounded transition-all cursor-pointer ${
                      isSelected
                        ? "border-white bg-neutral-900 ring-1 ring-white"
                        : "border-neutral-800 bg-black hover:border-neutral-600"
                    }`}
                  >
                    <div
                      style={{ backgroundColor: palette.base }}
                      className="w-4 h-4 rounded-full border border-black"
                    />
                    <span className="text-[8px] font-bold truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Eyewear & Outfit */}
        {activeTab === "STYLE" && (
          <div className="space-y-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">
              CYBER EYEWEAR & ACCESSORIES:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {EYEWEAR_OPTIONS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setConfig({ ...config, eyewear: e.id });
                    soundSynth.playSubtlePop();
                  }}
                  className={`py-2 px-2.5 border rounded text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${
                    config.eyewear === e.id
                      ? "border-white bg-white text-black font-black"
                      : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-neutral-400 font-bold uppercase block pt-1">
              OUTFIT COLOR:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {OUTFIT_OPTIONS.map((o) => {
                const isSelected = config.outfitColor === o.id;
                const palette = OUTFIT_PALETTES[o.id];
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setConfig({ ...config, outfitColor: o.id });
                      soundSynth.playSubtlePop();
                    }}
                    className={`py-2 flex flex-col items-center gap-1 border rounded transition-all cursor-pointer ${
                      isSelected
                        ? "border-white bg-neutral-900 ring-1 ring-white"
                        : "border-neutral-800 bg-black hover:border-neutral-600"
                    }`}
                  >
                    <div
                      style={{ backgroundColor: palette.base }}
                      className="w-4 h-4 rounded-full border border-black"
                    />
                    <span className="text-[8px] font-bold truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Gesture Testing Sandbox */}
        {activeTab === "GESTURES" && (
          <div className="space-y-2">
            <span className="text-[10px] text-neutral-400 font-bold uppercase block">
              TEST EXPRESSIVE GESTURE ANIMATIONS:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(GESTURE_CATALOG) as AvatarGesture[]).map((g) => {
                const meta = GESTURE_CATALOG[g];
                const isActive = testGesture === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGesturePreview(g)}
                    className={`p-2.5 border rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                      isActive
                        ? "border-white bg-white text-black font-black shadow-lg"
                        : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-600"
                    }`}
                  >
                    <span className="text-xl">{meta.emoji}</span>
                    <span className="text-[9px] font-black uppercase truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-neutral-900 border border-neutral-700 hover:border-white text-white font-black text-xs uppercase rounded-lg cursor-pointer transition-all"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-white text-black font-black text-xs uppercase hover:bg-neutral-200 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>[ SAVE 3D AVATAR ]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
