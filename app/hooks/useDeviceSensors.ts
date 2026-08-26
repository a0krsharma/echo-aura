"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SensorState {
  tiltX: number;        // Normalized [-1..1] Left/Right
  tiltY: number;        // Normalized [-1..1] Forward/Back
  isShaking: boolean;   // High-G impulse trigger
  hasPermission: boolean;
}

const SHAKE_THRESHOLD = 22;   // m/s² magnitude
const SHAKE_COOLDOWN_MS = 1200;

export function useDeviceSensors() {
  const [sensors, setSensors] = useState<SensorState>({
    tiltX: 0, tiltY: 0, isShaking: false, hasPermission: false,
  });

  const lastShakeTimeRef = useRef(0);
  const orientHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const bindListeners = useCallback(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // Left/Right  [-90..90]
      const beta  = e.beta  ?? 0; // Front/Back  [-180..180]
      setSensors(prev => ({
        ...prev,
        tiltX: Math.max(-1, Math.min(1, gamma / 45)),
        tiltY: Math.max(-1, Math.min(1, (beta - 45) / 45)),
      }));
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      const mag = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      const now = Date.now();
      if (mag > SHAKE_THRESHOLD && now - lastShakeTimeRef.current > SHAKE_COOLDOWN_MS) {
        lastShakeTimeRef.current = now;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([80, 50, 80]);
        }
        setSensors(prev => ({ ...prev, isShaking: true }));
        setTimeout(() => setSensors(prev => ({ ...prev, isShaking: false })), 900);
      }
    };

    orientHandlerRef.current = handleOrientation;
    motionHandlerRef.current = handleMotion;
    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("devicemotion", handleMotion);
    setSensors(prev => ({ ...prev, hasPermission: true }));
  }, []);

  const requestSensorPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === "function") {
      try {
        const orientRes = await (DeviceOrientationEvent as any).requestPermission();
        const motionRes = await (DeviceMotionEvent as any).requestPermission();
        if (orientRes === "granted" && motionRes === "granted") bindListeners();
      } catch (err) {
        console.warn("[DeviceSensors] Permission denied:", err);
      }
    } else {
      // Android + desktop auto-grant
      bindListeners();
    }
  }, [bindListeners]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Auto-bind on non-iOS devices
    if (typeof (DeviceOrientationEvent as any)?.requestPermission !== "function") {
      bindListeners();
    }
    return () => {
      if (orientHandlerRef.current)
        window.removeEventListener("deviceorientation", orientHandlerRef.current);
      if (motionHandlerRef.current)
        window.removeEventListener("devicemotion", motionHandlerRef.current);
    };
  }, [bindListeners]);

  return { sensors, requestSensorPermission };
}
