"use client";

/**
 * app/spaces/page.tsx
 * ─────────────────────────────────────────────────────
 * Echo Spaces: Gather.town Style Live 2D Interactive Metaverse
 * 5 Living Spaces: Virtual Office, Quiet Library, Music Studio,
 * Concert Hall, and Debate Arena.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import EchoSpacesWorld from "@/app/components/spaces/EchoSpacesWorld";
import ZoneContextDock from "@/app/components/spaces/ZoneContextDock";
import SpatialVoiceManager from "@/app/components/spaces/SpatialVoiceManager";
import {
  SpaceZoneId,
  SpatialAvatar,
  SPACES_ZONES,
  DEFAULT_AMBIENT_BOTS,
  InteractiveObject,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import {
  ArrowLeft,
  Users,
  Compass,
  Sparkles,
  Radio,
  Share2,
  Mic,
  Palette,
  Check,
  X,
} from "lucide-react";

export default function SpacesPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Local Avatar State
  const [localAvatar, setLocalAvatar] = useState<SpatialAvatar>({
    uid: user?.uid || "guest_player",
    handle: user?.handle || "@EXPLORER",
    avatarUrl: user?.photoUrl || user?.photoURL,
    x: 800, // Spawn in center courtyard
    y: 540,
    direction: "down",
    isMoving: false,
    isSitting: false,
    activeZone: "courtyard",
    hoodieColor: "#38bdf8", // Cyan
    isSpeaking: false,
    lastUpdated: Date.now(),
  });

  // Remote Avatars (Synced real-time + ambient bots)
  const [remoteAvatars, setRemoteAvatars] = useState<SpatialAvatar[]>(DEFAULT_AMBIENT_BOTS);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [miniMapOpen, setMiniMapOpen] = useState(false);

  // Sync user profile updates
  useEffect(() => {
    if (user) {
      setLocalAvatar((prev) => ({
        ...prev,
        uid: user.uid,
        handle: user.handle || prev.handle,
        avatarUrl: user.photoUrl || user.photoURL || prev.avatarUrl,
      }));
    }
  }, [user]);

  // Handle Position Move
  const handleMove = (x: number, y: number, dir: "down" | "up" | "left" | "right", isMoving: boolean) => {
    setLocalAvatar((prev) => ({
      ...prev,
      x,
      y,
      direction: dir,
      isMoving,
      isSitting: isMoving ? false : prev.isSitting,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Sitting
  const handleSit = (isSitting: boolean, objectId?: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      isSitting,
      sittingObjectId: objectId,
      isMoving: false,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Zone Change
  const handleZoneChange = (newZone: SpaceZoneId) => {
    setLocalAvatar((prev) => ({
      ...prev,
      activeZone: newZone,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Speech Bubble
  const handleSendSpeech = (text: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      speechBubble: { text, expiresAt: Date.now() + 5500 },
      lastUpdated: Date.now(),
    }));
  };

  // Handle Emote
  const handleSendEmote = (emote: string) => {
    handleSendSpeech(emote);
  };

  // Handle Status Text update
  const handleUpdateStatus = (status: string) => {
    setLocalAvatar((prev) => ({
      ...prev,
      statusText: status,
      lastUpdated: Date.now(),
    }));
  };

  // Handle Object Interaction (e.g. Fountain coin toss)
  const handleInteractObject = (obj: InteractiveObject) => {
    if (obj.type === "fountain") {
      handleTossCoin();
    } else if (obj.type === "gavel") {
      spacesSfx.playGavelStrike();
    } else if (obj.type === "pomodoro") {
      spacesSfx.playFocusBell();
    }
  };

  // Fountain Coin Toss
  const handleTossCoin = () => {
    spacesSfx.playFountainSplash();
    handleSendSpeech("🪙 Tossed a coin in the Fountain!");
  };

  // Mini-map Fast Teleport
  const handleTeleport = (zoneId: SpaceZoneId) => {
    const zone = SPACES_ZONES[zoneId];
    if (!zone) return;
    const targetX = zone.bounds.x + zone.bounds.w / 2;
    const targetY = zone.bounds.y + zone.bounds.h / 2;

    setLocalAvatar((prev) => ({
      ...prev,
      x: targetX,
      y: targetY,
      activeZone: zoneId,
      isSitting: false,
      lastUpdated: Date.now(),
    }));
    spacesSfx.playZoneChime();
    setMiniMapOpen(false);
  };

  const hoodieColors = [
    { name: "Cyan", hex: "#38bdf8" },
    { name: "Purple", hex: "#a855f7" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Indigo", hex: "#6366f1" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between font-sans select-none overflow-hidden pb-12 sm:pb-0">
      {/* ── Top Header Bar ── */}
      <header className="w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 py-2.5 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/rooms"
            className="p-1.5 rounded-xl border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Return to Audio Rooms"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-1.5">
                <span>ECHO SPACES</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  2D METAVERSE
                </span>
              </h1>
            </div>
            <p className="text-[10px] font-mono text-neutral-400 hidden sm:block">
              WALK INTO ANY ROOM TO JOIN // 360° SPATIAL PROXIMITY VOICE
            </p>
          </div>
        </div>

        {/* Right Utility Buttons */}
        <div className="flex items-center gap-2">
          {/* Spatial Voice Component */}
          <SpatialVoiceManager
            spaceId="genesis_world"
            localAvatar={localAvatar}
            remoteAvatars={remoteAvatars}
            onSpeakingChange={(isSpeaking) =>
              setLocalAvatar((prev) => ({ ...prev, isSpeaking }))
            }
          />

          {/* Quick Teleport Mini-map */}
          <button
            type="button"
            onClick={() => setMiniMapOpen(!miniMapOpen)}
            className="px-2.5 py-1.5 rounded-xl border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-neutral-300 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">MAP</span>
          </button>

          {/* Avatar Color Picker */}
          <button
            type="button"
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            className="p-1.5 rounded-xl border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-neutral-300 transition-all cursor-pointer"
            title="Customize Avatar Outfit"
          >
            <Palette className="w-4 h-4 text-purple-400" />
          </button>

          {/* Online count */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300">
            <Users className="w-3 h-3 text-emerald-400" />
            <span>{remoteAvatars.length + 1} ONLINE</span>
          </div>
        </div>
      </header>

      {/* ── Main Canvas Arena ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-2 sm:p-4 flex flex-col justify-center">
        <EchoSpacesWorld
          localAvatar={localAvatar}
          remoteAvatars={remoteAvatars}
          onMove={handleMove}
          onSit={handleSit}
          onSendSpeech={handleSendSpeech}
          onSendEmote={handleSendEmote}
          onZoneChange={handleZoneChange}
          onInteractObject={handleInteractObject}
        />
      </main>

      {/* ── Bottom Dynamic Zone Dock ── */}
      <footer className="w-full z-30">
        <ZoneContextDock
          currentZone={localAvatar.activeZone}
          onSendEmote={handleSendEmote}
          onUpdateStatus={handleUpdateStatus}
          onTossCoin={handleTossCoin}
        />
      </footer>

      {/* ── Avatar Color Customizer Modal ── */}
      {colorPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 font-mono">
          <div className="w-full max-w-xs bg-neutral-950 border border-neutral-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>CHOOSE HOODIE COLOR</span>
              </span>
              <button
                type="button"
                onClick={() => setColorPickerOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {hoodieColors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    setLocalAvatar((prev) => ({ ...prev, hoodieColor: c.hex }));
                    setColorPickerOpen(false);
                    spacesSfx.playSitPop();
                  }}
                  className="py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: `${c.hex}22`,
                    borderColor: localAvatar.hoodieColor === c.hex ? "#ffffff" : `${c.hex}66`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full shadow-md"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[10px] font-bold" style={{ color: c.hex }}>
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Mini-map Teleport Modal ── */}
      {miniMapOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 font-mono">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>QUICK TELEPORT MAP</span>
              </span>
              <button
                type="button"
                onClick={() => setMiniMapOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {Object.values(SPACES_ZONES).map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleTeleport(z.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    localAvatar.activeZone === z.id
                      ? "bg-white text-black border-white font-black"
                      : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{z.icon}</span>
                    <div>
                      <div className="text-xs font-bold uppercase">{z.name}</div>
                      <div className="text-[9px] text-neutral-400">{z.category}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold">WARP ►</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
