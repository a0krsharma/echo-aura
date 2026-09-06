"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { updateArcadeGameScore, type ArcadeMatch } from "@/lib/arcade";
import { arcadeSfx } from "@/lib/arcadeSfx";
import EchoArcadeModalCard, { type BotDifficulty } from "./EchoArcadeModalCard";
import { ArrowLeft, RotateCcw, Shield, Crosshair, Zap, Trophy, Radio } from "lucide-react";

interface SquadHuntProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost?: boolean;
  onBack?: () => void;
}

interface Projectile {
  mesh: THREE.Mesh;
  vx: number;
  vz: number;
  life: number;
  isRocket?: boolean;
}

interface AlienBug {
  group: THREE.Group;
  health: number;
  maxHealth: number;
  speed: number;
  isBoss?: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export default function SquadHuntGame({
  match,
  currentUid,
  onBack,
}: SquadHuntProps) {
  const [inMenu, setInMenu] = useState(true);
  const [playMode, setPlayMode] = useState<"bot" | "friend">("bot");
  const [botDiff, setBotDiff] = useState<BotDifficulty>("medium");

  // Game state
  const [playerHp, setPlayerHp] = useState(100);
  const [ammo, setAmmo] = useState(40);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [extractionTimer, setExtractionTimer] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [weaponMode, setWeaponMode] = useState<"plasma" | "rocket">("plasma");

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // 3D entities
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const bugsRef = useRef<AlienBug[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const extractionBeaconRef = useRef<THREE.Group | null>(null);

  // Input states
  const inputRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    aimX: 0,
    aimZ: 0,
    shooting: false,
  });

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("echo_squad_hunt_hi");
      if (saved) setHiScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Start new mission
  const startGame = useCallback((mode: "bot" | "friend", diff: BotDifficulty = "medium") => {
    setPlayMode(mode);
    setBotDiff(diff);
    setPlayerHp(100);
    setAmmo(40);
    setScore(0);
    setWave(1);
    setExtractionTimer(60);
    setGameOver(false);
    setVictory(false);
    setWeaponMode("plasma");
    bugsRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    setInMenu(false);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") inputRef.current.up = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") inputRef.current.down = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") inputRef.current.left = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") inputRef.current.right = true;
      if (e.key === " " || e.key === "Enter") inputRef.current.shooting = true;
      if (e.key === "q" || e.key === "Q") {
        setWeaponMode((m) => (m === "plasma" ? "rocket" : "plasma"));
        arcadeSfx.playButtonTap();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") inputRef.current.up = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") inputRef.current.down = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") inputRef.current.left = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") inputRef.current.right = false;
      if (e.key === " " || e.key === "Enter") inputRef.current.shooting = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Extraction countdown
  useEffect(() => {
    if (inMenu || gameOver || victory) return;

    const timer = setInterval(() => {
      setExtractionTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Extraction Dropship arrived!
          setVictory(true);
          arcadeSfx.playVictory();
          if (currentUid && match?.id) {
            updateArcadeGameScore(match.id, currentUid, "squad_hunt" as any, score + 500, true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [inMenu, gameOver, victory, currentUid, match, score]);

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (inMenu) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#090d16");
    scene.fog = new THREE.FogExp2("#090d16", 0.025);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 18, 14);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambient = new THREE.AmbientLight("#475569", 1.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight("#38bdf8", 2.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 4. Ground Grid & Terrain
    const groundGeo = new THREE.PlaneGeometry(60, 60, 20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#1e293b",
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 30, "#38bdf8", "#334155");
    grid.position.y = 0.02;
    scene.add(grid);

    // 5. Player Group (Sci-Fi Commando Soldier)
    const playerGroup = new THREE.Group();
    playerGroupRef.current = playerGroup;

    // Body armor
    const armorGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
    const armorMat = new THREE.MeshStandardMaterial({ color: "#0284c7", metalness: 0.7, roughness: 0.3 });
    const armor = new THREE.Mesh(armorGeo, armorMat);
    armor.position.y = 1;
    armor.castShadow = true;
    playerGroup.add(armor);

    // Helmet with neon visor
    const helmetGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const helmetMat = new THREE.MeshStandardMaterial({ color: "#0f172a" });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 2, 0);
    playerGroup.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.6, 0.2, 0.3);
    const visorMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2, 0.4);
    playerGroup.add(visor);

    // Gun
    const gunGeo = new THREE.BoxGeometry(0.2, 0.3, 1.2);
    const gunMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.9, roughness: 0.1 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.6, 1.1, 0.6);
    playerGroup.add(gun);

    scene.add(playerGroup);

    // 6. Extraction Beacon Ring
    const beaconGroup = new THREE.Group();
    extractionBeaconRef.current = beaconGroup;
    beaconGroup.position.set(0, 0.05, 0);

    const ringGeo = new THREE.RingGeometry(2.5, 3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#10b981", side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    beaconGroup.add(ring);

    const pillarGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    const pillarMat = new THREE.MeshBasicMaterial({ color: "#10b981", transparent: true, opacity: 0.4 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 4;
    beaconGroup.add(pillar);

    scene.add(beaconGroup);

    // Spawn Alien Bug Helper
    const spawnBug = (isBoss = false) => {
      const bugGroup = new THREE.Group();
      const scale = isBoss ? 2.5 : 1;

      // Bug Carapace
      const bodyGeo = new THREE.SphereGeometry(0.7 * scale, 12, 12);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isBoss ? "#dc2626" : "#eab308",
        roughness: 0.4,
        metalness: 0.3,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7 * scale;
      bugGroup.add(body);

      // Glowing Eyes
      const eyeGeo = new THREE.SphereGeometry(0.15 * scale, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: "#ef4444" });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.3 * scale, 0.8 * scale, 0.6 * scale);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.3 * scale;
      bugGroup.add(eyeL);
      bugGroup.add(eyeR);

      // Random perimeter spawn
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 5;
      bugGroup.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

      scene.add(bugGroup);

      bugsRef.current.push({
        group: bugGroup,
        health: isBoss ? 450 : 35,
        maxHealth: isBoss ? 450 : 35,
        speed: isBoss ? 0.045 : 0.065 + Math.random() * 0.02,
        isBoss,
      });
    };

    // Initial bug horde
    for (let i = 0; i < 6; i++) spawnBug(false);

    let bugSpawnTimer = 0;
    let lastShotTime = 0;
    let animId: number;

    // Main 60 FPS Render Loop
    const loop = () => {
      const dt = 0.016;

      // 1. Move Player
      if (playerGroupRef.current) {
        const speed = 0.16;
        let mx = 0;
        let mz = 0;
        if (inputRef.current.left) mx -= 1;
        if (inputRef.current.right) mx += 1;
        if (inputRef.current.up) mz -= 1;
        if (inputRef.current.down) mz += 1;

        if (mx !== 0 || mz !== 0) {
          const len = Math.hypot(mx, mz);
          playerGroup.position.x += (mx / len) * speed;
          playerGroup.position.z += (mz / len) * speed;

          // Face movement or aim direction
          const angle = Math.atan2(mx, mz);
          playerGroup.rotation.y = angle;
        }

        // Camera follow smoothly
        camera.position.x += (playerGroup.position.x - camera.position.x) * 0.08;
        camera.position.z += (playerGroup.position.z + 14 - camera.position.z) * 0.08;
      }

      // 2. Player Shooting
      if (inputRef.current.shooting && Date.now() - lastShotTime > 160) {
        lastShotTime = Date.now();
        arcadeSfx.playButtonTap();

        const projGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const projMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });
        const projMesh = new THREE.Mesh(projGeo, projMat);
        projMesh.position.copy(playerGroup.position);
        projMesh.position.y = 1.1;

        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
        scene.add(projMesh);

        projectilesRef.current.push({
          mesh: projMesh,
          vx: forward.x * 0.8,
          vz: forward.z * 0.8,
          life: 45,
          isRocket: weaponMode === "rocket",
        });
      }

      // 3. Update Projectiles
      projectilesRef.current = projectilesRef.current.filter((p) => {
        p.mesh.position.x += p.vx;
        p.mesh.position.z += p.vz;
        p.life--;

        // Check bug hits
        let hit = false;
        for (const bug of bugsRef.current) {
          const dist = bug.group.position.distanceTo(p.mesh.position);
          const hitRadius = bug.isBoss ? 2.5 : 1.2;

          if (dist < hitRadius) {
            hit = true;
            bug.health -= p.isRocket ? 80 : 25;
            arcadeSfx.playKnifeStick();

            // Spawn impact sparks
            for (let i = 0; i < 4; i++) {
              const sparkGeo = new THREE.SphereGeometry(0.1, 4, 4);
              const sparkMat = new THREE.MeshBasicMaterial({ color: "#facc15" });
              const spark = new THREE.Mesh(sparkGeo, sparkMat);
              spark.position.copy(p.mesh.position);
              scene.add(spark);

              particlesRef.current.push({
                mesh: spark,
                vx: (Math.random() - 0.5) * 0.3,
                vy: Math.random() * 0.3,
                vz: (Math.random() - 0.5) * 0.3,
                life: 20,
              });
            }
            break;
          }
        }

        if (hit || p.life <= 0) {
          scene.remove(p.mesh);
          return false;
        }
        return true;
      });

      // 4. Update Alien Bugs
      bugSpawnTimer += dt;
      if (bugSpawnTimer > 3.5 && bugsRef.current.length < 14) {
        bugSpawnTimer = 0;
        spawnBug(Math.random() < 0.2); // 20% chance of Titan Boss
      }

      bugsRef.current = bugsRef.current.filter((bug) => {
        if (bug.health <= 0) {
          arcadeSfx.playCarBump();
          scene.remove(bug.group);
          setScore((s) => s + (bug.isBoss ? 150 : 30));
          return false;
        }

        // Swarm toward player
        const dx = playerGroup.position.x - bug.group.position.x;
        const dz = playerGroup.position.z - bug.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.5) {
          bug.group.position.x += (dx / dist) * bug.speed;
          bug.group.position.z += (dz / dist) * bug.speed;
          bug.group.rotation.y = Math.atan2(dx, dz);
        }

        // Bite Player
        if (dist < 1.4) {
          arcadeSfx.playSlap();
          setPlayerHp((hp) => {
            const next = Math.max(0, hp - (bug.isBoss ? 2.5 : 0.8));
            if (next <= 0) {
              setGameOver(true);
              arcadeSfx.playPenaltyBuzz();
            }
            return next;
          });
        }

        return true;
      });

      // 5. Update Particles
      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.mesh.position.x += pt.vx;
        pt.mesh.position.y += pt.vy;
        pt.mesh.position.z += pt.vz;
        pt.vy -= 0.015; // gravity
        pt.life--;

        if (pt.life <= 0) {
          scene.remove(pt.mesh);
          return false;
        }
        return true;
      });

      // Rotate Extraction Beacon
      if (extractionBeaconRef.current) {
        extractionBeaconRef.current.rotation.y += 0.02;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [inMenu, weaponMode]);

  // Hero Graphic
  const squadHero = (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-sky-950 rounded-2xl flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {/* Cyber Armor Soldier */}
          <polygon points="80,25 95,50 65,50" fill="#38bdf8" />
          <circle cx="80" cy="65" r="22" fill="#0284c7" stroke="#38bdf8" strokeWidth="3" />
          <rect x="70" y="60" width="20" height="8" rx="3" fill="#f8fafc" />
          {/* Shoulder Guards */}
          <rect x="42" y="75" width="76" height="35" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
          {/* Plasma Gun */}
          <rect x="105" y="60" width="25" height="40" rx="4" fill="#64748b" />
          <line x1="117" y1="60" x2="117" y2="20" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="117" cy="15" r="6" fill="#fef08a" />
        </svg>
      </div>
    </div>
  );

  const howToPlaySteps = [
    {
      title: "Survive the Alien Swarm",
      desc: "Move with WASD / on-screen pads and fire plasma rifle bursts into oncoming arachnid bugs.",
      icon: "🪖",
    },
    {
      title: "Eliminate Titan Bosses",
      desc: "Switch to Heavy Rockets (`Q` or toggle) to pierce armored Titan carapaces.",
      icon: "🚀",
    },
    {
      title: "Hold for Extraction",
      desc: "Survive until the 60-second beacon dropship arrives to extract your squad!",
      icon: "🛸",
    },
  ];

  if (inMenu) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-b from-sky-950 via-neutral-950 to-neutral-900">
        <EchoArcadeModalCard
          title="SQUAD HUNT"
          subtitle="Alien Swarm Extraction"
          categoryTag="CO-OP HORDE 3D"
          accentColor="#0288D1"
          objective="Survive alien bug swarms with plasma artillery! Hold out until dropship extraction arrives!"
          heroGraphic={squadHero}
          howToPlaySteps={howToPlaySteps}
          onPlayFriend={() => startGame("friend")}
          onPlayBot={(diff) => startGame("bot", diff)}
          onBack={onBack || (() => window.history.back())}
          hiScore={hiScore}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-between p-4 select-none touch-none bg-neutral-950 text-white font-sans">
      {/* Top HUD */}
      <div className="w-full max-w-sm flex items-center justify-between px-2 pt-2">
        <button
          type="button"
          onPointerDown={() => setInMenu(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-neutral-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Health Bar */}
        <div className="flex flex-col items-center w-32">
          <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-white/20">
            <div
              className={`h-full transition-all duration-150 ${
                playerHp > 50 ? "bg-emerald-500" : playerHp > 25 ? "bg-amber-500" : "bg-red-500 animate-pulse"
              }`}
              style={{ width: `${playerHp}%` }}
            />
          </div>
          <span className="text-[10px] font-black uppercase text-neutral-400 mt-0.5">HP: {Math.round(playerHp)}%</span>
        </div>

        {/* Extraction Countdown */}
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>{extractionTimer}s</span>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative w-full max-w-sm h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/15 my-2">
        <div ref={mountRef} className="w-full h-full" />

        {/* Victory Screen */}
        {victory && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-2">
              🛸
            </div>
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-tight">SQUAD EXTRACTED!</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Horde survived and mission complete!</p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] py-3.5 bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>DEPLOY AGAIN</span>
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-40 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl mb-2">
              💀
            </div>
            <h2 className="text-3xl font-black text-red-500 uppercase tracking-tight">SQUAD WIPED OUT</h2>
            <p className="text-sm font-bold text-neutral-400 mt-1">Overrun by alien arachnids!</p>
            <div className="text-2xl font-black text-amber-400 my-3">Score: {score}</div>

            <button
              type="button"
              onPointerDown={() => startGame(playMode, botDiff)}
              className="w-full max-w-[220px] py-3.5 bg-red-500 hover:bg-red-600 border-b-4 border-red-700 active:border-b-0 active:translate-y-1 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>RETRY MISSION</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls & Weapon Switcher */}
      <div className="w-full max-w-sm grid grid-cols-4 gap-2">
        {/* Weapon Toggle */}
        <button
          type="button"
          onPointerDown={() => {
            setWeaponMode((m) => (m === "plasma" ? "rocket" : "plasma"));
            arcadeSfx.playButtonTap();
          }}
          className={`h-16 rounded-2xl border-b-4 flex flex-col items-center justify-center font-black cursor-pointer ${
            weaponMode === "plasma"
              ? "bg-sky-600 border-sky-800 text-white"
              : "bg-amber-600 border-amber-800 text-white"
          }`}
        >
          <span className="text-lg">{weaponMode === "plasma" ? "⚡" : "🚀"}</span>
          <span className="text-[9px] uppercase tracking-wider">{weaponMode}</span>
        </button>

        {/* Move Left */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.left = true;
            arcadeSfx.playButtonTap();
          }}
          onPointerUp={() => (inputRef.current.left = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer"
        >
          ◄
        </button>

        {/* Fire Trigger */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.shooting = true;
          }}
          onPointerUp={() => {
            inputRef.current.shooting = false;
          }}
          className="h-16 bg-red-600 hover:bg-red-700 active:bg-red-800 border-b-4 border-red-900 rounded-2xl font-black text-lg flex flex-col items-center justify-center text-white cursor-pointer"
        >
          <Crosshair className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-black">FIRE</span>
        </button>

        {/* Move Right */}
        <button
          type="button"
          onPointerDown={() => {
            inputRef.current.right = true;
            arcadeSfx.playButtonTap();
          }}
          onPointerUp={() => (inputRef.current.right = false)}
          className="h-16 bg-neutral-800 active:bg-neutral-700 border border-neutral-600 rounded-2xl font-black text-xl flex items-center justify-center cursor-pointer"
        >
          ►
        </button>
      </div>
    </div>
  );
}
