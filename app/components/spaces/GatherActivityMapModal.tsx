"use client";

import React from "react";
import { X, Users } from "lucide-react";
import { SpatialAvatar } from "@/lib/spaces";

interface GatherActivityMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onTeleportToPod: (x: number, y: number, podName: string) => void;
}

export default function GatherActivityMapModal({
  isOpen,
  onClose,
  localAvatar,
  remoteAvatars,
  onTeleportToPod,
}: GatherActivityMapModalProps) {
  if (!isOpen) return null;

  const allAvatars = [localAvatar, ...remoteAvatars];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-white tracking-tight">
                  PEOPLE IN SPACE
                </h2>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                {allAvatars.length} participant{allAvatars.length === 1 ? "" : "s"} online
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-2">
            {allAvatars.map((av) => {
              const isLocal = av.uid === localAvatar.uid;
              return (
                <div
                  key={av.uid}
                  className="p-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs"
                      style={{ backgroundColor: av.avatarConfig?.outfitColor || "#38bdf8" }}
                    >
                      {av.handle?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                        {av.handle || "Anonymous"}
                        {isLocal && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px]">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-neutral-500">
                        {av.isSpeaking ? "Speaking..." : "Quiet"}
                      </div>
                    </div>
                  </div>
                  {!isLocal && (
                    <button
                      onClick={() => {
                        onTeleportToPod(av.x, av.y, av.handle || "User");
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-white transition-colors cursor-pointer"
                    >
                      Go To
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
