"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { soundSynth } from "@/lib/soundSynthesizer";

export type RoboEmotion   = "happy" | "dizzy" | "savage" | "poetic" | "mimic" | "brainstorm";
export type SneezePhase   = "idle" | "windup" | "blast" | "recovery";
export type MicroExpression = "blush" | "hearts" | "tantrum" | "dizzy_spin" | null;

export interface RoboEchoProps {
  emotion: RoboEmotion;
  isTalking?: boolean;
  audioAnalyser?: AnalyserNode | null;
  onPokeZone?: (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => void;
  onHeadPet?: () => void;        // Fires after sustained 1.5s head-press
  characterName?: string;
  energyVolts?: number;
  // Sensor inputs
  tiltX?: number;                // [-1..1]
  tiltY?: number;                // [-1..1]
  isShaking?: boolean;
  // Sneeze phases
  sneezePhase?: SneezePhase;
  // Micro-expressions from parent
  microExpression?: MicroExpression;
}

const SNEEZE_PARTICLE_COUNT = 28;

export default function RoboEcho3DCanvas({
  emotion,
  isTalking = false,
  audioAnalyser = null,
  onPokeZone,
  onHeadPet,
  characterName = "ECHO-BOT // 01",
  energyVolts = 100,
  tiltX = 0,
  tiltY = 0,
  isShaking = false,
  sneezePhase = "idle",
  microExpression = null,
}: RoboEchoProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const rendererRef    = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef       = useRef<THREE.Scene | null>(null);
  const cameraRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const reqIdRef       = useRef<number | null>(null);

  // ── Core 3D object refs ─────────────────────────────────────────────────
  const droidGroupRef  = useRef<THREE.Group | null>(null);
  const headGroupRef   = useRef<THREE.Group | null>(null);
  const mouthMeshRef   = useRef<THREE.Mesh | null>(null);
  const coreMeshRef    = useRef<THREE.Mesh | null>(null);
  const antennaLightRef = useRef<THREE.PointLight | null>(null);
  const eyeLeftMeshRef  = useRef<THREE.Mesh | null>(null);
  const eyeRightMeshRef = useRef<THREE.Mesh | null>(null);
  const thrusterMeshRef = useRef<THREE.Mesh | null>(null);
  const antennaTipRef   = useRef<THREE.Mesh | null>(null);
  // Blush cheeks
  const blushLeftRef   = useRef<THREE.Mesh | null>(null);
  const blushRightRef  = useRef<THREE.Mesh | null>(null);
  // Sneeze particles
  const sneezePointsRef = useRef<THREE.Points | null>(null);
  // Heart particles
  const heartMeshesRef  = useRef<THREE.Mesh[]>([]);

  // ── Mutable animation state refs (read inside rAF without re-init) ──────
  const mousePosRef     = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const recoilRef       = useRef({ val: 0, spinY: 0, jumpY: 0 });
  const audioDataRef    = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(64) as any);
  const shakeEnergyRef  = useRef(0);
  const blushIntensRef  = useRef(0);
  const sneezeActiveRef = useRef(false);
  const sneezeVelsRef   = useRef<{ x: number; y: number; z: number }[]>([]);
  const petTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsShakingRef = useRef(false);

  // These refs mirror props so the animation loop can read latest values
  const tiltXRef        = useRef(tiltX);
  const tiltYRef        = useRef(tiltY);
  const sneezePhaseRef  = useRef<SneezePhase>(sneezePhase);
  const microExprRef    = useRef<MicroExpression>(microExpression);

  const [interactiveNotice, setInteractiveNotice] = useState<string | null>(null);

  // ── Keep prop-mirrors in sync ──────────────────────────────────────────
  useEffect(() => { tiltXRef.current = tiltX; }, [tiltX]);
  useEffect(() => { tiltYRef.current = tiltY; }, [tiltY]);
  useEffect(() => { microExprRef.current = microExpression; }, [microExpression]);

  useEffect(() => {
    const wasShaking = prevIsShakingRef.current;
    prevIsShakingRef.current = isShaking;
    if (!wasShaking && isShaking) {
      shakeEnergyRef.current = 1.0; // Burst
    }
  }, [isShaking]);

