"use client";

/**
 * app/components/spaces/AutoSeatingModal.tsx
 * ─────────────────────────────────────────────────────
 * Smart Auto-Seating Coordinator for Parties & Dinners
 * Symmetrically assigns chairs around the 16-seat Banquet Table:
 * - Chair 0: Host (Head of Table)
 * - Chairs 1 to 7: Left / Top Flank
 * - Chairs 8 to 14: Right / Bottom Flank
 * - Chair 15: Co-Host (Foot of Table)
 * 
 * Auto-teleports guests to their designated chairs with nameplates.
 */

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Users,
  Check,
  MapPin,
  Compass,
  ArrowRight,
} from "lucide-react";
import { ChairReservation } from "@/lib/spacesEconomy";
import { SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

interface AutoSeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onApplySeating: (reservations: ChairReservation[]) => void;
  onTeleportToSeat: (x: number, y: number) => void;
  onBroadcastSpeech: (text: string) => void;
}

export default function AutoSeatingModal({
  isOpen,
  onClose,
  localAvatar,
  remoteAvatars,
  onApplySeating,
  onTeleportToSeat,
  onBroadcastSpeech,
}: AutoSeatingModalProps) {
  const allAttendees = [localAvatar, ...remoteAvatars];
  const [guestCount, setGuestCount] = useState<number>(Math.max(2, allAttendees.length));

  if (!isOpen) return null;

  // Generate 16 Banquet Chair Positions (x: 1040, y: 320, w: 330, h: 66)
  const generateChairPlan = (count: number): ChairReservation[] => {
    const list: ChairReservation[] = [];

    // 0: Head of Table (West)
    list.push({
      chairIndex: 0,
      x: 1018,
      y: 350,
      seatLabel: "Host (Head)",
      reservedForHandle: localAvatar.handle,
      reservedForUid: localAvatar.uid,
    });

    // 1 to 7: Top Row Chairs
    for (let i = 0; i < 7; i++) {
      const friend = remoteAvatars[i];
      list.push({
        chairIndex: i + 1,
        x: 1065 + i * 44,
        y: 298,
        seatLabel: `Left Flank ${i + 1}`,
        reservedForHandle: friend?.handle || (i + 1 < count ? `@Guest_${i + 1}` : undefined),
        reservedForUid: friend?.uid,
      });
    }

    // 8 to 14: Bottom Row Chairs
    for (let i = 0; i < 7; i++) {
      const friend = remoteAvatars[7 + i];
      list.push({
        chairIndex: 8 + i,
        x: 1065 + i * 44,
        y: 400,
        seatLabel: `Right Flank ${i + 1}`,
        reservedForHandle: friend?.handle || (8 + i < count ? `@Guest_${8 + i}` : undefined),
        reservedForUid: friend?.uid,
      });
    }

    // 15: Foot of Table (East)
    const coHost = remoteAvatars[14];
    list.push({
      chairIndex: 15,
      x: 1380,
      y: 350,
      seatLabel: "Co-Host (Foot)",
      reservedForHandle: coHost?.handle || (15 < count ? `@CoHost` : undefined),
      reservedForUid: coHost?.uid,
    });

    return list;
  };

  const currentPlan = generateChairPlan(guestCount);

  const handleConfirmSeating = () => {
    spacesSfx.playSitPop();
    setTimeout(() => spacesSfx.playKeyNote(5), 200);

    onApplySeating(currentPlan);

    // Teleport local host to head chair
    const mySeat = currentPlan[0];
    onTeleportToSeat(mySeat.x, mySeat.y);

    onBroadcastSpeech(
      `🪑 Banquet seating arranged for ${guestCount} guests! Please take your reserved seats at the Fountain Banquet Table! ✨`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-900 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg text-lg">
              🪑
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white font-mono flex items-center gap-2">
                <span>SMART AUTO-SEATING COORDINATOR</span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Automatically allocate seats for your party around the 16-chair banquet table!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guest Count Selector */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-neutral-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Total Expected Guests for Dinner / Party:</span>
              </span>
              <span className="font-mono text-xs font-black text-cyan-400 px-3 py-1 rounded-xl bg-cyan-950 border border-cyan-800">
                {guestCount} Guests
              </span>
            </div>

            <input
              type="range"
              min="2"
              max="16"
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
              <span>2 (Intimate Date)</span>
              <span>8 (Dinner Party)</span>
              <span>16 (Full Banquet)</span>
            </div>
          </div>

          {/* Seating Diagram Preview */}
          <div className="p-5 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-300">
                16-Seat Banquet Layout Preview
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Fountain Room Table
              </span>
            </div>

            {/* Visual Table & Chairs */}
            <div className="relative p-6 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center min-h-[160px]">
              {/* Center Table */}
              <div className="w-full max-w-md h-16 rounded-2xl bg-amber-950/60 border-2 border-amber-700/60 flex items-center justify-center font-mono text-xs font-bold text-amber-300 shadow-inner">
                🍽️ BANQUET TABLE
              </div>

              {/* Head Seat (Left) */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-300 font-mono text-[9px] font-bold shadow-md">
                👑 {localAvatar.handle}
              </div>

              {/* Foot Seat (Right) */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-400 font-mono text-[9px]">
                {currentPlan[15]?.reservedForHandle || "Co-Host"}
              </div>
            </div>

            {/* Chair Allocations List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
              {currentPlan.slice(0, guestCount).map((seat) => (
                <div
                  key={seat.chairIndex}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between font-mono text-[10px]"
                >
                  <span className="text-neutral-400">Chair #{seat.chairIndex}</span>
                  <span className="text-cyan-400 font-bold truncate max-w-[70px]">
                    {seat.reservedForHandle || "Available"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmSeating}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-mono font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>CONFIRM & AUTO-SEAT GUESTS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
