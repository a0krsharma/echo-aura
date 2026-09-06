"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Shield, Zap, Flame, Trophy } from "lucide-react";

interface CombatBrawlerProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Fighter {
  group: THREE.Group;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  isBlocking: boolean;
  health: number;
  ghostHealth: number;
  superMeter: number; // 0 to 100
  state: "idle" | "punch" | "kick" | "jump" | "block" | "hit" | "super";
  stateTimer: number;
  facing: 1 | -1; // 1 = right, -1 = left
}

interface Spark {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
}

export default function CombatBrawlerGame({
  match,
  currentUid,
  onBack,
}: CombatBrawlerProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Round & Match scores
  const [p1Rounds, setP1Rounds] = useState(0);
  const [p2Rounds, setP2Rounds] = useState(0);
  const [p1Hp, setP1Hp] = useState(100);
  const [p2Hp, setP2Hp] = useState(100);
  const [p1GhostHp, setP1GhostHp] = useState(100);
  const [p2GhostHp, setP2GhostHp] = useState(100);
  const [p1Super, setP1Super] = useState(0);
  const [p2Super, setP2Super] = useState(0);
  const [roundOver, setRoundOver] = useState(false);
  const [matchWinner, setMatchWinner] = useState<"p1" | "p2" | null>(null);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Fighter refs
  const p1Ref = useRef<Fighter | null>(null);
  const p2Ref = useRef<Fighter | null>(null);
  const sparksRef = useRef<Spark[]>([]);

  // Hit-stop freeze frame flag
  const hitStopTimer = useRef<number>(0);

  // Input states
  const inputRef = useRef({
    left: false,
    right: false,
    jump: false,
    block: false,
    punch: false,
    kick: false,
    super: false,
  });

  // Start match
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setP1Rounds(0);
    setP2Rounds(0);
    setMatchWinner(null);
    setInMenu(false);
    resetRound();
  }, []);

  const resetRound = useCallback(() => {
    setRoundOver(false);
    setP1Hp(100);
    setP2Hp(100);
    setP1GhostHp(100);
    setP2GhostHp(100);
    setP1Super(0);
    setP2Super(0);

    if (p1Ref.current) {
      p1Ref.current.x = -4;
      p1Ref.current.y = 0;
      p1Ref.current.vx = 0;
      p1Ref.current.vy = 0;
      p1Ref.current.health = 100;
      p1Ref.current.ghostHealth = 100;
      p1Ref.current.superMeter = 0;
      p1Ref.current.state = "idle";
      p1Ref.current.facing = 1;
    }

    if (p2Ref.current) {
      p2Ref.current.x = 4;
      p2Ref.current.y = 0;
      p2Ref.current.vx = 0;
      p2Ref.current.vy = 0;
      p2Ref.current.health = 100;
      p2Ref.current.ghostHealth = 100;
      p2Ref.current.superMeter = 0;
      p2Ref.current.state = "idle";
      p2Ref.current.facing = -1;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") inputRef.current.left = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") inputRef.current.right = true;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") inputRef.current.jump = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") inputRef.current.block = true;
      if (e.key === "j" || e.key === "J" || e.key === "f" || e.key === "F") triggerPunch();
      if (e.key === "k" || e.key === "K" || e.key === "g" || e.key === "G") triggerKick();
      if (e.key === "l" || e.key === "L" || e.key === "h" || e.key === "H") triggerSuper();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") inputRef.current.left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") inputRef.current.right = false;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") inputRef.current.jump = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") inputRef.current.block = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Combat action triggers
  const triggerPunch = () => {
    const p1 = p1Ref.current;
    if (!p1 || p1.state !== "idle" || roundOver || inMenu) return;
    p1.state = "punch";
    p1.stateTimer = 14;
    arcadeSfx.playWhoosh();
  };

  const triggerKick = () => {
    const p1 = p1Ref.current;
    if (!p1 || p1.state !== "idle" || roundOver || inMenu) return;
    p1.state = "kick";
    p1.stateTimer = 18;
    arcadeSfx.playWhoosh();
  };

  const triggerSuper = () => {
    const p1 = p1Ref.current;
    if (!p1 || p1.state !== "idle" || p1.superMeter < 100 || roundOver || inMenu) return;
    p1.state = "super";
    p1.stateTimer = 35;
    p1.superMeter = 0;
    setP1Super(0);
    arcadeSfx.playMatchSuccess();
  };

  // Build 3D Fighter Character Model
  const createFighterMesh = (color: string) => {
    const group = new THREE.Group();

    // Torso
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.8, 0.8);
    const torsoMat = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 2;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: "#fed7aa" });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.2;
    group.add(head);

    // Cyber Visor
    const visorGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
    const visorMat = new THREE.MeshBasicMaterial({ color: color === "#2563eb" ? "#38bdf8" : "#f43f5e" });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 3.2, 0.35);
    group.add(visor);

    // Arms & Fist
    const armGeo = new THREE.BoxGeometry(0.35, 1.2, 0.35);
    const armL = new THREE.Mesh(armGeo, torsoMat);
    armL.position.set(-0.8, 2.2, 0);
    const armR = new THREE.Mesh(armGeo, torsoMat);
    armR.position.set(0.8, 2.2, 0);
    group.add(armL);
    group.add(armR);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.4, 1.4, 0.4);
    const legL = new THREE.Mesh(legGeo, torsoMat);
    legL.position.set(-0.4, 0.7, 0);
    const legR = new THREE.Mesh(legGeo, torsoMat);
    legR.position.set(0.4, 0.7, 0);
    group.add(legL);
    group.add(legR);

    return group;
  };

  // Three.js Render & Combat Engine
  useEffect(() => {
    if (inMenu) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 380;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#0f172a");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 3, 13);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight("#64748b", 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#f8fafc", 2.0);
    keyLight.position.set(5, 10, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#38bdf8", 1.2);
    rimLight.position.set(-5, 8, -5);
    scene.add(rimLight);

    // Arena Dojo Platform
    const arenaGeo = new THREE.BoxGeometry(22, 1, 6);
    const arenaMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.6 });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.y = -0.5;
    arena.receiveShadow = true;
    scene.add(arena);

    // Neon Stage Edges
    const edgeGeo = new THREE.BoxGeometry(22, 0.1, 0.2);
    const edgeMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });
    const edgeFront = new THREE.Mesh(edgeGeo, edgeMat);
    edgeFront.position.set(0, 0.05, 3);
    scene.add(edgeFront);

    // P1 Mesh (Blue)
    const p1Mesh = createFighterMesh("#2563eb");
    p1Mesh.position.set(-4, 0, 0);
    scene.add(p1Mesh);

    // P2 Mesh (Red)
    const p2Mesh = createFighterMesh("#dc2626");
    p2Mesh.position.set(4, 0, 0);
    p2Mesh.rotation.y = Math.PI;
    scene.add(p2Mesh);

    p1Ref.current = {
      group: p1Mesh,
      x: -4,
      y: 0,
      vx: 0,
      vy: 0,
      isGrounded: true,
      isBlocking: false,
      health: 100,
      ghostHealth: 100,
      superMeter: 0,
      state: "idle",
      stateTimer: 0,
      facing: 1,
    };

    p2Ref.current = {
      group: p2Mesh,
      x: 4,
      y: 0,
      vx: 0,
      vy: 0,
      isGrounded: true,
      isBlocking: false,
      health: 100,
      ghostHealth: 100,
      superMeter: 0,
      state: "idle",
      stateTimer: 0,
      facing: -1,
    };

    let animId: number;
    let botActionTimer = 0;

    // Main 60 FPS Combat Physics Loop
    const loop = () => {
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // 1. 60ms Hit-Stop Freeze Frame
      if (hitStopTimer.current > 0) {
        hitStopTimer.current--;
        renderer.render(scene, camera);
        animId = requestAnimationFrame(loop);
        return;
      }

      if (p1 && p2) {
        // P1 Movement & Gravity
        if (inputRef.current.left && p1.state === "idle") p1.x -= 0.12;
        if (inputRef.current.right && p1.state === "idle") p1.x += 0.12;
        if (inputRef.current.jump && p1.isGrounded && p1.state === "idle") {
          p1.vy = 0.28;
          p1.isGrounded = false;
          arcadeSfx.playWhoosh();
        }

        // Apply Gravity
        p1.y += p1.vy;
        p1.vy -= 0.015;
        if (p1.y <= 0) {
          p1.y = 0;
          p1.vy = 0;
          p1.isGrounded = true;
        }

        p1.isBlocking = inputRef.current.block;
        p1.x = Math.max(-9, Math.min(9, p1.x));
        p1.group.position.set(p1.x, p1.y, 0);

        // P2 Bot AI
        botActionTimer += 0.016;
        if (botActionTimer > 0.4 && p2.state === "idle") {
          botActionTimer = 0;
          const dist = Math.abs(p1.x - p2.x);

          if (dist > 3) {
            // Walk toward player
            p2.x += Math.sign(p1.x - p2.x) * 0.1;
          } else {
            // Attack or Block
            const rand = Math.random();
            if (rand < 0.4) {
              p2.state = "punch";
              p2.stateTimer = 14;
              arcadeSfx.playWhoosh();
            } else if (rand < 0.7) {
              p2.state = "kick";
              p2.stateTimer = 18;
              arcadeSfx.playWhoosh();
            } else {
              p2.isBlocking = true;
              setTimeout(() => {
                if (p2) p2.isBlocking = false;
              }, 400);
            }
          }
        }

        p2.x = Math.max(-9, Math.min(9, p2.x));
        p2.group.position.set(p2.x, p2.y, 0);

        // State Timer Updates & Hitbox Raycasting
        if (p1.stateTimer > 0) {
          p1.stateTimer--;
          if (p1.stateTimer === 8) {
            // Strike frame! Check distance
            const dist = Math.abs(p1.x - p2.x);
            if (dist < 2.5) {
              // Connect hit!
              hitStopTimer.current = 4; // 60ms freeze
              arcadeSfx.playSlap();

              const damage = p1.state === "super" ? 45 : p1.state === "kick" ? 18 : 10;
              const finalDamage = p2.isBlocking ? damage * 0.2 : damage;

              p2.health = Math.max(0, p2.health - finalDamage);
              setP2Hp(p2.health);
              p1.superMeter = Math.min(100, p1.superMeter + 15);
              setP1Super(p1.superMeter);

              // Spawn impact sparks
              for (let i = 0; i < 6; i++) {
                const spGeo = new THREE.SphereGeometry(0.12, 4, 4);
                const spMat = new THREE.MeshBasicMaterial({ color: "#facc15" });
                const sp = new THREE.Mesh(spGeo, spMat);
                sp.position.set(p2.x, p2.y + 2, 0);
                scene.add(sp);
                sparksRef.current.push({
                  mesh: sp,
                  vx: (Math.random() - 0.5) * 0.25,
                  vy: Math.random() * 0.25,
                  life: 15,
                });
              }

              // Check round win
              if (p2.health <= 0) {
                setRoundOver(true);
                setP1Rounds((r) => {
                  const nr = r + 1;
                  if (nr >= 2) {
                    setMatchWinner("p1");
                    arcadeSfx.playVictory();
                    if (currentUid && match?.id) {
                      updateArcadeGameScore(match.id, currentUid, "combat_brawler" as any, 100, true);
                    }
                  }
                  return nr;
                });
              }
            }
          }
          if (p1.stateTimer <= 0) p1.state = "idle";
        }

        // P2 Attacks on P1
        if (p2.stateTimer > 0) {
          p2.stateTimer--;
          if (p2.stateTimer === 8) {
            const dist = Math.abs(p1.x - p2.x);
            if (dist < 2.5) {
              hitStopTimer.current = 4;
              arcadeSfx.playSlap();

              const damage = p2.state === "kick" ? 18 : 10;
              const finalDamage = p1.isBlocking ? damage * 0.2 : damage;

              p1.health = Math.max(0, p1.health - finalDamage);
              setP1Hp(p1.health);
              p2.superMeter = Math.min(100, p2.superMeter + 15);
              setP2Super(p2.superMeter);

              if (p1.health <= 0) {
                setRoundOver(true);
                setP2Rounds((r) => {
                  const nr = r + 1;
                  if (nr >= 2) {
                    setMatchWinner("p2");
                    arcadeSfx.playVictory();
                  }
                  return nr;
                });
              }
            }
          }
          if (p2.stateTimer <= 0) p2.state = "idle";
        }

        // Dynamic 3D Camera Pan & Zoom based on fighter distance
        const midpoint = (p1.x + p2.x) / 2;
        const fighterDist = Math.abs(p1.x - p2.x);
        camera.position.x += (midpoint - camera.position.x) * 0.08;
        camera.position.z += (11 + fighterDist * 0.4 - camera.position.z) * 0.08;
      }

      // Update Sparks
      sparksRef.current = sparksRef.current.filter((sp) => {
        sp.mesh.position.x += sp.vx;
        sp.mesh.position.y += sp.vy;
        sp.life--;
        if (sp.life <= 0) {
          scene.remove(sp.mesh);
          return false;
        }
        return true;
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [inMenu, currentUid, match]);

  // Delayed Ghost Health Bars
  useEffect(() => {
    const timer = setTimeout(() => {
      setP1GhostHp(p1Hp);
      setP2GhostHp(p2Hp);
    }, 400);
    return () => clearTimeout(timer);
  }, [p1Hp, p2Hp]);

  // Hero Graphic
  const brawlerHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-950 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Fist Clash */}
          <circle cx="80" cy="80" r="28" fill="#ef4444" opacity="0.3" />
          <path d="M45,75 Q65,65 80,80 Q65,95 45,85 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <path d="M115,75 Q95,65 80,80 Q95,95 115,85 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
          {/* Impact Sparks */}
          <polygon points="80,60 84,74 98,72 87,82 92,96 80,86 68,96 73,82 62,72 76,74" fill="#fef08a" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Light & Heavy Combos",
      desc: "Tap PUNCH (J) for fast jab chains or KICK (K) for heavy armor-breaking strikes.",
      icon: "🥋",
    },
    {
      title: "Defensive Block",
      desc: "Hold BLOCK (S / Down) to absorb incoming strikes with 80% damage reduction.",
      icon: "🛡️",
    },
    {
      title: "Super Ultimate Finisher",
      desc: "Fill your Super Meter to 100% by landing hits, then unleash your devastating finisher!",
      icon: "🔥",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-red-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="IRON STRIKE 3D"
          subtitle="2.5D Combat Brawler"
          categoryTag="FIGHTING ARENA"
          accentColor="#DC2626"
          objective="Strike, kick, block and unleash super specials! Win 2 out of 3 rounds to become champion!"
          heroGraphic={brawlerHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans">
      {/* Top HUD: Fighter Health Bars & Rounds */}
      <div className="w-full max-w-sm flex flex-col gap-2 pt-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onPointerDown={() => setInMenu(true)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Rounds Won Badges */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1].map((r) => (
                <div
                  key={r}
                  className={`w-3 h-3 rounded-full border border-blue-400 ${
                    p1Rounds > r ? "bg-blue-500 shadow-blue-500 shadow-xs" : "bg-neutral-800"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase text-amber-400">BEST OF 3</span>
            <div className="flex gap-1">
              {[0, 1].map((r) => (
                <div
                  key={r}
                  className={`w-3 h-3 rounded-full border border-red-400 ${
                    p2Rounds > r ? "bg-red-500 shadow-red-500 shadow-xs" : "bg-neutral-800"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="w-6" />
        </div>

        {/* Dual Health Meters */}
        <div className="grid grid-cols-2 gap-3">
          {/* P1 Bar */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] font-bold text-blue-300 uppercase">
              <span>YOU (STRIKER)</span>
              <span>{Math.round(p1Hp)}%</span>
            </div>
            <div className="relative w-full h-3.5 bg-neutral-900 rounded-lg overflow-hidden border border-blue-500/40">
              <div
                className="absolute top-0 left-0 h-full bg-red-400/40 transition-all duration-500"
                style={{ width: `${p1GhostHp}%` }}
              />
              <div
                className="relative h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-100"
                style={{ width: `${p1Hp}%` }}
              />
            </div>
            {/* Super Meter */}
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
                style={{ width: `${p1Super}%` }}
              />
            </div>
          </div>

          {/* P2 Bar */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] font-bold text-red-300 uppercase">
              <span>{playMode === "bot" ? "BOT (BRAWLER)" : "PLAYER 2"}</span>
              <span>{Math.round(p2Hp)}%</span>
            </div>
            <div className="relative w-full h-3.5 bg-neutral-900 rounded-lg overflow-hidden border border-red-500/40 flex justify-end">
              <div
                className="absolute top-0 right-0 h-full bg-red-400/40 transition-all duration-500"
                style={{ width: `${p2GhostHp}%` }}
              />
              <div
                className="relative h-full bg-gradient-to-l from-red-600 to-amber-500 transition-all duration-100"
                style={{ width: `${p2Hp}%` }}
              />
            </div>
            {/* Super Meter */}
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/20 flex justify-end">
              <div
                className="h-full bg-gradient-to-l from-amber-500 to-yellow-300"
                style={{ width: `${p2Super}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3D WebGL Fighting Arena */}
      <div className="relative w-full max-w-sm h-[380px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2">
        <div ref={mountRef} className="w-full h-full" />

        {/* Round Over Banner */}
        {roundOver && !matchWinner && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fadeIn">
            <h3 className="text-3xl font-black text-amber-400 uppercase tracking-tight">K.O.!</h3>
            <button
              type="button"
              onPointerDown={resetRound}
              className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 font-black rounded-xl uppercase tracking-wider text-sm shadow-lg cursor-pointer"
            >
              NEXT ROUND
            </button>
          </div>
        )}

        {/* Match Winner Modal */}
        {matchWinner && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {matchWinner === "p1" ? "CHAMPION!" : "DEFEATED!"}
            </h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">
              Rounds: {p1Rounds} - {p2Rounds}
            </p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-red-600 hover:bg-red-700 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>REMATCH</span>
            </button>
          </div>
        )}
      </div>

      {/* Arcade Fighter Controls */}
      <div className="w-full max-w-sm grid grid-cols-5 gap-2">
        {/* Left */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.left = true;
          }}
          onPointerUp={() => (inputRef.current.left = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer"
        >
          ◄
        </button>

        {/* Right */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.right = true;
          }}
          onPointerUp={() => (inputRef.current.right = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer"
        >
          ►
        </button>

        {/* Punch */}
        <button
          type="button"
          onPointerDown={triggerPunch}
          className="h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-b-4 border-blue-900 rounded-2xl font-black text-sm flex flex-col items-center justify-center text-white cursor-pointer"
        >
          <span className="text-lg">👊</span>
          <span className="text-[9px] uppercase tracking-wider">PUNCH</span>
        </button>

        {/* Kick */}
        <button
          type="button"
          onPointerDown={triggerKick}
          className="h-16 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border-b-4 border-amber-900 rounded-2xl font-black text-sm flex flex-col items-center justify-center text-white cursor-pointer"
        >
          <span className="text-lg">🦶</span>
          <span className="text-[9px] uppercase tracking-wider">KICK</span>
        </button>

        {/* Super Ultimate */}
        <button
          type="button"
          disabled={p1Super < 100}
          onPointerDown={triggerSuper}
          className={`h-16 rounded-2xl border-b-4 flex flex-col items-center justify-center font-black transition-all ${
            p1Super >= 100
              ? "bg-red-600 border-red-900 text-white animate-pulse shadow-lg cursor-pointer"
              : "bg-neutral-800 border-neutral-700 text-neutral-500 opacity-50 cursor-not-allowed"
          }`}
        >
          <Flame className="w-5 h-5 fill-current" />
          <span className="text-[9px] uppercase tracking-wider">ULT</span>
        </button>
      </div>
    </div>
  );
}
