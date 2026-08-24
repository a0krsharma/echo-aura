"use client";

import React, { useRef, useEffect } from "react";
import {
  AvatarRigDriver,
  type AvatarConfig,
  type AvatarGesture,
  DEFAULT_AVATAR_CONFIG,
} from "@/lib/avatarRig";

interface ExpressiveAvatarProps {
  config?: AvatarConfig;
  gesture?: AvatarGesture;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export default function ExpressiveAvatar({
  config = DEFAULT_AVATAR_CONFIG,
  gesture = "IDLE",
  size = 120,
  className = "",
  onClick,
}: ExpressiveAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const driverRef = useRef<AvatarRigDriver | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High DPI scaling
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const driver = new AvatarRigDriver(canvas, config);
    driver.setGesture(gesture);
    driver.start();
    driverRef.current = driver;

    return () => {
      driver.stop();
      driverRef.current = null;
    };
  }, [size]);

  // Update Config on prop change
  useEffect(() => {
    if (driverRef.current) {
      driverRef.current.updateConfig(config);
    }
  }, [config]);

  // Update Gesture on prop change
  useEffect(() => {
    if (driverRef.current) {
      driverRef.current.setGesture(gesture);
    }
  }, [gesture]);

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center select-none ${
        onClick ? "cursor-pointer active:scale-95 transition-transform" : ""
      } ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="w-full h-full block"
      />
    </div>
  );
}
