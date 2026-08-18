"use client";

import React from "react";
import Link from "next/link";

/**
 * OrbitLogo Component
 * Earth revolving around the Sun in a 3D animated orbit.
 */
export default function OrbitLogo({ 
  className = "",
  size = "md",
}: { 
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  return (
    <Link href="/" className={`inline-flex items-center gap-3.5 group select-none ${className}`}>
      {/* Planetary Orbit Visualizer */}
      <div className={`relative ${isSm ? "w-7 h-7" : isLg ? "w-12 h-12" : "w-9 h-9"} flex items-center justify-center shrink-0`}>
        {/* Sun in center */}
        <div className={`${isSm ? "w-2.5 h-2.5" : isLg ? "w-5 h-5" : "w-3.5 h-3.5"} rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse z-10`} />

        {/* Orbit Ring */}
        <div className="absolute inset-0 rounded-full border border-neutral-700/80 group-hover:border-amber-500/50 transition-colors rotate-[-25deg] shadow-[0_0_8px_rgba(255,255,255,0.05)]" />

        {/* Revolving Earth Container */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          {/* Earth planet orbiting */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isSm ? "w-1.5 h-1.5" : isLg ? "w-3 h-3" : "w-2 h-2"} rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_8px_rgba(34,211,238,0.9)]`} />
        </div>

        {/* Outer Orbit Glow Ring */}
        <div className="absolute -inset-1 rounded-full border border-dashed border-neutral-800/60 animate-[spin_12s_linear_infinite]" />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-mono ${isSm ? "text-base" : isLg ? "text-2xl" : "text-xl"} font-bold tracking-tight text-white uppercase group-hover:text-amber-300 transition-colors`}>
            Echo.
          </span>
          <span className="font-mono text-[9px] px-1.5 py-0.2 border border-neutral-800 text-neutral-400 uppercase tracking-widest group-hover:border-neutral-600 transition-colors">
            AURA
          </span>
        </div>
      </div>
    </Link>
  );
}
