"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { soundSynth } from "@/lib/soundSynthesizer";

export type RoboEmotion = "happy" | "dizzy" | "savage" | "poetic" | "mimic" | "brainstorm";

export interface RoboEchoProps {
  emotion: RoboEmotion;
  isTalking?: boolean;
  audioAnalyser?: AnalyserNode | null;
  onPokeZone?: (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => void;
  characterName?: string;
  energyVolts?: number;
}

export default function RoboEcho3DCanvas({
  emotion,
  isTalking = false,
  audioAnalyser = null,
  onPokeZone,
  characterName = "ECHO-BOT // 01",
  energyVolts = 100,
}: RoboEchoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const reqIdRef = useRef<number | null>(null);

  // 3D Objects refs for animation
  const droidGroupRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);
  const mouthMeshRef = useRef<THREE.Mesh | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const antennaLightRef = useRef<THREE.PointLight | null>(null);
  const eyeLeftMeshRef = useRef<THREE.Mesh | null>(null);
  const eyeRightMeshRef = useRef<THREE.Mesh | null>(null);
  const thrusterMeshRef = useRef<THREE.Mesh | null>(null);
  const antennaTipRef = useRef<THREE.Mesh | null>(null);

  // Interactive state
  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const recoilRef = useRef({ val: 0, spinY: 0, jumpY: 0 });
  const audioDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(64) as any);
  const [interactiveNotice, setInteractiveNotice] = useState<string | null>(null);

  // Get Primary Color for Emotion
  const getEmotionColor = useCallback((emo: RoboEmotion) => {
    switch (emo) {
      case "dizzy":
        return 0xfacc15; // Bright Yellow
      case "savage":
        return 0xef4444; // Crimson Red
      case "poetic":
        return 0xc084fc; // Neon Violet / Purple
      case "mimic":
        return 0xf59e0b; // Amber / Golden Talking Tom
      case "brainstorm":
        return 0x06b6d4; // Cyan Electric
      default:
        return 0x10b981; // Emerald Cyber
    }
  }, []);

  // Update Eye Texture on Canvas
  const updateEyeGeometry = useCallback((mesh: THREE.Mesh | null, emo: RoboEmotion, isLeft: boolean) => {
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(getEmotionColor(emo));

    // Dynamic eye scaling based on expression
    if (emo === "dizzy") {
      mesh.scale.set(1.4, 0.4, 1);
      mesh.rotation.z = isLeft ? 0.3 : -0.3;
    } else if (emo === "savage") {
      mesh.scale.set(1.3, 0.5, 1);
      mesh.rotation.z = isLeft ? -0.4 : 0.4;
    } else if (emo === "poetic") {
      mesh.scale.set(1.1, 1.2, 1);
      mesh.rotation.z = 0;
    } else if (emo === "mimic") {
      mesh.scale.set(1.2, isLeft ? 1.2 : 0.4, 1); // Winking
      mesh.rotation.z = 0;
    } else {
      mesh.scale.set(1, 1, 1);
      mesh.rotation.z = 0;
    }
  }, [getEmotionColor]);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.2);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(4, 6, 5);
    scene.add(dirLight1);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    const bottomGlow = new THREE.PointLight(0x10b981, 1.2, 5);
    bottomGlow.position.set(0, -1.2, 1);
    scene.add(bottomGlow);

    // 4. Build Procedural Droid Hierarchy
    const droidGroup = new THREE.Group();
    scene.add(droidGroup);
    droidGroupRef.current = droidGroup;

    // ── HEAD ASSEMBLY ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0);
    droidGroup.add(headGroup);
    headGroupRef.current = headGroup;

    // Outer Cyber Helmet
    const helmetGeo = new THREE.BoxGeometry(1.4, 1.15, 1.1);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      metalness: 0.25,
    });
    const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
    helmetMesh.userData = { zone: "head" };
    headGroup.add(helmetMesh);

    // Dark OLED Visor
    const visorGeo = new THREE.BoxGeometry(1.18, 0.72, 0.12);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.05,
      metalness: 0.95,
      envMapIntensity: 1.5,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0, 0.52);
    visorMesh.userData = { zone: "visor" };
    headGroup.add(visorMesh);

    // Digital Eye Left
    const eyeGeo = new THREE.PlaneGeometry(0.22, 0.14);
    const eyeMatLeft = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMatLeft);
    eyeLeft.position.set(-0.28, 0.06, 0.59);
    headGroup.add(eyeLeft);
    eyeLeftMeshRef.current = eyeLeft;

    // Digital Eye Right
    const eyeMatRight = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const eyeRight = new THREE.Mesh(eyeGeo, eyeMatRight);
    eyeRight.position.set(0.28, 0.06, 0.59);
    headGroup.add(eyeRight);
    eyeRightMeshRef.current = eyeRight;

    // Digital Waveform Mouth
    const mouthGeo = new THREE.PlaneGeometry(0.35, 0.06);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, -0.18, 0.59);
    headGroup.add(mouthMesh);
    mouthMeshRef.current = mouthMesh;

    // Cyber Headphone Pods
    const earGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 24);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 });
    
    const earLeft = new THREE.Mesh(earGeo, earMat);
    earLeft.rotation.z = Math.PI / 2;
    earLeft.position.set(-0.76, 0, 0);
    headGroup.add(earLeft);

    const earRight = new THREE.Mesh(earGeo, earMat);
    earRight.rotation.z = Math.PI / 2;
    earRight.position.set(0.76, 0, 0);
    headGroup.add(earRight);

    // Antenna Mast & Light
    const mastGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 0.72, 0);
    mast.userData = { zone: "antenna" };
    headGroup.add(mast);

    const tipGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0.92, 0);
    tip.userData = { zone: "antenna" };
    headGroup.add(tip);
    antennaTipRef.current = tip;

    const antennaLight = new THREE.PointLight(0x10b981, 1.5, 3);
    antennaLight.position.set(0, 0.95, 0);
    headGroup.add(antennaLight);
    antennaLightRef.current = antennaLight;

    // ── BODY & CHEST ASSEMBLY ──
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.32, 0);
    droidGroup.add(bodyGroup);

    const chestGeo = new THREE.BoxGeometry(1.05, 0.85, 0.82);
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.1 });
    const chestMesh = new THREE.Mesh(chestGeo, chestMat);
    chestMesh.userData = { zone: "chest" };
    bodyGroup.add(chestMesh);

    // Glowing Plasma Core ([VOLTS] Reactor)
    const coreGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.06, 0.42);
    coreMesh.userData = { zone: "chest" };
    bodyGroup.add(coreMesh);
    coreMeshRef.current = coreMesh;

    // Core Orbit Ring
    const ringGeo = new THREE.TorusGeometry(0.24, 0.02, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0.06, 0.42);
    bodyGroup.add(ringMesh);

    // ── MAGNETIC HOVER THRUSTER BASE ──
    const thrusterGeo = new THREE.TorusGeometry(0.36, 0.07, 16, 32);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, -0.85, 0);
    thruster.userData = { zone: "thruster" };
    droidGroup.add(thruster);
    thrusterMeshRef.current = thruster;

    // Ion Jet Cone
    const jetGeo = new THREE.ConeGeometry(0.22, 0.45, 16);
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75,
    });
    const jet = new THREE.Mesh(jetGeo, jetMat);
    jet.rotation.x = Math.PI;
    jet.position.set(0, -1.05, 0);
    droidGroup.add(jet);

    // 5. Raycasting for Touch & Tap Interactions
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

      mouseVector.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseVector.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        let zone: string | undefined;

        while (hitObject && !zone) {
          zone = hitObject.userData?.zone;
          hitObject = hitObject.parent;
        }

        if (zone) {
          triggerPoke(zone as any);
        } else {
          // Default tickle/poke on body
          triggerPoke("head");
        }
      }
    };

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -((clientY - rect.top) / rect.height) * 2 + 1;

      mousePosRef.current.targetX = normX * 0.45;
      mousePosRef.current.targetY = normY * 0.35;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", handlePointerDown);
    domElement.addEventListener("mousemove", handlePointerMove);
    domElement.addEventListener("touchstart", handlePointerDown, { passive: true });
    domElement.addEventListener("touchmove", handlePointerMove, { passive: true });

    // 6. Animation Loop (60 FPS)
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth cursor interpolation
      mousePosRef.current.x = THREE.MathUtils.lerp(mousePosRef.current.x, mousePosRef.current.targetX, 0.1);
      mousePosRef.current.y = THREE.MathUtils.lerp(mousePosRef.current.y, mousePosRef.current.targetY, 0.1);

      // 1. Audio Decibel Analysis for Dynamic Mouth & Core
      let volume = 0;
      if (audioAnalyser) {
        audioAnalyser.getByteFrequencyData(audioDataRef.current);
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += audioDataRef.current[i];
        }
        volume = sum / (32 * 255);
      } else if (isTalking) {
        // Synthetic voice modulation
        volume = 0.3 + Math.sin(elapsedTime * 24) * 0.25;
      }

      // 2. Animate Mouth Scale (Speech Lip Sync)
      if (mouthMeshRef.current) {
        const targetScaleY = THREE.MathUtils.clamp(volume * 4.5, 0.2, 3.5);
        mouthMeshRef.current.scale.y = THREE.MathUtils.lerp(mouthMeshRef.current.scale.y, targetScaleY, 0.3);
      }

      // 3. Animate Core Glow
      if (coreMeshRef.current && antennaLightRef.current) {
        const targetGlow = 1.0 + volume * 3.0 + Math.sin(elapsedTime * 4) * 0.2;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = targetGlow;
        antennaLightRef.current.intensity = 1.2 + volume * 4.0;
      }

      // 4. Head Tracking & Rotation
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = mousePosRef.current.x;
        headGroupRef.current.rotation.x = -mousePosRef.current.y;
      }

      // 5. Floating Levitation & Thruster Wobble
      if (droidGroupRef.current) {
        const floatY = Math.sin(elapsedTime * 2.2) * 0.08 + recoilRef.current.jumpY;
        droidGroupRef.current.position.y = floatY;

        // Recoil shake recovery
        if (recoilRef.current.val > 0) {
          droidGroupRef.current.rotation.z = Math.sin(elapsedTime * 35) * recoilRef.current.val;
          recoilRef.current.val = Math.max(0, recoilRef.current.val - delta * 1.8);
        } else {
          droidGroupRef.current.rotation.z = Math.sin(elapsedTime * 1.8) * 0.03;
        }

        // 360 Spin on thruster tap
        if (recoilRef.current.spinY > 0) {
          droidGroupRef.current.rotation.y += recoilRef.current.spinY;
          recoilRef.current.spinY = Math.max(0, recoilRef.current.spinY - delta * 5);
        } else {
          droidGroupRef.current.rotation.y = THREE.MathUtils.lerp(droidGroupRef.current.rotation.y, mousePosRef.current.x * 0.3, 0.05);
        }

        // Jump recovery
        if (recoilRef.current.jumpY > 0) {
          recoilRef.current.jumpY = Math.max(0, recoilRef.current.jumpY - delta * 1.2);
        }
      }

      // Ion jet flicker
      if (jet) {
        jet.scale.y = 0.8 + Math.random() * 0.4 + (recoilRef.current.jumpY > 0 ? 1.5 : 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener("resize", handleResize);
      domElement.removeEventListener("mousedown", handlePointerDown);
      domElement.removeEventListener("mousemove", handlePointerMove);
      domElement.removeEventListener("touchstart", handlePointerDown);
      domElement.removeEventListener("touchmove", handlePointerMove);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [audioAnalyser, isTalking]);

  // Handle Emotion State Changes
  useEffect(() => {
    updateEyeGeometry(eyeLeftMeshRef.current, emotion, true);
    updateEyeGeometry(eyeRightMeshRef.current, emotion, false);

    const emoColor = getEmotionColor(emotion);
    if (mouthMeshRef.current) {
      (mouthMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(emoColor);
    }
    if (coreMeshRef.current) {
      const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(emoColor);
      mat.emissive.setHex(emoColor);
    }
    if (antennaTipRef.current) {
      const mat = antennaTipRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(emoColor);
      mat.emissive.setHex(emoColor);
    }
    if (antennaLightRef.current) {
      antennaLightRef.current.color.setHex(emoColor);
    }
  }, [emotion, getEmotionColor, updateEyeGeometry]);

  // Trigger Interactive Poke / Slap / Tickle Physics
  const triggerPoke = (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => {
    if (zone === "visor" || zone === "head") {
      recoilRef.current.val = 0.28;
      soundSynth.playRobotSlap();
      setInteractiveNotice("💥 VISOR SLAP! Optical sensors recalibrating...");
    } else if (zone === "chest") {
      recoilRef.current.val = 0.15;
      soundSynth.playRobotTickle();
      setInteractiveNotice("⚡ PLASMA CORE TICKLE: [ +50 VOLTS ]");
    } else if (zone === "antenna") {
      recoilRef.current.val = 0.1;
      soundSynth.playRobotPoke();
      setInteractiveNotice("📡 ANTENNA SIGNAL BOOST: 100% Signal Gain");
    } else if (zone === "thruster") {
      recoilRef.current.spinY = 0.45;
      recoilRef.current.jumpY = 0.35;
      soundSynth.playPlasmaCharge();
      setInteractiveNotice("🚀 ION THRUSTER BOOST: 360° Hover Flip!");
    }

    if (onPokeZone) {
      onPokeZone(zone);
    }

    setTimeout(() => {
      setInteractiveNotice(null);
    }, 2200);
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-gradient-to-b from-neutral-950 via-black to-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden font-mono select-none flex flex-col items-center justify-center shadow-2xl">
      {/* HUD Top Bar */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-black text-white uppercase tracking-wider">{characterName}</span>
          <span className="text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md font-bold">
            {energyVolts} VOLTS ⚡
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
              isTalking || audioAnalyser
                ? "bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse"
                : "bg-neutral-900 text-neutral-400 border-neutral-800"
            }`}
          >
            {isTalking || audioAnalyser ? "🎙️ TRANSMITTING 60 FPS" : "○ READY TO CHAT"}
          </span>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-pointer active:scale-[0.99] transition-transform" />

      {/* Interactive Hitbox Prompt Alert */}
      {interactiveNotice && (
        <div className="absolute bottom-16 inset-x-6 z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-neutral-900/95 border-2 border-emerald-400 text-emerald-300 text-xs font-black px-3 py-2 rounded-xl text-center shadow-[0_0_25px_rgba(16,185,129,0.35)] backdrop-blur-md">
            {interactiveNotice}
          </div>
        </div>
      )}

      {/* Quick Action Touch Pill Instructions */}
      <div className="absolute bottom-3 inset-x-4 z-10 flex items-center justify-between text-[10px] text-neutral-400 pointer-events-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => triggerPoke("visor")}
            className="px-2 py-1 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-yellow-400 text-neutral-300 hover:text-yellow-400 rounded-lg transition-all cursor-pointer font-bold shrink-0"
          >
            👋 [ POKE VISOR ]
          </button>
          <button
            onClick={() => triggerPoke("chest")}
            className="px-2 py-1 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-400 text-neutral-300 hover:text-emerald-400 rounded-lg transition-all cursor-pointer font-bold shrink-0"
          >
            ⚡ [ TICKLE CORE ]
          </button>
          <button
            onClick={() => triggerPoke("antenna")}
            className="px-2 py-1 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-purple-400 text-neutral-300 hover:text-purple-400 rounded-lg transition-all cursor-pointer font-bold shrink-0"
          >
            📡 [ BOOST ANTENNA ]
          </button>
          <button
            onClick={() => triggerPoke("thruster")}
            className="px-2 py-1 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-400 text-neutral-300 hover:text-cyan-400 rounded-lg transition-all cursor-pointer font-bold shrink-0"
          >
            🚀 [ 360° JUMP ]
          </button>
        </div>
      </div>
    </div>
  );
}
