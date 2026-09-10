"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SpaceZoneId,
  SpatialAvatar,
  SPACES_ZONES,
  INTERACTIVE_OBJECTS,
  InteractiveObject,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getZoneAtCoordinates,
  checkCollision,
  getNearbyInteractiveObject,
  DEFAULT_AMBIENT_BOTS,
} from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";
import { useAuth } from "@/app/components/AuthProvider";
import {
  ArrowLeft,
  Users,
  Compass,
  Sparkles,
  Send,
  MessageSquare,
  Smile,
  Info,
  Maximize2,
} from "lucide-react";

interface EchoSpacesWorldProps {
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  onMove: (x: number, y: number, dir: "down" | "up" | "left" | "right", isMoving: boolean) => void;
  onSit: (isSitting: boolean, objectId?: string) => void;
  onSendSpeech: (text: string) => void;
  onSendEmote: (emote: string) => void;
  onZoneChange: (newZone: SpaceZoneId) => void;
  onInteractObject: (obj: InteractiveObject) => void;
}

export default function EchoSpacesWorld({
  localAvatar,
  remoteAvatars,
  onMove,
  onSit,
  onSendSpeech,
  onSendEmote,
  onZoneChange,
  onInteractObject,
}: EchoSpacesWorldProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera tracking
  const cameraRef = useRef<{ x: number; y: number }>({ x: localAvatar.x, y: localAvatar.y });

  // Input states
  const keysPressed = useRef<Record<string, boolean>>({});
  const nearbyObjectRef = useRef<InteractiveObject | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);

  // Chat message input
  const [chatInput, setChatInput] = useState("");
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);

  // Touch virtual joystick state
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // 1. Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      keysPressed.current[e.key.toLowerCase()] = true;

      // Interaction key [E]
      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (nearbyObjectRef.current) {
          handleInteract(nearbyObjectRef.current);
        }
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
  }, []);

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
    const speed = 4.2;

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

        // Collision detection against walls
        if (!checkCollision(nextX, posY)) posX = nextX;
        if (!checkCollision(posX, nextY)) posY = nextY;

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

        // Send throttled position update
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

      // Clear Screen with Outdoor Atrium Backdrop
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Camera Offset Transform
      ctx.save();
      ctx.translate(-camX, -camY);

      // ── 1. MAP FLOORING PATTERNS ──
      // Courtyard Cobblestones
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Render Each Zone Floor & Boundary
      Object.values(SPACES_ZONES).forEach((zone) => {
        const { bounds, id, color } = zone;

        ctx.save();
        if (id === "office") {
          // Warm Parquet Hardwood Floor
          ctx.fillStyle = "#292524";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          // Wood planks lines
          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 1;
          for (let py = bounds.y; py < bounds.y + bounds.h; py += 32) {
            ctx.beginPath();
            ctx.moveTo(bounds.x, py);
            ctx.lineTo(bounds.x + bounds.w, py);
            ctx.stroke();
          }
        } else if (id === "library") {
          // Dark Mahogany & Velvet Purple Rug
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
          // Dark Concert Hall with Neon Stage
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          // Raised Stage Floor (Top 30% of room)
          const stageH = 140;
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(bounds.x + 40, bounds.y + 40, bounds.w - 80, stageH);
          // Neon Stage Border
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

      // ── 2. CENTRAL COURTYARD FOUNTAIN ──
      const fX = 800;
      const fY = 590;
      ctx.save();
      // Outer Stone Basin
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(fX, fY, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rippling Water Pool
      const ripple = Math.sin(performance.now() * 0.005) * 3;
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(fX, fY, 36 + ripple, 0, Math.PI * 2);
      ctx.fill();

      // Fountain Center Spout
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.arc(fX, fY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 3. INTERACTIVE OBJECTS RENDERING ──
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
          // Piano keys preview
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
          // 4 pads
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
          // Mic stand
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

        // Icon badge
        ctx.font = "14px sans-serif";
        ctx.fillText(icon, x + w / 2 - 7, y - 6);

        ctx.restore();
      });

      // ── 4. RENDER ALL AVATARS (Sorted by Y for depth) ──
      const allAvatars = [...remoteAvatars, localAvatar].sort((a, b) => a.y - b.y);

      allAvatars.forEach((av) => {
        const isSelf = av.uid === localAvatar.uid;
        const aX = isSelf ? posX : av.x;
        const aY = isSelf ? posY : av.y;
        const dir = isSelf ? currentDir : av.direction;
        const isSit = isSelf ? localAvatar.isSitting : av.isSitting;

        ctx.save();
        ctx.translate(aX, aY);

        // Ground Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
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

        // Avatar Body / Hoodie
        ctx.fillStyle = av.hoodieColor || "#38bdf8";
        if (isSit) {
          // Sitting torso
          ctx.beginPath();
          ctx.roundRect(-10, -16, 20, 18, 5);
          ctx.fill();
        } else {
          // Standing torso
          ctx.beginPath();
          ctx.roundRect(-11, -22, 22, 22, 6);
          ctx.fill();

          // Animated Walking Legs
          const stride = isSelf && isMoving ? Math.sin(performance.now() * 0.015) * 4 : 0;
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(-8, 0, 6, 8 + stride);
          ctx.fillRect(2, 0, 6, 8 - stride);
        }

        // Head & Hair
        ctx.fillStyle = "#fde047"; // Hair
        ctx.beginPath();
        ctx.arc(0, -26, 10, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = "#fed7aa"; // Skin tone
        ctx.beginPath();
        ctx.arc(0, -24, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Directional eye pupils
        ctx.fillStyle = "#0f172a";
        if (dir === "down") {
          ctx.fillRect(-3, -24, 2, 2);
          ctx.fillRect(2, -24, 2, 2);
        } else if (dir === "up") {
          // Back of head, no eyes
        } else if (dir === "left") {
          ctx.fillRect(-5, -24, 2, 2);
        } else if (dir === "right") {
          ctx.fillRect(3, -24, 2, 2);
        }

        // Self Indicator Pointer
        if (isSelf) {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(-4, -40);
          ctx.lineTo(4, -40);
          ctx.lineTo(0, -34);
          ctx.closePath();
          ctx.fill();
        }

        // Nameplate Tag
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isSelf ? "#38bdf8" : "#ffffff";
        ctx.fillText(isSelf ? `YOU (${av.handle})` : av.handle, 0, -42);

        // Status badge under name
        if (av.statusText) {
          ctx.font = "8px monospace";
          ctx.fillStyle = "#a1a1aa";
          ctx.fillText(av.statusText, 0, -52);
        }

        // Speech Bubble
        const speech = isSelf ? activeSpeech : av.speechBubble?.text;
        if (speech) {
          ctx.save();
          ctx.font = "bold 10px sans-serif";
          const textW = ctx.measureText(speech).width;
          const bW = Math.max(48, textW + 16);
          const bH = 22;
          const bY = -68;

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

      ctx.restore(); // End camera transform
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [localAvatar, remoteAvatars, onMove, onZoneChange, isJoystickActive, activeSpeech]);

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
        <span>[E] INTERACT / SIT</span>
        <span>[1-8] PIANO NOTES</span>
      </div>
    </div>
  );
}
