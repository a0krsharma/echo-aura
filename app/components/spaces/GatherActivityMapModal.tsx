"use client";

/**
 * app/components/spaces/GatherActivityMapModal.tsx
 * ─────────────────────────────────────────────────────
 * Authentic Gather Birds-Eye Activity Map (Image 2)
 * Features:
 * - Birds-eye layout of all department pods & rooms (Design, Product, Eng, Support, People, Infra)
 * - Live clusters showing where avatars are currently grouped & talking
 * - 1-Click "Join Pod" button that teleports you directly into the conversation!
 */

import React from "react";
import {
  X,
  Compass,
  Users,
  MapPin,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Coffee,
} from "lucide-react";
import { SpatialAvatar, SpaceZoneDef, SPACES_ZONES } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface DepartmentPod {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  bg: string;
  avatars: { name: string; avatarColor: string }[];
  isTalking: boolean;
}

interface GatherActivityMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onTeleportToPod: (x: number, y: number, podName: string) => void;
}

const DEPARTMENT_PODS: DepartmentPod[] = [
  {
    id: "design_pod",
    name: "Product Design & UX",
    category: "Design",
    x: 270,
    y: 280,
    w: 220,
    h: 140,
    color: "#ec4899",
    bg: "rgba(236, 72, 153, 0.12)",
    avatars: [
      { name: "Natasha", avatarColor: "#ec4899" },
      { name: "Melodie", avatarColor: "#f59e0b" },
    ],
    isTalking: true,
  },
  {
    id: "eng_pod",
    name: "Core Engineering & Infra",
    category: "Engineering",
    x: 540,
    y: 280,
    w: 220,
    h: 140,
    color: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.12)",
    avatars: [
      { name: "Cameron", avatarColor: "#38bdf8" },
      { name: "Joshua", avatarColor: "#06b6d4" },
      { name: "Scott", avatarColor: "#10b981" },
    ],
    isTalking: true,
  },
  {
    id: "fountain_room",
    name: "Courtyard Fountain Room",
    category: "Lounge",
    x: 800,
    y: 560,
    w: 200,
    h: 160,
    color: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.12)",
    avatars: [
      { name: "Atul", avatarColor: "#38bdf8" },
      { name: "Eva", avatarColor: "#8b5cf6" },
    ],
    isTalking: false,
  },
  {
    id: "arcade_pod",
    name: "Retro Arcade Lounge",
    category: "Gaming",
    x: 410,
    y: 420,
    w: 180,
    h: 120,
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.12)",
    avatars: [
      { name: "Dalton", avatarColor: "#10b981" },
      { name: "Breno", avatarColor: "#f43f5e" },
    ],
    isTalking: true,
  },
  {
    id: "library_pod",
    name: "Silent Study Sanctuary",
    category: "Focus",
    x: 1200,
    y: 260,
    w: 240,
    h: 160,
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.12)",
    avatars: [{ name: "Ana Bizo", avatarColor: "#a855f7" }],
    isTalking: false,
  },
  {
    id: "stage_pod",
    name: "Concert Amphitheater",
    category: "Stage",
    x: 800,
    y: 860,
    w: 240,
    h: 160,
    color: "#eab308",
    bg: "rgba(234, 179, 8, 0.12)",
    avatars: [],
    isTalking: false,
  },
];

export default function GatherActivityMapModal({
  isOpen,
  onClose,
  localAvatar,
  remoteAvatars,
  onTeleportToPod,
}: GatherActivityMapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-white tracking-tight">
                  LIVE OFFICE ACTIVITY OVERVIEW
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/40 text-[10px] font-mono text-emerald-300 font-bold">
                  BIRDS-EYE MAP
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                See where colleagues are huddled, working, or talking in real-time. Click to join any room!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: Birds-Eye Map Grid (Image 2 style) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DEPARTMENT_PODS.map((pod) => {
              const isUserHere =
                Math.abs(localAvatar.x - pod.x) < 140 && Math.abs(localAvatar.y - pod.y) < 100;
              return (
                <div
                  key={pod.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                    isUserHere
                      ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 shadow-lg"
                      : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                  }`}
                  style={{ backgroundColor: pod.bg }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pod.color }} />
                      <span>{pod.name}</span>
                    </span>

                    {pod.isTalking && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>TALKING</span>
                      </span>
                    )}
                  </div>

                  {/* Avatars clustered in this room */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-neutral-400 flex items-center justify-between">
                      <span>People in pod:</span>
                      <span className="font-bold text-neutral-300">
                        {pod.avatars.length + (isUserHere ? 1 : 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isUserHere && (
                        <div
                          className="w-7 h-7 rounded-full border-2 border-cyan-400 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                          style={{
                            backgroundColor: localAvatar.avatarConfig?.outfitColor || "#38bdf8",
                          }}
                          title="You are here!"
                        >
                          YOU
                        </div>
                      )}
                      {pod.avatars.map((av) => (
                        <div
                          key={av.name}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: av.avatarColor }}
                          title={av.name}
                        >
                          {av.name.charAt(0)}
                        </div>
                      ))}
                      {pod.avatars.length === 0 && !isUserHere && (
                        <span className="text-[11px] font-mono text-neutral-500 italic">
                          Quiet / Empty
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Join in 1-Click Button (Image 4 pillar: "Join in a click") */}
                  <button
                    onClick={() => {
                      spacesSfx.playZoneChime();
                      onTeleportToPod(pod.x, pod.y, pod.name);
                      onClose();
                    }}
                    disabled={isUserHere}
                    className={`w-full py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isUserHere
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-default"
                        : "bg-white hover:bg-neutral-200 text-black shadow-md active:scale-95"
                    }`}
                  >
                    {isUserHere ? (
                      <span>Current Location</span>
                    ) : (
                      <>
                        <span>Join in 1-Click</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