  useEffect(() => {
    sneezePhaseRef.current = sneezePhase;
    if (sneezePhase === "blast") {
      // Reset particle positions to head/mouth origin and mark active
      sneezeActiveRef.current = true;
      if (sneezePointsRef.current) {
        const posAttr = sneezePointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < SNEEZE_PARTICLE_COUNT; i++) {
          arr[i * 3]     = (Math.random() - 0.5) * 0.1;
          arr[i * 3 + 1] = 0.48;  // Mouth height in world space
          arr[i * 3 + 2] = 0.6;
        }
        posAttr.needsUpdate = true;
        (sneezePointsRef.current.material as THREE.PointsMaterial).opacity = 0.95;
      }
    } else {
      sneezeActiveRef.current = false;
      if (sneezePointsRef.current) {
        (sneezePointsRef.current.material as THREE.PointsMaterial).opacity = 0;
      }
    }
  }, [sneezePhase]);

  // ── Emotion colors ─────────────────────────────────────────────────────
  const getEmotionColor = useCallback((emo: RoboEmotion) => {
    switch (emo) {
      case "dizzy":      return 0xfacc15;
      case "savage":     return 0xef4444;
      case "poetic":     return 0xc084fc;
      case "mimic":      return 0xf59e0b;
      case "brainstorm": return 0x06b6d4;
      default:           return 0x10b981;
    }
  }, []);

  const updateEyeGeometry = useCallback((mesh: THREE.Mesh | null, emo: RoboEmotion, isLeft: boolean) => {
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(getEmotionColor(emo));
    switch (emo) {
      case "dizzy":
        mesh.scale.set(1.4, 0.4, 1);
        mesh.rotation.z = isLeft ? 0.3 : -0.3;
        break;
      case "savage":
        mesh.scale.set(1.3, 0.5, 1);
        mesh.rotation.z = isLeft ? -0.4 : 0.4;
        break;
      case "poetic":
        mesh.scale.set(1.1, 1.2, 1);
        mesh.rotation.z = 0;
        break;
      case "mimic":
        mesh.scale.set(1.2, isLeft ? 1.2 : 0.4, 1);
        mesh.rotation.z = 0;
        break;
      default:
        mesh.scale.set(1, 1, 1);
        mesh.rotation.z = 0;
    }
  }, [getEmotionColor]);

  // ── Scene Initialization ───────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const width  = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // Scene & Camera
    const scene  = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(4, 6, 5);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.4);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);
    const bottomGlow = new THREE.PointLight(0x10b981, 1.2, 5);
    bottomGlow.position.set(0, -1.2, 1);
    scene.add(bottomGlow);

    // ── Droid Hierarchy ────────────────────────────────────────────────
    const droidGroup = new THREE.Group();
    scene.add(droidGroup);
    droidGroupRef.current = droidGroup;

    // HEAD
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0);
    droidGroup.add(headGroup);
    headGroupRef.current = headGroup;

    // Helmet
    const helmetMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.15, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.25 })
    );
    helmetMesh.userData = { zone: "head" };
    headGroup.add(helmetMesh);

    // OLED Visor
    const visorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.72, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.95 })
    );
    visorMesh.position.set(0, 0, 0.52);
    visorMesh.userData = { zone: "visor" };
    headGroup.add(visorMesh);

    // Eyes
    const eyeGeo = new THREE.PlaneGeometry(0.22, 0.14);
    const eyeLeft  = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    eyeLeft.position.set(-0.28, 0.06, 0.59);
    headGroup.add(eyeLeft);
    eyeLeftMeshRef.current = eyeLeft;

    const eyeRight = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    eyeRight.position.set(0.28, 0.06, 0.59);
    headGroup.add(eyeRight);
    eyeRightMeshRef.current = eyeRight;

    // Mouth waveform
    const mouthMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    mouthMesh.position.set(0, -0.18, 0.59);
    headGroup.add(mouthMesh);
    mouthMeshRef.current = mouthMesh;

    // ── BLUSH CHEEKS (pink glow spheres, initially transparent) ─────
    const blushGeo = new THREE.SphereGeometry(0.13, 16, 16);

    const blushLeft = new THREE.Mesh(blushGeo, new THREE.MeshStandardMaterial({
      color: 0xff85a1, emissive: 0xff85a1, emissiveIntensity: 0,
      transparent: true, opacity: 0, roughness: 0.4,
    }));
    blushLeft.position.set(-0.52, -0.05, 0.44);
    headGroup.add(blushLeft);
    blushLeftRef.current = blushLeft;

    const blushRight = new THREE.Mesh(blushGeo, new THREE.MeshStandardMaterial({
      color: 0xff85a1, emissive: 0xff85a1, emissiveIntensity: 0,
      transparent: true, opacity: 0, roughness: 0.4,
    }));
    blushRight.position.set(0.52, -0.05, 0.44);
    headGroup.add(blushRight);
    blushRightRef.current = blushRight;

    // Headphone pods
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

    // Antenna
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
    );
    mast.position.set(0, 0.72, 0);
    mast.userData = { zone: "antenna" };
    headGroup.add(mast);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.8 })
    );
    tip.position.set(0, 0.92, 0);
    tip.userData = { zone: "antenna" };
    headGroup.add(tip);
    antennaTipRef.current = tip;

    const antennaLight = new THREE.PointLight(0x10b981, 1.5, 3);
    antennaLight.position.set(0, 0.95, 0);
    headGroup.add(antennaLight);
    antennaLightRef.current = antennaLight;

    // BODY
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.32, 0);
    droidGroup.add(bodyGroup);

    const chestMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.85, 0.82),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.1 })
    );
    chestMesh.userData = { zone: "chest" };
    bodyGroup.add(chestMesh);

    // Plasma core
    const coreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.2, roughness: 0.1 })
    );
    coreMesh.position.set(0, 0.06, 0.42);
    coreMesh.userData = { zone: "chest" };
    bodyGroup.add(coreMesh);
    coreMeshRef.current = coreMesh;

    // Core orbit ring
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.02, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
    );
    ringMesh.position.set(0, 0.06, 0.42);
    bodyGroup.add(ringMesh);

    // THRUSTER BASE
    const thruster = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.07, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 })
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, -0.85, 0);
    thruster.userData = { zone: "thruster" };
    droidGroup.add(thruster);
    thrusterMeshRef.current = thruster;

    // Ion jet cone
    const jet = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.45, 16),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75 })
    );
    jet.rotation.x = Math.PI;
    jet.position.set(0, -1.05, 0);
    droidGroup.add(jet);

    // ── SNEEZE PARTICLE SYSTEM ─────────────────────────────────────────
    const sneezePos = new Float32Array(SNEEZE_PARTICLE_COUNT * 3);
    for (let i = 0; i < SNEEZE_PARTICLE_COUNT; i++) {
      sneezePos[i * 3] = 0; sneezePos[i * 3 + 1] = 0.48; sneezePos[i * 3 + 2] = 0.6;
    }
    const sneezeGeo = new THREE.BufferGeometry();
    sneezeGeo.setAttribute("position", new THREE.BufferAttribute(sneezePos, 3));
    const sneezeMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.075, transparent: true, opacity: 0 });
    const sneezePoints = new THREE.Points(sneezeGeo, sneezeMat);
    scene.add(sneezePoints);
    sneezePointsRef.current = sneezePoints;

    // Pre-compute unique random velocities per particle
    const vels: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < SNEEZE_PARTICLE_COUNT; i++) {
      vels.push({
        x: (Math.random() - 0.5) * 5.5,
        y: (Math.random() - 0.15) * 3,
        z: Math.random() * 7 + 2.5,
      });
    }
    sneezeVelsRef.current = vels;

    // ── Heart Floaters (8 small spheres for hearts/blush expression) ──
    const heartMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const hm = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff4d6d, emissiveIntensity: 1.5, transparent: true, opacity: 0 })
      );
      hm.position.set((Math.random() - 0.5) * 1.2, 1.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5);
      hm.userData = { baseY: hm.position.y, phase: Math.random() * Math.PI * 2 };
      droidGroup.add(hm);
      heartMeshes.push(hm);
    }
    heartMeshesRef.current = heartMeshes;

    // ── Raycasting ─────────────────────────────────────────────────────
    const raycaster   = new THREE.Raycaster();
    const mouseVec    = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const rect    = renderer.domElement.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : (event as MouseEvent).clientY;
      mouseVec.x    = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y    = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        let zone: string | undefined;
        while (obj && !zone) { zone = obj.userData?.zone; obj = obj.parent; }
        triggerPoke((zone as any) ?? "head");
        // Start petting timer on head zone
        if ((zone === "head" || zone === "visor") && onHeadPet) {
          if (petTimerRef.current) clearTimeout(petTimerRef.current);
          petTimerRef.current = setTimeout(() => { onHeadPet(); }, 1500);
        }
      }
    };

    const handlePointerUp = () => {
      if (petTimerRef.current) { clearTimeout(petTimerRef.current); petTimerRef.current = null; }
    };

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const rect    = renderer.domElement.getBoundingClientRect();
      const clientX = "touches" in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : (event as MouseEvent).clientY;
      const normX   = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY   = -((clientY - rect.top) / rect.height) * 2 + 1;
      mousePosRef.current.targetX = normX * 0.45;
      mousePosRef.current.targetY = normY * 0.35;
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown",  handlePointerDown);
    dom.addEventListener("mouseup",    handlePointerUp);
    dom.addEventListener("mousemove",  handlePointerMove);
    dom.addEventListener("touchstart", handlePointerDown,  { passive: true });
    dom.addEventListener("touchend",   handlePointerUp,    { passive: true });
    dom.addEventListener("touchmove",  handlePointerMove,  { passive: true });

    // ── Animation Loop (60 FPS) ────────────────────────────────────────
    const clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const delta       = clock.getDelta();
      const elapsed     = clock.getElapsedTime();

      // Smooth cursor interpolation
      mousePosRef.current.x = THREE.MathUtils.lerp(mousePosRef.current.x, mousePosRef.current.targetX, 0.1);
      mousePosRef.current.y = THREE.MathUtils.lerp(mousePosRef.current.y, mousePosRef.current.targetY, 0.1);

      // ── 1. Audio Mouth & Core ────────────────────────────────────────
      let volume = 0;
      if (audioAnalyser) {
        audioAnalyser.getByteFrequencyData(audioDataRef.current);
        let sum = 0;
        for (let i = 0; i < 32; i++) sum += audioDataRef.current[i];
        volume = sum / (32 * 255);
      } else if (isTalking) {
        volume = 0.3 + Math.sin(elapsed * 24) * 0.25;
      }

      if (mouthMeshRef.current) {
        const snp = sneezePhaseRef.current;
        const targetScaleY = snp === "blast"
          ? 4.0
          : THREE.MathUtils.clamp(volume * 4.5, 0.2, 3.5);
        mouthMeshRef.current.scale.y = THREE.MathUtils.lerp(mouthMeshRef.current.scale.y, targetScaleY, 0.3);
      }

      if (coreMeshRef.current && antennaLightRef.current) {
        const glow = 1.0 + volume * 3.0 + Math.sin(elapsed * 4) * 0.2;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
        antennaLightRef.current.intensity = 1.2 + volume * 4.0;
      }

      // ── 2. Sneeze Phase Head Animations ──────────────────────────────
      if (headGroupRef.current) {
        const phase = sneezePhaseRef.current;
        if (phase === "windup") {
          // Head tilts back + trembles
          headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, -0.5, delta * 8);
          headGroupRef.current.position.y = 0.65 + Math.sin(elapsed * 42) * 0.022;
          headGroupRef.current.rotation.z = Math.sin(elapsed * 38) * 0.04;
        } else if (phase === "blast") {
          // Violent snap forward
          headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, 0.65, delta * 28);
          headGroupRef.current.position.y = THREE.MathUtils.lerp(headGroupRef.current.position.y, 0.65, delta * 18);
        } else if (phase === "recovery") {
          // Dizzy wobble back to neutral
          headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, 0, delta * 4);
          headGroupRef.current.rotation.z = Math.sin(elapsed * 15) * 0.12 * Math.max(0, 1 - delta * 3);
          headGroupRef.current.position.y = THREE.MathUtils.lerp(headGroupRef.current.position.y, 0.65, delta * 4);
        } else {
          // Normal tracking
          headGroupRef.current.rotation.x = THREE.MathUtils.lerp(headGroupRef.current.rotation.x, -mousePosRef.current.y, 0.1);
          headGroupRef.current.rotation.y = THREE.MathUtils.lerp(headGroupRef.current.rotation.y, mousePosRef.current.x, 0.1);
          headGroupRef.current.rotation.z = THREE.MathUtils.lerp(headGroupRef.current.rotation.z, 0, 0.1);
          headGroupRef.current.position.y = THREE.MathUtils.lerp(headGroupRef.current.position.y, 0.65, delta * 6);
        }
      }

      // ── 3. Droid Group Float + Tilt + Shake + Recoil + Tantrum ───────
      if (droidGroupRef.current) {
        // Shake stumble decay
        let shakeX = 0;
        if (shakeEnergyRef.current > 0.01) {
          shakeX = Math.sin(elapsed * 28) * shakeEnergyRef.current * 0.32;
          droidGroupRef.current.position.z = Math.sin(elapsed * 22) * shakeEnergyRef.current * 0.1;
          shakeEnergyRef.current = Math.max(0, shakeEnergyRef.current - delta * 3);
        } else {
          droidGroupRef.current.position.z = THREE.MathUtils.lerp(droidGroupRef.current.position.z, 0, delta * 4);
        }

        // Float + jump
        const floatY = Math.sin(elapsed * 2.2) * 0.08 + recoilRef.current.jumpY;
        droidGroupRef.current.position.y = floatY;
        droidGroupRef.current.position.x = THREE.MathUtils.lerp(droidGroupRef.current.position.x, shakeX, 0.3);

        // Tilt lean (phone gyro)
        const targetLeanX = tiltYRef.current * 0.28;
        droidGroupRef.current.rotation.x = THREE.MathUtils.lerp(droidGroupRef.current.rotation.x, targetLeanX, 0.06);

        // Z rotation: recoil shake OR idle
        const targetLeanZ = -tiltXRef.current * 0.35;
        if (recoilRef.current.val > 0) {
          droidGroupRef.current.rotation.z = Math.sin(elapsed * 35) * recoilRef.current.val + targetLeanZ;
          recoilRef.current.val = Math.max(0, recoilRef.current.val - delta * 1.8);
        } else {
          droidGroupRef.current.rotation.z = THREE.MathUtils.lerp(
            droidGroupRef.current.rotation.z,
            targetLeanZ + Math.sin(elapsed * 1.8) * 0.03,
            0.06
          );
        }

        // Y rotation: tantrum (turn back) vs spin vs tracking
        const microE = microExprRef.current;
        if (microE === "tantrum") {
          droidGroupRef.current.rotation.y = THREE.MathUtils.lerp(droidGroupRef.current.rotation.y, Math.PI, delta * 2.5);
        } else if (recoilRef.current.spinY > 0) {
          droidGroupRef.current.rotation.y += recoilRef.current.spinY;
          recoilRef.current.spinY = Math.max(0, recoilRef.current.spinY - delta * 5);
        } else {
          droidGroupRef.current.rotation.y = THREE.MathUtils.lerp(
            droidGroupRef.current.rotation.y,
            mousePosRef.current.x * 0.3 + tiltXRef.current * 0.2,
            0.05
          );
        }

        if (recoilRef.current.jumpY > 0) {
          recoilRef.current.jumpY = Math.max(0, recoilRef.current.jumpY - delta * 1.2);
        }
      }

      // ── 4. Ion jet flicker ───────────────────────────────────────────
      if (jet) {
        jet.scale.y = 0.8 + Math.random() * 0.4 + (recoilRef.current.jumpY > 0 ? 1.5 : 0);
      }

      // ── 5. Blush Cheeks glow in/out ──────────────────────────────────
      if (blushLeftRef.current && blushRightRef.current) {
        const microE = microExprRef.current;
        const wantBlush = microE === "blush" || microE === "hearts";
        const targetI   = wantBlush ? 2.2 : 0;
        blushIntensRef.current = THREE.MathUtils.lerp(blushIntensRef.current, targetI, delta * 2.5);
        const intensity = blushIntensRef.current;
        [blushLeftRef.current, blushRightRef.current].forEach(mesh => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = intensity;
          mat.opacity = Math.min(0.8, intensity * 0.38);
        });
      }

      // ── 6. Sneeze Particles (fly outward during blast) ───────────────
      if (sneezeActiveRef.current && sneezePointsRef.current) {
        const posAttr = sneezePointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const vels = sneezeVelsRef.current;
        for (let i = 0; i < SNEEZE_PARTICLE_COUNT; i++) {
          arr[i * 3]     += vels[i].x * delta;
          arr[i * 3 + 1] += vels[i].y * delta;
          arr[i * 3 + 2] += vels[i].z * delta;
        }
        posAttr.needsUpdate = true;
        // Fade out as they travel
        const mat = sneezePointsRef.current.material as THREE.PointsMaterial;
        mat.opacity = Math.max(0, mat.opacity - delta * 1.5);
      }

      // ── 7. Heart floaters on 'hearts' expression ─────────────────────
      heartMeshesRef.current.forEach((hm, i) => {
        const microE = microExprRef.current;
        const mat = hm.material as THREE.MeshStandardMaterial;
        const wantHearts = microE === "hearts" || microE === "blush";
        const targetOpacity = wantHearts ? 0.9 : 0;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 3);
        if (wantHearts) {
          hm.position.y = (hm.userData.baseY + Math.sin(elapsed * 1.5 + hm.userData.phase) * 0.15);
          hm.scale.setScalar(0.9 + Math.sin(elapsed * 3 + i) * 0.1);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousedown", handlePointerDown);
      dom.removeEventListener("mouseup", handlePointerUp);
      dom.removeEventListener("mousemove", handlePointerMove);
      dom.removeEventListener("touchstart", handlePointerDown);
      dom.removeEventListener("touchend", handlePointerUp);
      dom.removeEventListener("touchmove", handlePointerMove);
      if (petTimerRef.current) clearTimeout(petTimerRef.current);
      renderer.dispose();
      container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioAnalyser, isTalking]);

  // ── Emotion change (eye + color updates) ─────────────────────────────
  useEffect(() => {
    updateEyeGeometry(eyeLeftMeshRef.current, emotion, true);
    updateEyeGeometry(eyeRightMeshRef.current, emotion, false);
    const col = getEmotionColor(emotion);
    if (mouthMeshRef.current)   (mouthMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(col);
    if (coreMeshRef.current) {
      const m = coreMeshRef.current.material as THREE.MeshStandardMaterial;
      m.color.setHex(col); m.emissive.setHex(col);
    }
    if (antennaTipRef.current) {
      const m = antennaTipRef.current.material as THREE.MeshStandardMaterial;
      m.color.setHex(col); m.emissive.setHex(col);
    }
    if (antennaLightRef.current) antennaLightRef.current.color.setHex(col);
  }, [emotion, getEmotionColor, updateEyeGeometry]);

  // ── Poke Physics & Sound ──────────────────────────────────────────────
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
      setInteractiveNotice("📡 ANTENNA BOOST: Persona switching!");
    } else if (zone === "thruster") {
      recoilRef.current.spinY = 0.45;
      recoilRef.current.jumpY = 0.35;
      soundSynth.playPlasmaCharge();
      setInteractiveNotice("🚀 ION THRUSTER: 360° Hover Flip!");
    }
    onPokeZone?.(zone);
    setTimeout(() => setInteractiveNotice(null), 2200);
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-gradient-to-b from-neutral-950 via-black to-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden font-mono select-none flex flex-col items-center justify-center shadow-2xl">
      {/* HUD Top Bar */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-black text-white uppercase tracking-wider">{characterName}</span>
          <span className="text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md font-bold">
            {energyVolts} ⚡
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
            isTalking || audioAnalyser
              ? "bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse"
              : sneezePhase !== "idle"
              ? "bg-sky-950 text-sky-300 border-sky-500 animate-bounce"
              : "bg-neutral-900 text-neutral-400 border-neutral-800"
          }`}
        >
          {sneezePhase !== "idle"
            ? `💨 SNEEZE: ${sneezePhase.toUpperCase()}`
            : isTalking || audioAnalyser
            ? "🎙️ TRANSMITTING 60FPS"
            : "○ READY"}
        </span>
      </div>

      {/* 3D WebGL Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-pointer active:scale-[0.99] transition-transform" />

      {/* Interactive Notice */}
      {interactiveNotice && (
        <div className="absolute bottom-16 inset-x-6 z-20 pointer-events-none">
          <div className="bg-neutral-900/95 border-2 border-emerald-400 text-emerald-300 text-xs font-black px-3 py-2 rounded-xl text-center shadow-[0_0_25px_rgba(16,185,129,0.35)] backdrop-blur-md">
            {interactiveNotice}
          </div>
        </div>
      )}

      {/* Touch Pill Buttons */}
      <div className="absolute bottom-3 inset-x-4 z-10 flex items-center justify-between text-[10px] text-neutral-400 pointer-events-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {(["visor", "chest", "antenna", "thruster"] as const).map((zone) => {
            const labels: Record<string, string> = {
              visor: "👋 POKE", chest: "⚡ TICKLE", antenna: "📡 BOOST", thruster: "🚀 FLIP",
            };
            const colors: Record<string, string> = {
              visor: "hover:border-yellow-400 hover:text-yellow-400",
              chest: "hover:border-emerald-400 hover:text-emerald-400",
              antenna: "hover:border-purple-400 hover:text-purple-400",
              thruster: "hover:border-cyan-400 hover:text-cyan-400",
            };
            return (
              <button
                key={zone}
                onClick={() => triggerPoke(zone)}
                className={`px-2 py-1 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-lg transition-all cursor-pointer font-bold shrink-0 ${colors[zone]}`}
              >
                {labels[zone]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
