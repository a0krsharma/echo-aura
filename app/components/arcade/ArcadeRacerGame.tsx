"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Zap, Trophy, Flag, Shield } from "lucide-react";

interface ArcadeRacerProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface RacerCar {
  group: THREE.Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  speed: number;
  isDrifting: boolean;
  lap: number;
  distanceAlongTrack: number;
  isBot?: boolean;
  color: string;
}

interface BoostPad {
  mesh: THREE.Mesh;
  x: number;
  z: number;
}

interface MysteryBox {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  active: boolean;
}

export default function ArcadeRacerGame({
  match,
  currentUid,
  onBack,
}: ArcadeRacerProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Race stats
  const [lap, setLap] = useState(1);
  const [position, setPosition] = useState(1);
  const [speedMph, setSpeedMph] = useState(0);
  const [currentPowerup, setCurrentPowerup] = useState<"nitro" | "shield" | null>(null);
  const [raceOver, setRaceOver] = useState(false);
  const [finalRank, setFinalRank] = useState<number>(1);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // 3D Objects
  const playerCarRef = useRef<RacerCar | null>(null);
  const aiCarsRef = useRef<RacerCar[]>([]);
  const boostPadsRef = useRef<BoostPad[]>([]);
  const mysteryBoxesRef = useRef<MysteryBox[]>([]);

  // Input states
  const inputRef = useRef({
    gas: false,
    brake: false,
    left: false,
    right: false,
    drift: false,
  });

  // Start Race
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setLap(1);
    setPosition(1);
    setSpeedMph(0);
    setCurrentPowerup(null);
    setRaceOver(false);
    aiCarsRef.current = [];
    boostPadsRef.current = [];
    mysteryBoxesRef.current = [];
    setInMenu(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") inputRef.current.gas = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") inputRef.current.brake = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") inputRef.current.left = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") inputRef.current.right = true;
      if (e.key === "Shift" || e.key === " ") inputRef.current.drift = true;
      if (e.key === "e" || e.key === "E") triggerPowerup();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") inputRef.current.gas = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") inputRef.current.brake = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") inputRef.current.left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") inputRef.current.right = false;
      if (e.key === "Shift" || e.key === " ") inputRef.current.drift = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Use current powerup
  const triggerPowerup = () => {
    if (!currentPowerup) return;
    if (currentPowerup === "nitro") {
      arcadeSfx.playWhoosh();
      if (playerCarRef.current) playerCarRef.current.speed = 1.35;
    }
    setCurrentPowerup(null);
  };

  // Build 3D Kart Vehicle Model
  const createCarMesh = (color: string) => {
    const group = new THREE.Group();

    // Chassis
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.6, 2.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.8, 0.1, 0.5);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: "#0f172a" });
    const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
    spoiler.position.set(0, 1.1, -1.2);
    group.add(spoiler);

    // Wheels (4)
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.9 });
    const positions = [
      [-0.9, 0.35, 0.9],
      [0.9, 0.35, 0.9],
      [-0.9, 0.35, -0.9],
      [0.9, 0.35, -0.9],
    ];
    positions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });

    return group;
  };

  // Three.js Render & Circuit Physics
  useEffect(() => {
    if (inMenu) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#38bdf8"); // Sunny sky
    scene.fog = new THREE.FogExp2("#38bdf8", 0.015);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Sunlight
    const sun = new THREE.DirectionalLight("#fef08a", 2.2);
    sun.position.set(20, 40, 20);
    sun.castShadow = true;
    scene.add(sun);

    const amb = new THREE.AmbientLight("#e0f2fe", 1.2);
    scene.add(amb);

    // Grass Landscape
    const landscapeGeo = new THREE.PlaneGeometry(300, 300);
    const landscapeMat = new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.9 });
    const landscape = new THREE.Mesh(landscapeGeo, landscapeMat);
    landscape.rotation.x = -Math.PI / 2;
    landscape.receiveShadow = true;
    scene.add(landscape);

    // Grand Prix Winding Track Curve Points (Closed Loop)
    const trackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(30, 0.1, -10),
      new THREE.Vector3(60, 0.1, 30),
      new THREE.Vector3(40, 0.1, 70),
      new THREE.Vector3(-20, 0.1, 80),
      new THREE.Vector3(-50, 0.1, 40),
      new THREE.Vector3(-30, 0.1, -20),
    ], true);

    // Extrude Track Ribbon
    const trackPoints = trackCurve.getPoints(100);
    const trackShape = new THREE.Shape();
    trackShape.moveTo(-5, 0);
    trackShape.lineTo(5, 0);
    trackShape.lineTo(5, 0.1);
    trackShape.lineTo(-5, 0.1);

    const trackGeo = new THREE.TubeGeometry(trackCurve, 120, 4, 8, true);
    const trackMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.scale.set(1, 0.05, 1);
    track.position.y = 0.02;
    scene.add(track);

    // Finish Line Arch
    const archGeo = new THREE.BoxGeometry(10, 5, 1);
    const archMat = new THREE.MeshStandardMaterial({ color: "#f8fafc" });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 2.5, 0);
    scene.add(arch);

    // Player Kart (Red)
    const playerMesh = createCarMesh("#ef4444");
    playerMesh.position.set(0, 0, 2);
    scene.add(playerMesh);

    playerCarRef.current = {
      group: playerMesh,
      x: 0,
      z: 2,
      vx: 0,
      vz: 0,
      angle: 0,
      speed: 0,
      isDrifting: false,
      lap: 1,
      distanceAlongTrack: 0,
      color: "#ef4444",
    };

    // 3 AI Opponent Karts
    const aiColors = ["#3b82f6", "#eab308", "#10b981"];
    aiCarsRef.current = aiColors.map((col, idx) => {
      const mesh = createCarMesh(col);
      mesh.position.set((idx - 1) * 2, 0, -2 - idx * 2);
      scene.add(mesh);
      return {
        group: mesh,
        x: (idx - 1) * 2,
        z: -2 - idx * 2,
        vx: 0,
        vz: 0,
        angle: 0,
        speed: 0.35 + Math.random() * 0.1,
        isDrifting: false,
        lap: 1,
        distanceAlongTrack: 0,
        isBot: true,
        color: col,
      };
    });

    // Mystery Crates (3 on track)
    const crateGeo = new THREE.BoxGeometry(1, 1, 1);
    const crateMat = new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.8 });
    const cratePoints = [
      new THREE.Vector3(30, 0.6, -10),
      new THREE.Vector3(40, 0.6, 70),
      new THREE.Vector3(-40, 0.6, 40),
    ];
    mysteryBoxesRef.current = cratePoints.map((cp) => {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.copy(cp);
      scene.add(crate);
      return { mesh: crate, x: cp.x, z: cp.z, active: true };
    });

    let animId: number;

    // 60 FPS Racing Physics Loop
    const loop = () => {
      const player = playerCarRef.current;
      if (!player) return;

      // 1. Vehicle Acceleration & Drift Physics
      if (inputRef.current.gas) {
        player.speed = Math.min(0.85, player.speed + 0.015);
      } else if (inputRef.current.brake) {
        player.speed = Math.max(-0.25, player.speed - 0.02);
      } else {
        player.speed *= 0.98; // rolling friction
      }

      // Steering
      const steerFactor = player.isDrifting ? 0.07 : 0.045;
      if (inputRef.current.left) player.angle += steerFactor;
      if (inputRef.current.right) player.angle -= steerFactor;

      player.isDrifting = inputRef.current.drift && Math.abs(player.speed) > 0.3;

      // Position update
      player.vx = Math.sin(player.angle) * player.speed;
      player.vz = Math.cos(player.angle) * player.speed;
      player.x += player.vx;
      player.z += player.vz;

      player.group.position.set(player.x, 0, player.z);
      player.group.rotation.y = player.angle + (player.isDrifting ? (inputRef.current.left ? 0.2 : -0.2) : 0);

      // MPH readout
      setSpeedMph(Math.round(Math.abs(player.speed) * 120));

      // 2. Third-Person Chase Camera
      const camOffset = new THREE.Vector3(
        -Math.sin(player.angle) * 7,
        3.5,
        -Math.cos(player.angle) * 7
      );
      camera.position.x += (player.x + camOffset.x - camera.position.x) * 0.12;
      camera.position.y += (camOffset.y - camera.position.y) * 0.12;
      camera.position.z += (player.z + camOffset.z - camera.position.z) * 0.12;
      camera.lookAt(player.x, 1, player.z);

      // 3. Update AI Racers
      aiCarsRef.current.forEach((ai) => {
        ai.distanceAlongTrack = (ai.distanceAlongTrack + ai.speed * 0.001) % 1;
        const pt = trackCurve.getPointAt(ai.distanceAlongTrack);
        const tangent = trackCurve.getTangentAt(ai.distanceAlongTrack);

        ai.x = pt.x;
        ai.z = pt.z;
        ai.group.position.set(ai.x, 0, ai.z);
        ai.group.rotation.y = Math.atan2(tangent.x, tangent.z);
      });

      // 4. Mystery Box Pickup Collisions
      mysteryBoxesRef.current.forEach((box) => {
        if (box.active) {
          box.mesh.rotation.y += 0.03;
          const dist = Math.hypot(player.x - box.x, player.z - box.z);
          if (dist < 2.5) {
            box.active = false;
            box.mesh.visible = false;
            arcadeSfx.playMatchSuccess();
            setCurrentPowerup(Math.random() < 0.6 ? "nitro" : "shield");

            setTimeout(() => {
              box.active = true;
              box.mesh.visible = true;
            }, 5000);
          }
        }
      });

      // 5. Lap Completion Check (crossing z=0 near x=0)
      if (Math.abs(player.x) < 6 && player.z > 0 && player.z < 2 && player.speed > 0) {
        if (player.distanceAlongTrack > 50) {
          player.distanceAlongTrack = 0;
          setLap((l) => {
            const nl = l + 1;
            if (nl > 3) {
              setRaceOver(true);
              setFinalRank(1);
              arcadeSfx.playVictory();
              if (currentUid && match?.id) {
                updateArcadeGameScore(match.id, currentUid, "arcade_racer" as any, 300, true);
              }
            }
            return nl;
          });
        }
      }
      player.distanceAlongTrack += Math.abs(player.speed);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [inMenu, currentUid, match]);

  // Hero Graphic
  const racerHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-sky-950 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Race Track */}
          <ellipse cx="80" cy="85" rx="65" ry="40" fill="#334155" stroke="#f8fafc" strokeWidth="3" />
          <ellipse cx="80" cy="85" rx="35" ry="20" fill="#22c55e" />

          {/* Red Race Kart */}
          <g transform="translate(80, 115)">
            <rect x="-16" y="-10" width="32" height="20" rx="5" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            <circle cx="-16" cy="-8" r="4" fill="#0f172a" />
            <circle cx="16" cy="-8" r="4" fill="#0f172a" />
            <circle cx="-16" cy="8" r="4" fill="#0f172a" />
            <circle cx="16" cy="8" r="4" fill="#0f172a" />
            {/* Spoiler */}
            <rect x="-18" y="10" width="36" height="3" fill="#0f172a" />
          </g>
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Steer & Accelerate",
      desc: "Hold GAS to drive forward. Steer left or right to take sharp banked corners.",
      icon: "🏎️",
    },
    {
      title: "Power Slide Drifting",
      desc: "Hold DRIFT around corners to maintain maximum speed through tight chicanes!",
      icon: "⚡",
    },
    {
      title: "Mystery Crates & 3 Laps",
      desc: "Drive through yellow crates for Turbo Nitro boosts. Finish 3 laps in 1st place to win!",
      icon: "🏆",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-sky-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="HYPER DRIFT 3D"
          subtitle="Circuit Arcade Racer"
          categoryTag="3D RACING"
          accentColor="#0288D1"
          objective="Power slide around banked circuit turns, collect Nitro crates, and cross the finish line in 1st place!"
          heroGraphic={racerHero}
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
      {/* Top HUD: Position, Lap, Speed */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Position Badge */}
        <div className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1 rounded-xl border border-white/15">
          <span className="text-xl font-black text-amber-400">1st</span>
          <span className="text-[10px] uppercase font-bold text-neutral-400">/ 4</span>
        </div>

        {/* Lap Badge */}
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
          <Flag className="w-3.5 h-3.5" />
          <span>LAP {Math.min(3, lap)}/3</span>
        </div>

        {/* Speedometer */}
        <div className="text-right">
          <div className="text-lg font-black text-cyan-400">{speedMph}</div>
          <div className="text-[9px] uppercase font-bold text-neutral-400">MPH</div>
        </div>
      </div>

      {/* 3D WebGL Track Viewport */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2">
        <div ref={mountRef} className="w-full h-full" />

        {/* Powerup Overlay Badge */}
        {currentPowerup && (
          <div className="absolute top-3 left-3 bg-amber-500 text-neutral-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-bounce shadow-lg flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>NITRO READY! (TAP BOOST)</span>
          </div>
        )}

        {/* Race Over Modal */}
        {raceOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">VICTORY!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">You finished 1st in the Grand Prix!</p>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>RACE AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* On-Screen Touch Controls */}
      <div className="w-full max-w-sm grid grid-cols-4 gap-2">
        {/* Steer Left */}
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

        {/* Steer Right */}
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

        {/* Drift / Nitro */}
        <button
          type="button"
          onPointerDown={() => {
            if (currentPowerup) triggerPowerup();
            inputRef.current.drift = true;
          }}
          onPointerUp={() => (inputRef.current.drift = false)}
          className="h-16 bg-amber-600 hover:bg-amber-700 border-b-4 border-amber-900 rounded-2xl font-black text-sm flex flex-col items-center justify-center text-white cursor-pointer"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider">DRIFT / NITRO</span>
        </button>

        {/* Gas */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.gas = true;
          }}
          onPointerUp={() => (inputRef.current.gas = false)}
          className="h-16 bg-emerald-600 hover:bg-emerald-700 border-b-4 border-emerald-900 rounded-2xl font-black text-sm flex flex-col items-center justify-center text-white cursor-pointer"
        >
          <span className="text-xl">🚀</span>
          <span className="text-[9px] uppercase tracking-wider font-black">GAS</span>
        </button>
      </div>
    </div>
  );
}
