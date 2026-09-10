"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SpaceZoneId,
  SpaceVibe,
  SpatialAvatar,
  SPACES_ZONES,
  INTERACTIVE_OBJECTS,
  InteractiveObject,
  PRIVATE_RUGS,
  PrivateRug,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getZoneAtCoordinates,
  getPrivateRugAtCoordinates,
  checkCollision,
  getNearbyInteractiveObject,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import { useAuth } from "@/app/components/AuthProvider";
import {
  Sparkles,
  Send,
  MessageSquare,
  Ghost,
  Volume2,
  Lock,
} from "lucide-react";

interface EchoSpacesWorldProps {
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  vibe?: SpaceVibe;
  onMove: (x: number, y: number, dir: "down" | "up" | "left" | "right", isMoving: boolean) => void;
  onSit: (isSitting: boolean, objectId?: string) => void;
  onSendSpeech: (text: string) => void;
  onSendEmote: (emote: string) => void;
  onZoneChange: (newZone: SpaceZoneId) => void;
  onRugChange?: (rugId: string | null) => void;
  onInteractObject: (obj: InteractiveObject) => void;
  onToggleGhost?: () => void;
}

export default function EchoSpacesWorld({
  localAvatar,
  remoteAvatars,
  vibe = "MIDNIGHT_NEON",
  onMove,
  onSit,
  onSendSpeech,
  onSendEmote,
  onZoneChange,
  onRugChange,
  onInteractObject,
  onToggleGhost,
}: EchoSpacesWorldProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera tracking
  const cameraRef = useRef<{ x: number; y: number }>({ x: localAvatar.x, y: localAvatar.y });

  // Input states
  const keysPressed = useRef<Record<string, boolean>>({});
  const nearbyObjectRef = useRef<InteractiveObject | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);
  const [activeRugPrompt, setActiveRugPrompt] = useState<string | null>(null);

  // Chat message input
  const [chatInput, setChatInput] = useState("");
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);

  // Touch virtual joystick state
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // Vibe ambient particles state (rain, sakura petals, etc.)
  const particlesRef = useRef<
    Array<{ x: number; y: number; speed: number; size: number; alpha: number; angle?: number }>
  >([]);

  // Initialize atmospheric particles
  useEffect(() => {
    const pts: Array<{ x: number; y: number; speed: number; size: number; alpha: number; angle?: number }> = [];
    const count = vibe === "COZY_RAINY" ? 140 : vibe === "SUNSET_LOFI" ? 45 : 25;
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        speed: vibe === "COZY_RAINY" ? 10 + Math.random() * 8 : 1 + Math.random() * 2,
        size: vibe === "COZY_RAINY" ? 14 + Math.random() * 10 : 3 + Math.random() * 4,
        alpha: 0.2 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = pts;
  }, [vibe]);

  // 1. Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Interaction key [E]
      if (key === "e") {
        e.preventDefault();
        if (nearbyObjectRef.current) {
          handleInteract(nearbyObjectRef.current);
        }
      }

      // Ghost Mode toggle [G]
      if (key === "g") {
        e.preventDefault();
        onToggleGhost?.();
        spacesSfx.playKeyNote(6);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onToggleGhost]);

  // Handle Object Interaction
  const handleInteract = useCallback(
    (obj: InteractiveObject) => {
      spacesSfx.playSitPop();
      if (obj.type === "chair") {
        const nextSitting = !localAvatar.isSitting;
        onSit(nextSitting, nextSitting ? obj.id : undefined);
      } else {
        onInteractObject(obj);
      }
    },
    [localAvatar.isSitting, onSit, onInteractObject]
  );

  // 2. Chat Bubble Send
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendSpeech(chatInput.trim());
    setActiveSpeech(chatInput.trim());
    setChatInput("");
    setTimeout(() => setActiveSpeech(null), 5500);
  };

  // 3. 60 FPS World Engine Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let posX = localAvatar.x;
    let posY = localAvatar.y;
    let currentDir = localAvatar.direction;
    let currentZone = localAvatar.activeZone;
    let currentRugId = localAvatar.activeRugId || null;
    const speed = 4.2;

    const isGhostMode = !!localAvatar.avatarConfig?.isGhost;

    const render = () => {
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      // ── Player Movement Logic ──
      let dx = 0;
      let dy = 0;

      if (!localAvatar.isSitting) {
        if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= 1;
        if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += 1;
        if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= 1;
        if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += 1;

        // Add Touch Joystick vector
        if (isJoystickActive) {
          dx += joystickVector.current.x;
          dy += joystickVector.current.y;
        }
      }

      const isMoving = Math.hypot(dx, dy) > 0.1;

      if (isMoving) {
        const angle = Math.atan2(dy, dx);
        const nextX = posX + Math.cos(angle) * speed;
        const nextY = posY + Math.sin(angle) * speed;

        // In Ghost Mode, ignore collisions! Gather-fidelity feature.
        if (isGhostMode) {
          posX = Math.max(30, Math.min(WORLD_WIDTH - 30, nextX));
          posY = Math.max(30, Math.min(WORLD_HEIGHT - 30, nextY));
        } else {
          // Normal Collision detection against walls
          if (!checkCollision(nextX, posY)) posX = nextX;
          if (!checkCollision(posX, nextY)) posY = nextY;
        }

        // Direction facing
        if (Math.abs(dx) > Math.abs(dy)) {
          currentDir = dx > 0 ? "right" : "left";
        } else {
          currentDir = dy > 0 ? "down" : "up";
        }

        // Zone transition check
        const newZone = getZoneAtCoordinates(posX, posY);
        if (newZone !== currentZone) {
          currentZone = newZone;
          onZoneChange(newZone);
          spacesSfx.playZoneChime();
        }

        // Private Rug check
        const activeRug = getPrivateRugAtCoordinates(posX, posY);
        const nextRugId = activeRug ? activeRug.id : null;
        if (nextRugId !== currentRugId) {
          currentRugId = nextRugId;
          onRugChange?.(nextRugId);
          if (activeRug) {
            spacesSfx.playSitPop();
            setActiveRugPrompt(`🔒 Joined ${activeRug.name} (Isolated Private Audio)`);
          } else {
            setActiveRugPrompt(null);
          }
        }

        // Send position update
        onMove(posX, posY, currentDir, true);
      } else if (localAvatar.isMoving) {
        onMove(posX, posY, currentDir, false);
      }

      // Check nearby interactive objects
      const nearby = getNearbyInteractiveObject(posX, posY);
      nearbyObjectRef.current = nearby;
      setNearbyPrompt(nearby ? nearby.prompt : null);

      // Camera Smooth Tracking (Lerp)
      const targetCamX = posX - canvasW / 2;
      const targetCamY = posY - canvasH / 2;
      cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.12;
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.12;

      const camX = Math.max(0, Math.min(WORLD_WIDTH - canvasW, cameraRef.current.x));
      const camY = Math.max(0, Math.min(WORLD_HEIGHT - canvasH, cameraRef.current.y));

      // ── RENDERING ──
      ctx.save();

      // Clear Screen
      ctx.fillStyle = vibe === "SUNNY_DAYLIGHT" ? "#1c1917" : "#09090b";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Camera Offset Transform
      ctx.save();
      ctx.translate(-camX, -camY);

      // ── 1. MAP FLOORING PATTERNS ──
      ctx.fillStyle = vibe === "SUNNY_DAYLIGHT" ? "#292524" : "#18181b";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Vibe: Midnight Neon Courtyard Grid
      if (vibe === "MIDNIGHT_NEON") {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
        ctx.lineWidth = 1;
        for (let gx = 0; gx < WORLD_WIDTH; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, WORLD_HEIGHT);
          ctx.stroke();
        }
        for (let gy = 0; gy < WORLD_HEIGHT; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(WORLD_WIDTH, gy);
          ctx.stroke();
        }
      }

      // Render Each Zone Floor & Boundary
      Object.values(SPACES_ZONES).forEach((zone) => {
        const { bounds, id, color } = zone;

        ctx.save();
        if (id === "office") {
          // Warm Parquet Hardwood Floor
          ctx.fillStyle = vibe === "SUNNY_DAYLIGHT" ? "#44403c" : "#292524";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 1;
          for (let py = bounds.y; py < bounds.y + bounds.h; py += 32) {
            ctx.beginPath();
            ctx.moveTo(bounds.x, py);
            ctx.lineTo(bounds.x + bounds.w, py);
            ctx.stroke();
          }
        } else if (id === "library") {
          // Dark Mahogany & Velvet Rug
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
          ctx.fillRect(bounds.x + 30, bounds.y + 30, bounds.w - 60, bounds.h - 60);
        } else if (id === "music") {
          // Acoustic Soundproof Studio Checkers
          ctx.fillStyle = "#1c1917";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillStyle = "rgba(244, 63, 94, 0.06)";
          ctx.fillRect(bounds.x + 20, bounds.y + 20, bounds.w - 40, bounds.h - 40);
        } else if (id === "concert") {
          // Dark Concert Hall with Raised Neon Stage
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          const stageH = 140;
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(bounds.x + 40, bounds.y + 40, bounds.w - 80, stageH);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 4;
          ctx.strokeRect(bounds.x + 40, bounds.y + 40, bounds.w - 80, stageH);
        } else if (id === "debate") {
          // Courtroom Walnut Paneling
          ctx.fillStyle = "#14211b";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillStyle = "rgba(16, 185, 129, 0.07)";
          ctx.fillRect(bounds.x + 30, bounds.y + 30, bounds.w - 60, bounds.h - 60);
        }

        // Room Wall Trim & Glowing Perimeter
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        // Room Nameplate Banner above Doorway
        ctx.fillStyle = color;
        ctx.font = "900 12px monospace";
        ctx.fillText(`// ${zone.name.toUpperCase()} //`, bounds.x + 24, bounds.y + 28);
        ctx.restore();
      });

      // ── 2. PRIVATE CONVERSATION RUGS RENDERING (Gather-Style) ──
      PRIVATE_RUGS.forEach((rug) => {
        ctx.save();
        const isPlayerOnRug = currentRugId === rug.id;

        // Rug background fill with soft rounded rect
        ctx.fillStyle = isPlayerOnRug ? "rgba(56, 189, 248, 0.22)" : "rgba(30, 41, 59, 0.55)";
        ctx.beginPath();
        ctx.roundRect(rug.x, rug.y, rug.w, rug.h, 14);
        ctx.fill();

        // Rug glowing border
        ctx.strokeStyle = isPlayerOnRug ? "#38bdf8" : rug.color;
        ctx.lineWidth = isPlayerOnRug ? 3 : 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();

        // Rug Title & Capacity Badge
        ctx.fillStyle = isPlayerOnRug ? "#38bdf8" : rug.color;
        ctx.font = "bold 9px monospace";
        ctx.fillText(`🔒 ${rug.name.toUpperCase()} (${rug.capacity}P)`, rug.x + 10, rug.y + 20);

        ctx.restore();
      });

      // ── 3. CENTRAL COURTYARD FOUNTAIN ──
      const fX = 800;
      const fY = 590;
      ctx.save();
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(fX, fY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.stroke();

      const ripple = Math.sin(performance.now() * 0.005) * 3;
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(fX, fY, 36 + ripple, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.arc(fX, fY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 4. INTERACTIVE OBJECTS RENDERING ──
      INTERACTIVE_OBJECTS.forEach((obj) => {
        ctx.save();
        const { x, y, w, h, type, name, icon } = obj;

        if (type === "chair") {
          ctx.fillStyle = "#475569";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (type === "whiteboard") {
          ctx.fillStyle = "#f8fafc";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#0284c7";
          ctx.font = "bold 9px monospace";
          ctx.fillText("TEAM SCRATCHPAD", x + 10, y + 26);
        } else if (type === "piano") {
          ctx.fillStyle = "#09090b";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#ffffff";
          for (let k = 0; k < w - 10; k += 10) {
            ctx.fillRect(x + 5 + k, y + h - 18, 8, 14);
          }
        } else if (type === "drums") {
          ctx.fillStyle = "#27272a";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#e11d48";
          ctx.fillRect(x + 6, y + 6, (w - 18) / 2, (h - 18) / 2);
          ctx.fillRect(x + w / 2 + 3, y + 6, (w - 18) / 2, (h - 18) / 2);
          ctx.fillRect(x + 6, y + h / 2 + 3, (w - 18) / 2, (h - 18) / 2);
          ctx.fillRect(x + w / 2 + 3, y + h / 2 + 3, (w - 18) / 2, (h - 18) / 2);
        } else if (type === "podium") {
          ctx.fillStyle = "#78350f";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#cbd5e1";
          ctx.fillRect(x + w / 2 - 2, y - 12, 4, 12);
        } else if (type === "gavel") {
          ctx.fillStyle = "#451a03";
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText("JUDGE", x + 12, y + 24);
        } else if (type === "pomodoro") {
          ctx.fillStyle = "#581c87";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#c084fc";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.fillText("25M FOCUS", x + 6, y + 28);
        }

        ctx.font = "14px sans-serif";
        ctx.fillText(icon, x + w / 2 - 7, y - 6);
        ctx.restore();
      });

      // ── 5. PROXIMITY HEARING RADIUS (Dashed circle around player) ──
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(posX, posY, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── 6. RENDER ALL AVATARS (Sorted by Y for true 2.5D depth) ──
      const allAvatars = [...remoteAvatars, localAvatar].sort((a, b) => a.y - b.y);

      allAvatars.forEach((av) => {
        const isSelf = av.uid === localAvatar.uid;
        const aX = isSelf ? posX : av.x;
        const aY = isSelf ? posY : av.y;
        const dir = isSelf ? currentDir : av.direction;
        const isSit = isSelf ? localAvatar.isSitting : av.isSitting;

        const cfg = av.avatarConfig;
        const skinTone = cfg?.skinTone || "#fed7aa";
        const hairStyle = cfg?.hairStyle || "short";
        const hairColor = cfg?.hairColor || "#fde047";
        const outfit = cfg?.outfit || "hoodie";
        const outfitColor = cfg?.outfitColor || av.hoodieColor || "#38bdf8";
        const accessory = cfg?.accessory || "none";
        const pet = cfg?.pet || "none";
        const isGhost = cfg?.isGhost || false;

        ctx.save();
        ctx.translate(aX, aY);

        // Ghost Mode visual effect
        if (isGhost) {
          ctx.globalAlpha = 0.5;
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#38bdf8";
        }

        // Ground Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
        ctx.beginPath();
        ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Speaking Ripple Aura
        if (av.isSpeaking) {
          const pulse = Math.sin(performance.now() * 0.01) * 4 + 18;
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, -12, pulse, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Torso & Outfit ──
        ctx.fillStyle = outfitColor;
        if (isSit) {
          ctx.beginPath();
          ctx.roundRect(-10, -16, 20, 18, 5);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-11, -22, 22, 22, 6);
          ctx.fill();

          // Animated Walking Legs
          const stride = isSelf && isMoving ? Math.sin(performance.now() * 0.015) * 4 : 0;
          ctx.fillStyle = outfit === "suit" ? "#0f172a" : "#1e293b";
          ctx.fillRect(-8, 0, 6, 8 + stride);
          ctx.fillRect(2, 0, 6, 8 - stride);
        }

        // Outfit accents (e.g. Suit tie, Bomber zipper, Hoodie pocket)
        if (outfit === "suit") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-2, -22, 4, 6); // Collar
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(-1, -16, 2, 8); // Tie
        } else if (outfit === "bomber") {
          ctx.fillStyle = "#d97706";
          ctx.fillRect(-1, -22, 2, 20); // Zipper
        }

        // ── Head & Hair ──
        // Hair layer (Back)
        if (hairStyle !== "bald") {
          ctx.fillStyle = hairColor;
          ctx.beginPath();
          ctx.arc(0, -27, 11, 0, Math.PI * 2);
          ctx.fill();
        }

        // Face Skin Tone
        ctx.fillStyle = skinTone;
        ctx.beginPath();
        ctx.arc(0, -24, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Hairstyles (Front details)
        ctx.fillStyle = hairColor;
        if (hairStyle === "spiky") {
          ctx.beginPath();
          ctx.moveTo(-8, -32);
          ctx.lineTo(-4, -38);
          ctx.lineTo(0, -32);
          ctx.lineTo(4, -38);
          ctx.lineTo(8, -32);
          ctx.fill();
        } else if (hairStyle === "afro") {
          ctx.beginPath();
          ctx.arc(0, -28, 14, 0, Math.PI * 2);
          ctx.fill();
          // Redraw face inside afro
          ctx.fillStyle = skinTone;
          ctx.beginPath();
          ctx.arc(0, -24, 7.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (hairStyle === "beanie") {
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.roundRect(-9, -36, 18, 12, 4);
          ctx.fill();
          // Beanie bobble
          ctx.beginPath();
          ctx.arc(0, -38, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (hairStyle === "cap") {
          ctx.fillStyle = "#0284c7";
          ctx.beginPath();
          ctx.arc(0, -29, 9, Math.PI, Math.PI * 2);
          ctx.fill();
          // Cap peak
          if (dir === "right") ctx.fillRect(2, -28, 12, 3);
          else if (dir === "left") ctx.fillRect(-14, -28, 12, 3);
          else ctx.fillRect(-8, -28, 16, 3);
        }

        // Directional eye pupils
        ctx.fillStyle = "#0f172a";
        if (dir === "down") {
          ctx.fillRect(-3, -24, 2, 2);
          ctx.fillRect(2, -24, 2, 2);
        } else if (dir === "left") {
          ctx.fillRect(-5, -24, 2, 2);
        } else if (dir === "right") {
          ctx.fillRect(3, -24, 2, 2);
        }

        // ── Accessories ──
        if (accessory === "glasses") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-5, -26, 4, 3);
          ctx.strokeRect(1, -26, 4, 3);
        } else if (accessory === "shades") {
          ctx.fillStyle = "#000000";
          ctx.fillRect(-6, -26, 12, 4);
        } else if (accessory === "headphones") {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -27, 10, Math.PI, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(-11, -28, 3, 8);
          ctx.fillRect(8, -28, 3, 8);
        }

        // ── Companion Pet trailing behind ──
        if (pet !== "none") {
          const petBob = isMoving ? Math.sin(performance.now() * 0.02) * 2 : 0;
          const pX = dir === "left" ? 18 : -18;
          const pY = 2 + petBob;

          ctx.save();
          ctx.translate(pX, pY);
          ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
          ctx.beginPath();
          ctx.ellipse(0, 4, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          if (pet === "dog") {
            ctx.fillStyle = "#d97706";
            ctx.beginPath();
            ctx.roundRect(-6, -6, 12, 8, 3);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(4, -8, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (pet === "cat") {
            ctx.fillStyle = "#71717a";
            ctx.beginPath();
            ctx.roundRect(-5, -5, 10, 7, 3);
            ctx.fill();
            ctx.fillStyle = "#a1a1aa";
            ctx.fillRect(-4, -10, 2, 4);
            ctx.fillRect(2, -10, 2, 4);
          } else if (pet === "drone") {
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(0, -10 + petBob, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 1;
            ctx.strokeRect(-8, -11 + petBob, 16, 2);
          } else if (pet === "duck") {
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(0, -4, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.fillRect(3, -5, 3, 2);
          }
          ctx.restore();
        }

        // Self Indicator Pointer
        if (isSelf) {
          ctx.fillStyle = isGhost ? "#818cf8" : "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(-4, -42);
          ctx.lineTo(4, -42);
          ctx.lineTo(0, -36);
          ctx.closePath();
          ctx.fill();
        }

        // Nameplate Tag
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isSelf ? (isGhost ? "#a5b4fc" : "#38bdf8") : "#ffffff";
        ctx.fillText(isSelf ? `YOU (${av.handle})` : av.handle, 0, -44);

        // Status badge under name
        if (av.statusText) {
          ctx.font = "8px monospace";
          ctx.fillStyle = "#a1a1aa";
          ctx.fillText(av.statusText, 0, -54);
        }

        // Speech Bubble
        const speech = isSelf ? activeSpeech : av.speechBubble?.text;
        if (speech) {
          ctx.save();
          ctx.font = "bold 10px sans-serif";
          const textW = ctx.measureText(speech).width;
          const bW = Math.max(48, textW + 16);
          const bH = 22;
          const bY = -70;

          ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-bW / 2, bY, bW, bH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(speech, 0, bY + 14);
          ctx.restore();
        }

        ctx.restore();
      });

      // ── 7. ATMOSPHERIC PARTICLES OVERLAY ──
      particlesRef.current.forEach((p) => {
        ctx.save();
        if (vibe === "COZY_RAINY") {
          // Rain streaks
          p.y += p.speed;
          p.x += 1.5;
          if (p.y > WORLD_HEIGHT) {
            p.y = 0;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.strokeStyle = `rgba(147, 197, 253, ${p.alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 3, p.y + p.size);
          ctx.stroke();
        } else if (vibe === "SUNSET_LOFI") {
          // Drifting sakura blossom petals
          p.y += p.speed * 0.5;
          p.x += Math.sin(performance.now() * 0.002 + p.y * 0.01) * 1.5;
          if (p.y > WORLD_HEIGHT) {
            p.y = 0;
            p.x = Math.random() * WORLD_WIDTH;
          }
          ctx.fillStyle = `rgba(251, 113, 133, ${p.alpha})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (vibe === "SUNNY_DAYLIGHT") {
          // Gentle drifting sun dust motes
          p.y -= p.speed * 0.2;
          if (p.y < 0) p.y = WORLD_HEIGHT;
          ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Vibe: Warm Amber Fireplace Vignette for Cozy Rainy
      if (vibe === "COZY_RAINY") {
        ctx.save();
        const grad = ctx.createRadialGradient(
          canvasW / 2 + camX,
          canvasH / 2 + camY,
          canvasW * 0.2,
          canvasW / 2 + camX,
          canvasH / 2 + camY,
          canvasW * 0.8
        );
        grad.addColorStop(0, "rgba(0, 0, 0, 0)");
        grad.addColorStop(1, "rgba(249, 115, 22, 0.08)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        ctx.restore();
      }

      ctx.restore(); // End camera transform
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [localAvatar, remoteAvatars, vibe, onMove, onZoneChange, onRugChange, isJoystickActive, activeSpeech]);

  // ── Touch Virtual Joystick Handlers ──
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsJoystickActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      joystickVector.current = {
        x: dx / Math.max(1, dist),
        y: dy / Math.max(1, dist),
      };
    }
  };

  const handleTouchEnd = () => {
    touchStartPos.current = null;
    joystickVector.current = { x: 0, y: 0 };
    setIsJoystickActive(false);
  };

  const isGhost = !!localAvatar.avatarConfig?.isGhost;

  return (
    <div className="relative w-full h-[620px] bg-black rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl select-none">
      {/* 60 FPS HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        width={900}
        height={620}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Floating Interaction Prompt Banner */}
      {nearbyPrompt && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-400 text-amber-300 font-mono text-xs font-bold shadow-xl animate-in fade-in zoom-in-95 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{nearbyPrompt}</span>
        </div>
      )}

      {/* Floating Private Rug Banner */}
      {activeRugPrompt && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-cyan-950/90 backdrop-blur-md px-4 py-1.5 rounded-xl border border-cyan-400 text-cyan-200 font-mono text-[11px] font-bold shadow-xl animate-in fade-in flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activeRugPrompt}</span>
        </div>
      )}

      {/* Ghost Mode HUD Badge & Toggle Button */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <button
          onClick={onToggleGhost}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
            isGhost
              ? "bg-indigo-950/80 border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
              : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
          }`}
          title="Toggle Ghost Mode (Walk through walls)"
        >
          <Ghost className={`w-3.5 h-3.5 ${isGhost ? "animate-pulse text-indigo-400" : ""}`} />
          <span>{isGhost ? "GHOST MODE: ON" : "GHOST [G]"}</span>
        </button>
      </div>

      {/* Floating Chat Bubble Form */}
      <div className="absolute bottom-4 left-4 right-4 max-w-sm z-30">
        <form
          onSubmit={handleSendChat}
          className="flex items-center gap-2 bg-neutral-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-neutral-800 shadow-xl"
        >
          <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message above your avatar..."
            maxLength={60}
            className="w-full bg-transparent text-xs font-mono text-white placeholder-neutral-500 outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-1.5 rounded-xl bg-white text-black font-black hover:bg-neutral-200 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Mobile Touch Virtual Joystick Zone */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="sm:hidden absolute inset-0 z-20 pointer-events-auto"
      >
        {isJoystickActive && (
          <div className="absolute bottom-16 left-8 w-20 h-20 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div
              className="w-8 h-8 rounded-full bg-white shadow-lg transition-transform"
              style={{
                transform: `translate(${joystickVector.current.x * 24}px, ${
                  joystickVector.current.y * 24
                }px)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Top Right Navigation Compass & Controls Legend */}
      <div className="hidden sm:flex absolute top-3 right-3 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-[10px] font-mono text-neutral-400 gap-3 items-center">
        <span>[W, A, S, D] WALK</span>
        <span>[E] INTERACT</span>
        <span>[G] GHOST MODE</span>
        <span>[1-8] PIANO NOTES</span>
      </div>
    </div>
  );
}
