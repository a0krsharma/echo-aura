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
  SPACE_DOORWAYS,
  SpaceDoorway,
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
  Lock,
  Maximize2,
  Minimize2,
  Compass,
  MapPin,
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
  onTeleport?: (x: number, y: number) => void;
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
  onTeleport,
}: EchoSpacesWorldProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport dimensions
  const [viewportDim, setViewportDim] = useState({ w: 1024, h: 680 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Camera tracking
  const cameraRef = useRef<{ x: number; y: number }>({ x: localAvatar.x, y: localAvatar.y });

  // Click-to-Move / Path Target
  const clickTargetRef = useRef<{ x: number; y: number; time: number } | null>(null);

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

  // Particles: rain, sakura, fireflies, fountain water spray
  const particlesRef = useRef<
    Array<{ x: number; y: number; speed: number; size: number; alpha: number; angle?: number }>
  >([]);

  // Water spray particles for courtyard fountain
  const waterSprayRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>
  >([]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setViewportDim({
        w: Math.max(640, Math.floor(rect.width)),
        h: Math.max(540, Math.floor(rect.height || 680)),
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullscreen]);

  // Initialize atmospheric particles
  useEffect(() => {
    const pts: Array<{ x: number; y: number; speed: number; size: number; alpha: number; angle?: number }> = [];
    const count = vibe === "COZY_RAINY" ? 180 : vibe === "SUNSET_LOFI" ? 60 : 40;
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        speed: vibe === "COZY_RAINY" ? 12 + Math.random() * 8 : 1 + Math.random() * 2,
        size: vibe === "COZY_RAINY" ? 16 + Math.random() * 12 : 3 + Math.random() * 4,
        alpha: 0.25 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = pts;

    // Fountain spray
    const sprays: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }> = [];
    for (let i = 0; i < 30; i++) {
      sprays.push({
        x: 800,
        y: 590,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -Math.random() * 2.5 - 1.5,
        life: Math.random() * 30,
        maxLife: 35,
      });
    }
    waterSprayRef.current = sprays;
  }, [vibe]);

  // 1. Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Cancel click-to-move when user uses keys
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        clickTargetRef.current = null;
      }

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

  // 3. Click-to-Move Handler on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates using camera offset
    const camX = Math.max(0, Math.min(WORLD_WIDTH - viewportDim.w, cameraRef.current.x));
    const camY = Math.max(0, Math.min(WORLD_HEIGHT - viewportDim.h, cameraRef.current.y));
    const worldClickX = Math.max(40, Math.min(WORLD_WIDTH - 40, clickScreenX + camX));
    const worldClickY = Math.max(40, Math.min(WORLD_HEIGHT - 40, clickScreenY + camY));

    // Check if clicked directly on an interactive doorway
    for (const d of SPACE_DOORWAYS) {
      if (
        worldClickX >= d.x - 20 &&
        worldClickX <= d.x + d.w + 20 &&
        worldClickY >= d.y - 20 &&
        worldClickY <= d.y + d.h + 20
      ) {
        spacesSfx.playZoneChime();
        clickTargetRef.current = { x: d.spawnInside.x, y: d.spawnInside.y, time: Date.now() };
        return;
      }
    }

    clickTargetRef.current = { x: worldClickX, y: worldClickY, time: Date.now() };
    spacesSfx.playFootstep();
  };

  // 4. 60 FPS Graphics-Intensive World Engine Loop
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
    const speed = 4.4;

    const isGhostMode = !!localAvatar.avatarConfig?.isGhost;

    const render = () => {
      const canvasW = viewportDim.w;
      const canvasH = viewportDim.h;

      // ── Player Movement Calculation ──
      let dx = 0;
      let dy = 0;

      if (!localAvatar.isSitting) {
        // Keyboard inputs
        if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= 1;
        if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += 1;
        if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= 1;
        if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += 1;

        // Virtual joystick input
        if (isJoystickActive) {
          dx += joystickVector.current.x;
          dy += joystickVector.current.y;
        }

        // Click-to-Move pathfinding glide
        if (clickTargetRef.current && dx === 0 && dy === 0) {
          const targetDist = Math.hypot(clickTargetRef.current.x - posX, clickTargetRef.current.y - posY);
          if (targetDist > 6) {
            const angle = Math.atan2(clickTargetRef.current.y - posY, clickTargetRef.current.x - posX);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
          } else {
            clickTargetRef.current = null;
          }
        }
      }

      const isMoving = Math.hypot(dx, dy) > 0.1;

      if (isMoving) {
        const angle = Math.atan2(dy, dx);
        const nextX = posX + Math.cos(angle) * speed;
        const nextY = posY + Math.sin(angle) * speed;

        if (isGhostMode) {
          posX = Math.max(30, Math.min(WORLD_WIDTH - 30, nextX));
          posY = Math.max(30, Math.min(WORLD_HEIGHT - 30, nextY));
        } else {
          // Smooth sliding collision with 10px radius
          if (!checkCollision(nextX, posY, 10)) posX = nextX;
          if (!checkCollision(posX, nextY, 10)) posY = nextY;
        }

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

      // ── RENDERING PASS ──
      ctx.save();

      // Base Black Canvas Background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Camera Transform
      ctx.save();
      ctx.translate(-camX, -camY);

      // ── 1. MAP FLOORING TEXTURES ──
      // Central Courtyard Pavers with beveled stone grid
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Stone paver grooves
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1;
      for (let px = 0; px < WORLD_WIDTH; px += 36) {
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let py = 0; py < WORLD_HEIGHT; py += 36) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(WORLD_WIDTH, py);
        ctx.stroke();
      }

      // Vibe: Midnight Neon Courtyard Cyan/Magenta Grid
      if (vibe === "MIDNIGHT_NEON") {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
        ctx.lineWidth = 1.2;
        for (let gx = 0; gx < WORLD_WIDTH; gx += 48) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, WORLD_HEIGHT);
          ctx.stroke();
        }
      }

      // ── 2. THEMATIC ROOM FLOORS & INTERIORS ──
      Object.values(SPACES_ZONES).forEach((zone) => {
        const { bounds, id, color } = zone;

        ctx.save();
        if (id === "office") {
          // Warm Parquet Hardwood Floor with individual beveled planks
          ctx.fillStyle = vibe === "SUNNY_DAYLIGHT" ? "#3f3c39" : "#24201e";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
          for (let py = bounds.y; py < bounds.y + bounds.h; py += 28) {
            ctx.beginPath();
            ctx.moveTo(bounds.x, py);
            ctx.lineTo(bounds.x + bounds.w, py);
            ctx.stroke();
          }
        } else if (id === "library") {
          // Rich Mahogany Floor with Regal Purple Velvet Carpet
          ctx.fillStyle = "#16133a";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillStyle = "rgba(168, 85, 247, 0.09)";
          ctx.fillRect(bounds.x + 24, bounds.y + 24, bounds.w - 48, bounds.h - 48);
          // Carpet gold trim
          ctx.strokeStyle = "rgba(250, 204, 21, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bounds.x + 24, bounds.y + 24, bounds.w - 48, bounds.h - 48);
        } else if (id === "music") {
          // Acoustic Soundproof Studio Checkered Floor
          ctx.fillStyle = "#18181b";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillStyle = "rgba(244, 63, 94, 0.07)";
          ctx.fillRect(bounds.x + 20, bounds.y + 20, bounds.w - 40, bounds.h - 40);
        } else if (id === "concert") {
          // Festival Concert Arena with Elevated Spotlight Stage
          ctx.fillStyle = "#0b1329";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          const stageH = 140;
          ctx.fillStyle = "#0369a1";
          ctx.fillRect(bounds.x + 36, bounds.y + 36, bounds.w - 72, stageH);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.strokeRect(bounds.x + 36, bounds.y + 36, bounds.w - 72, stageH);
        } else if (id === "debate") {
          // Town Hall Walnut Courtroom
          ctx.fillStyle = "#111d17";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
          ctx.fillRect(bounds.x + 24, bounds.y + 24, bounds.w - 48, bounds.h - 48);
        }

        // Room Wall Trim & Glowing Perimeter (Except Open Doors)
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        // Room Banner Nameplate
        ctx.fillStyle = color;
        ctx.font = "bold 11px monospace";
        ctx.fillText(`// ${zone.name.toUpperCase()} //`, bounds.x + 24, bounds.y + 28);
        ctx.restore();
      });

      // ── 3. GRAND ARCHWAY DOORWAYS & ENTRANCE PORTALS (Visual Opening Markers) ──
      SPACE_DOORWAYS.forEach((door) => {
        ctx.save();
        // Clear wall line behind doorway to visually OPEN the portal
        ctx.fillStyle = "#18181b";
        ctx.fillRect(door.x - 4, door.y - 4, door.w + 8, door.h + 8);

        // Glowing Doorway Welcome Mat
        const pulse = Math.sin(performance.now() * 0.005) * 0.15 + 0.35;
        ctx.fillStyle = `rgba(56, 189, 248, ${pulse})`;
        ctx.beginPath();
        ctx.roundRect(door.x, door.y, door.w, door.h, 6);
        ctx.fill();

        // Neon Border
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Directional Doorway Chevron Arrows (>>>)
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (door.orientation === "vertical") {
          ctx.fillText("ENTER ➔", door.x + door.w / 2, door.y + door.h / 2);
        } else {
          ctx.fillText("▼ ENTER ▼", door.x + door.w / 2, door.y + door.h / 2);
        }

        ctx.restore();
      });

      // ── 4. PRIVATE CONVERSATION RUGS (High-Definition Persian & Modern Pods) ──
      PRIVATE_RUGS.forEach((rug) => {
        ctx.save();
        const isPlayerOnRug = currentRugId === rug.id;

        // Soft drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.roundRect(rug.x + 4, rug.y + 4, rug.w, rug.h, 14);
        ctx.fill();

        // Rug background
        ctx.fillStyle = isPlayerOnRug ? "rgba(56, 189, 248, 0.24)" : "rgba(30, 41, 59, 0.7)";
        ctx.beginPath();
        ctx.roundRect(rug.x, rug.y, rug.w, rug.h, 14);
        ctx.fill();

        // Glowing stitched border
        ctx.strokeStyle = isPlayerOnRug ? "#38bdf8" : rug.color;
        ctx.lineWidth = isPlayerOnRug ? 3 : 2;
        ctx.setLineDash([8, 5]);
        ctx.stroke();

        // Inner decorative medallion
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(rug.x + 12, rug.y + 12, rug.w - 24, rug.h - 24);

        // Rug Title & Capacity Badge
        ctx.fillStyle = isPlayerOnRug ? "#38bdf8" : rug.color;
        ctx.font = "bold 9px monospace";
        ctx.fillText(`🔒 ${rug.name.toUpperCase()} (${rug.capacity}P)`, rug.x + 16, rug.y + 24);

        ctx.restore();
      });

      // ── 5. CENTRAL COURTYARD FOUNTAIN (Caustics & Splash Particles) ──
      const fX = 800;
      const fY = 590;
      ctx.save();
      // Outer marble basin with radial gradient shadow
      const basinGrad = ctx.createRadialGradient(fX, fY, 30, fX, fY, 48);
      basinGrad.addColorStop(0, "#475569");
      basinGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = basinGrad;
      ctx.beginPath();
      ctx.arc(fX, fY, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Rippling water caustics
      const rippleTime = performance.now() * 0.004;
      const ripple1 = Math.sin(rippleTime) * 4;
      const ripple2 = Math.cos(rippleTime * 1.3) * 3;
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(fX, fY, 38 + ripple1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(224, 242, 254, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fX, fY, 26 + ripple2, 0, Math.PI * 2);
      ctx.stroke();

      // Spouting Fountain Center
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(fX, fY, 9, 0, Math.PI * 2);
      ctx.fill();

      // Water spray particle animation
      waterSprayRef.current.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life += 1;
        if (sp.life > sp.maxLife) {
          sp.x = fX;
          sp.y = fY;
          sp.vx = (Math.random() - 0.5) * 2;
          sp.vy = -Math.random() * 2.8 - 1.2;
          sp.life = 0;
        }
        ctx.fillStyle = `rgba(186, 230, 253, ${1 - sp.life / sp.maxLife})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // ── 6. GRAPHICS-INTENSIVE INTERACTIVE OBJECTS (Lamps, Desks, Screens, Books) ──
      INTERACTIVE_OBJECTS.forEach((obj) => {
        ctx.save();
        const { x, y, w, h, type, name, icon } = obj;

        if (type === "chair") {
          // Ergonomic Rolling Desk Chair with Chrome Star Base
          ctx.fillStyle = "#334155";
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 8);
          ctx.fill();
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 2;
          ctx.stroke();
          // Cushion line
          ctx.fillStyle = "#475569";
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 4);
          ctx.fill();
        } else if (type === "whiteboard") {
          // Team Whiteboard with Dry-Erase Frame
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3.5;
          ctx.strokeRect(x, y, w, h);
          // Header banner
          ctx.fillStyle = "#0284c7";
          ctx.font = "bold 9px monospace";
          ctx.fillText("TEAM SCRATCHPAD", x + 10, y + 24);
          // Colorful sketch lines
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 12, y + 36);
          ctx.lineTo(x + 50, y + 36);
          ctx.stroke();
        } else if (type === "piano") {
          // Grand Acoustic Piano with Black Lacquer & 3D Ivory Keys
          ctx.fillStyle = "#09090b";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, w, h);
          // Piano keys
          ctx.fillStyle = "#ffffff";
          for (let k = 0; k < w - 10; k += 9) {
            ctx.fillRect(x + 5 + k, y + h - 18, 7, 14);
          }
          // Ebony sharps
          ctx.fillStyle = "#000000";
          for (let k = 0; k < w - 18; k += 18) {
            ctx.fillRect(x + 10 + k, y + h - 18, 5, 8);
          }
        } else if (type === "drums") {
          // 4-Pad Drum Sampler with Backlit RGB Pads
          ctx.fillStyle = "#18181b";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          // 4 pads
          const padW = (w - 18) / 2;
          const padH = (h - 18) / 2;
          ctx.fillStyle = "#e11d48";
          ctx.fillRect(x + 6, y + 6, padW, padH);
          ctx.fillStyle = "#06b6d4";
          ctx.fillRect(x + w / 2 + 3, y + 6, padW, padH);
          ctx.fillStyle = "#eab308";
          ctx.fillRect(x + 6, y + h / 2 + 3, padW, padH);
          ctx.fillStyle = "#10b981";
          ctx.fillRect(x + w / 2 + 3, y + h / 2 + 3, padW, padH);
        } else if (type === "podium") {
          // Carved Oak Podium with Goose-Neck Brass Mic
          ctx.fillStyle = "#78350f";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x, y, w, h);
          // Mic stand
          ctx.fillStyle = "#facc15";
          ctx.fillRect(x + w / 2 - 2, y - 14, 4, 14);
        } else if (type === "gavel") {
          // Judge's Bench with Gold Gavel Striking Block
          ctx.fillStyle = "#451a03";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText("JUDGE", x + 12, y + 24);
        } else if (type === "pomodoro") {
          // Tibetan Singing Focus Bell Stand
          ctx.fillStyle = "#4c1d95";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "#c084fc";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.fillText("25M FOCUS", x + 6, y + 28);
        }

        // Floating icon badge above station
        ctx.font = "15px sans-serif";
        ctx.fillText(icon, x + w / 2 - 8, y - 8);
        ctx.restore();
      });

      // ── 7. CLICK-TO-MOVE TARGET PULSE MARKER ──
      if (clickTargetRef.current) {
        ctx.save();
        const pulseElapsed = (Date.now() - clickTargetRef.current.time) * 0.008;
        const targetRadius = (pulseElapsed % 3) * 6 + 6;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(clickTargetRef.current.x, clickTargetRef.current.y, targetRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(clickTargetRef.current.x, clickTargetRef.current.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── 8. PROXIMITY HEARING RADIUS (Dashed 240px circle around player) ──
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(posX, posY, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ── 9. RENDER ALL AVATARS (Depth Sorted by Y) ──
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

        // Ghost Mode ethereal transparency
        if (isGhost) {
          ctx.globalAlpha = 0.5;
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#38bdf8";
        }

        // Realistic Multi-Layer Soft Drop Shadow
        const shadowGrad = ctx.createRadialGradient(0, 8, 2, 0, 8, 16);
        shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.5)");
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 8, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Speaking Ripple Aura
        if (av.isSpeaking) {
          const speakPulse = Math.sin(performance.now() * 0.01) * 4 + 18;
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, -12, speakPulse, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Idle breathing bob
        const breathe = !isMoving ? Math.sin(performance.now() * 0.003) * 1 : 0;

        // Torso & Outfit
        ctx.fillStyle = outfitColor;
        if (isSit) {
          ctx.beginPath();
          ctx.roundRect(-10, -16 + breathe, 20, 18, 5);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-11, -22 + breathe, 22, 22, 6);
          ctx.fill();

          // Walking legs
          const stride = isSelf && isMoving ? Math.sin(performance.now() * 0.016) * 4 : 0;
          ctx.fillStyle = outfit === "suit" ? "#0f172a" : "#1e293b";
          ctx.fillRect(-8, 0, 6, 8 + stride);
          ctx.fillRect(2, 0, 6, 8 - stride);
        }

        // Outfit Accents
        if (outfit === "suit") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-2, -22 + breathe, 4, 6);
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(-1, -16 + breathe, 2, 8);
        } else if (outfit === "bomber") {
          ctx.fillStyle = "#d97706";
          ctx.fillRect(-1, -22 + breathe, 2, 20);
        }

        // Head & Hair
        if (hairStyle !== "bald") {
          ctx.fillStyle = hairColor;
          ctx.beginPath();
          ctx.arc(0, -27 + breathe, 11, 0, Math.PI * 2);
          ctx.fill();
        }

        // Face Skin Tone
        ctx.fillStyle = skinTone;
        ctx.beginPath();
        ctx.arc(0, -24 + breathe, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Hairstyles
        ctx.fillStyle = hairColor;
        if (hairStyle === "spiky") {
          ctx.beginPath();
          ctx.moveTo(-8, -32 + breathe);
          ctx.lineTo(-4, -38 + breathe);
          ctx.lineTo(0, -32 + breathe);
          ctx.lineTo(4, -38 + breathe);
          ctx.lineTo(8, -32 + breathe);
          ctx.fill();
        } else if (hairStyle === "afro") {
          ctx.beginPath();
          ctx.arc(0, -28 + breathe, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = skinTone;
          ctx.beginPath();
          ctx.arc(0, -24 + breathe, 7.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (hairStyle === "beanie") {
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.roundRect(-9, -36 + breathe, 18, 12, 4);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, -38 + breathe, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (hairStyle === "cap") {
          ctx.fillStyle = "#0284c7";
          ctx.beginPath();
          ctx.arc(0, -29 + breathe, 9, Math.PI, Math.PI * 2);
          ctx.fill();
          if (dir === "right") ctx.fillRect(2, -28 + breathe, 12, 3);
          else if (dir === "left") ctx.fillRect(-14, -28 + breathe, 12, 3);
          else ctx.fillRect(-8, -28 + breathe, 16, 3);
        }

        // Directional eye pupils
        ctx.fillStyle = "#0f172a";
        if (dir === "down") {
          ctx.fillRect(-3, -24 + breathe, 2, 2);
          ctx.fillRect(2, -24 + breathe, 2, 2);
        } else if (dir === "left") {
          ctx.fillRect(-5, -24 + breathe, 2, 2);
        } else if (dir === "right") {
          ctx.fillRect(3, -24 + breathe, 2, 2);
        }

        // Accessories
        if (accessory === "glasses") {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-5, -26 + breathe, 4, 3);
          ctx.strokeRect(1, -26 + breathe, 4, 3);
        } else if (accessory === "shades") {
          ctx.fillStyle = "#000000";
          ctx.fillRect(-6, -26 + breathe, 12, 4);
        } else if (accessory === "headphones") {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -27 + breathe, 10, Math.PI, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(-11, -28 + breathe, 3, 8);
          ctx.fillRect(8, -28 + breathe, 3, 8);
        }

        // Companion Pet
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

      // ── 10. DYNAMIC LIGHTING & SHADING PASS (Ray-traced Style Compositing) ──
      ctx.save();
      // Player Lantern Aura
      const playerLight = ctx.createRadialGradient(posX, posY, 10, posX, posY, 140);
      playerLight.addColorStop(0, "rgba(56, 189, 248, 0.12)");
      playerLight.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = playerLight;
      ctx.fillRect(posX - 140, posY - 140, 280, 280);

      // Courtyard Fountain Cyan Glow
      const fountainLight = ctx.createRadialGradient(fX, fY, 20, fX, fY, 180);
      fountainLight.addColorStop(0, "rgba(2, 132, 199, 0.16)");
      fountainLight.addColorStop(1, "rgba(2, 132, 199, 0)");
      ctx.fillStyle = fountainLight;
      ctx.fillRect(fX - 180, fY - 180, 360, 360);

      // Concert Stage Moving Twin Spotlights
      const spotAngle = Math.sin(performance.now() * 0.001) * 0.4;
      ctx.save();
      ctx.translate(800, 690);
      ctx.rotate(spotAngle);
      const spotGrad1 = ctx.createRadialGradient(0, 0, 10, 0, 100, 160);
      spotGrad1.addColorStop(0, "rgba(234, 179, 8, 0.18)");
      spotGrad1.addColorStop(1, "rgba(234, 179, 8, 0)");
      ctx.fillStyle = spotGrad1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-70, 180);
      ctx.lineTo(70, 180);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // ── 11. ATMOSPHERIC PARTICLES OVERLAY ──
      particlesRef.current.forEach((p) => {
        ctx.save();
        if (vibe === "COZY_RAINY") {
          p.y += p.speed;
          p.x += 1.6;
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
          p.y -= p.speed * 0.2;
          if (p.y < 0) p.y = WORLD_HEIGHT;
          ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      ctx.restore(); // End camera transform
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [localAvatar, remoteAvatars, vibe, onMove, onZoneChange, onRugChange, isJoystickActive, activeSpeech, viewportDim]);

  // ── Touch Virtual Joystick Handlers ──
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsJoystickActive(true);
    clickTargetRef.current = null;
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
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl select-none transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen border-none" : "h-[680px]"
      }`}
    >
      {/* 60 FPS High-DPI HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        width={viewportDim.w}
        height={viewportDim.h}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Top Floating Prompt Banner */}
      {nearbyPrompt && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-400 text-amber-300 font-mono text-xs font-bold shadow-2xl animate-in fade-in zoom-in-95 flex items-center gap-2 z-30">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{nearbyPrompt}</span>
        </div>
      )}

      {/* Floating Private Rug Banner */}
      {activeRugPrompt && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-cyan-950/90 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-cyan-400 text-cyan-200 font-mono text-[11px] font-bold shadow-2xl animate-in fade-in flex items-center gap-2 z-30">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activeRugPrompt}</span>
        </div>
      )}

      {/* Top Left: Ghost Mode HUD & Fullscreen Toggle */}
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
          <span>{isGhost ? "GHOST: ON" : "GHOST [G]"}</span>
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-white transition-all cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Top Right: Interactive Fast-Travel Minimap Radar */}
      <div className="hidden sm:block absolute top-3 right-3 z-30 bg-neutral-950/90 backdrop-blur-md p-2.5 rounded-2xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1.5 pb-1 border-b border-neutral-800">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>CAMPUS RADAR</span>
          </span>
          <span className="text-cyan-400">FAST TRAVEL</span>
        </div>

        {/* Scaled Mini-World View (150x112) */}
        <div className="relative w-[150px] h-[112px] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
          {/* Mini-rooms */}
          <button
            onClick={() => onTeleport?.(400, 260)}
            title="Teleport into Office"
            className="absolute top-[4.6%] left-[3.1%] w-[42.5%] h-[40%] bg-cyan-950/50 hover:bg-cyan-900/80 border border-cyan-500/40 rounded text-[7px] font-mono text-cyan-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            OFFICE
          </button>
          <button
            onClick={() => onTeleport?.(1200, 260)}
            title="Teleport into Library"
            className="absolute top-[4.6%] left-[54.3%] w-[42.5%] h-[40%] bg-purple-950/50 hover:bg-purple-900/80 border border-purple-500/40 rounded text-[7px] font-mono text-purple-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            LIBRARY
          </button>
          <button
            onClick={() => onTeleport?.(260, 860)}
            title="Teleport into Music Studio"
            className="absolute top-[54.1%] left-[3.1%] w-[28.7%] h-[41.6%] bg-rose-950/50 hover:bg-rose-900/80 border border-rose-500/40 rounded text-[7px] font-mono text-rose-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            MUSIC
          </button>
          <button
            onClick={() => onTeleport?.(800, 860)}
            title="Teleport into Concert Hall"
            className="absolute top-[54.1%] left-[34.3%] w-[31.2%] h-[41.6%] bg-amber-950/50 hover:bg-amber-900/80 border border-amber-500/40 rounded text-[7px] font-mono text-amber-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            STAGE
          </button>
          <button
            onClick={() => onTeleport?.(1320, 860)}
            title="Teleport into Debate Arena"
            className="absolute top-[54.1%] left-[68.1%] w-[28.7%] h-[41.6%] bg-emerald-950/50 hover:bg-emerald-900/80 border border-emerald-500/40 rounded text-[7px] font-mono text-emerald-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            DEBATE
          </button>

          {/* Central Fountain button */}
          <button
            onClick={() => onTeleport?.(800, 590)}
            title="Teleport into Courtyard Fountain"
            className="absolute top-[45%] left-[46%] w-3 h-3 bg-cyan-400 rounded-full cursor-pointer hover:scale-125 transition-transform"
          />

          {/* Player Blip */}
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-white border border-cyan-400 shadow-[0_0_8px_#38bdf8] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
            style={{
              left: `${(localAvatar.x / WORLD_WIDTH) * 100}%`,
              top: `${(localAvatar.y / WORLD_HEIGHT) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Floating Chat Bubble Form */}
      <div className="absolute bottom-4 left-4 right-4 max-w-sm z-30">
        <form
          onSubmit={handleSendChat}
          className="flex items-center gap-2 bg-neutral-950/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-neutral-800 shadow-2xl"
        >
          <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Say something or click floor to walk..."
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

      {/* Bottom Right Controls Guide */}
      <div className="hidden lg:flex absolute bottom-4 right-4 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-[10px] font-mono text-neutral-400 gap-3 items-center">
        <span>CLICK FLOOR OR [W,A,S,D] TO WALK</span>
        <span>[E] INTERACT</span>
        <span>[G] GHOST MODE</span>
      </div>
    </div>
  );
}
