/**
 * lib/avatarRig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-Cost Client-Side 2.5D / 3D Expressive Avatar Rigging & Animation Engine.
 * Supports facial morph targets (eyes, mouth, blush, tears), skeletal gestures
 * (waving, heart hands, bowing, clapping, hype jump), and procedural particles.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type AvatarSkinTone = "IVORY" | "CARAMEL" | "ESPRESSO" | "ALMOND" | "CYAN" | "OBSIDIAN";
export type AvatarHairStyle = "CYBER_FADE" | "CURLY_AFRO" | "NEON_BOB" | "SPIKY_ANIME" | "PUNK_DREADS" | "BALD";
export type AvatarHairColor = "BLACK" | "BLONDE" | "NEON_PINK" | "CYAN" | "EMERALD" | "PURPLE" | "WHITE";
export type AvatarEyewear = "NONE" | "CYBER_VISOR" | "RETRO_SHADES" | "WIREFRAME_GLASSES";
export type AvatarOutfitColor = "OBSIDIAN" | "WHITE" | "CRIMSON" | "EMERALD" | "CYAN" | "AMBER";

export type AvatarGesture =
  | "IDLE"
  | "GREETING_WAVE"
  | "LOVE_HEART"
  | "APOLOGY_BOW"
  | "LOL_LAUGH"
  | "GG_CLAP"
  | "MINDBLOWN"
  | "HYPE_FIRE";

export interface AvatarConfig {
  skinTone: AvatarSkinTone;
  hairStyle: AvatarHairStyle;
  hairColor: AvatarHairColor;
  eyewear: AvatarEyewear;
  outfitColor: AvatarOutfitColor;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skinTone: "ALMOND",
  hairStyle: "CYBER_FADE",
  hairColor: "CYAN",
  eyewear: "CYBER_VISOR",
  outfitColor: "OBSIDIAN",
};

export const SKIN_PALETTES: Record<
  AvatarSkinTone,
  { base: string; shadow: string; highlight: string; blush: string; iris: string }
> = {
  IVORY: {
    base: "#fbe3d5",
    shadow: "#e2b8a0",
    highlight: "#ffffff",
    blush: "rgba(244, 114, 182, 0.45)",
    iris: "#38bdf8",
  },
  CARAMEL: {
    base: "#c88b56",
    shadow: "#9f6133",
    highlight: "#e9b88e",
    blush: "rgba(225, 29, 72, 0.35)",
    iris: "#a855f7",
  },
  ESPRESSO: {
    base: "#643c26",
    shadow: "#412313",
    highlight: "#8b593d",
    blush: "rgba(190, 24, 93, 0.3)",
    iris: "#f59e0b",
  },
  ALMOND: {
    base: "#eec09a",
    shadow: "#ca9268",
    highlight: "#fae0cc",
    blush: "rgba(244, 63, 94, 0.4)",
    iris: "#06b6d4",
  },
  CYAN: {
    base: "#06b6d4",
    shadow: "#0e7490",
    highlight: "#67e8f9",
    blush: "rgba(168, 85, 247, 0.45)",
    iris: "#facc15",
  },
  OBSIDIAN: {
    base: "#2a2a2e",
    shadow: "#161619",
    highlight: "#45454d",
    blush: "rgba(244, 63, 94, 0.35)",
    iris: "#22c55e",
  },
};

export const HAIR_PALETTES: Record<
  AvatarHairColor,
  { base: string; shadow: string; sheen: string }
> = {
  BLACK: { base: "#18181b", shadow: "#09090b", sheen: "#52525b" },
  BLONDE: { base: "#eab308", shadow: "#a16207", sheen: "#fef08a" },
  NEON_PINK: { base: "#ec4899", shadow: "#be185d", sheen: "#fbcfe8" },
  CYAN: { base: "#06b6d4", shadow: "#0e7490", sheen: "#a5f3fc" },
  EMERALD: { base: "#10b981", shadow: "#047857", sheen: "#a7f3d0" },
  PURPLE: { base: "#a855f7", shadow: "#6b21a8", sheen: "#e9d5ff" },
  WHITE: { base: "#e4e4e7", shadow: "#a1a1aa", sheen: "#ffffff" },
};

export const OUTFIT_PALETTES: Record<
  AvatarOutfitColor,
  { base: string; shadow: string; trim: string; glow: string }
> = {
  OBSIDIAN: { base: "#18181b", shadow: "#09090b", trim: "#ffffff", glow: "rgba(255,255,255,0.4)" },
  WHITE: { base: "#f4f4f5", shadow: "#d4d4d8", trim: "#000000", glow: "rgba(255,255,255,0.8)" },
  CRIMSON: { base: "#dc2626", shadow: "#991b1b", trim: "#fecaca", glow: "rgba(239,68,68,0.5)" },
  EMERALD: { base: "#059669", shadow: "#064e3b", trim: "#a7f3d0", glow: "rgba(160,185,129,0.5)" },
  CYAN: { base: "#0891b2", shadow: "#155e75", trim: "#a5f3fc", glow: "rgba(6,182,212,0.6)" },
  AMBER: { base: "#d97706", shadow: "#92400e", trim: "#fef08a", glow: "rgba(245,158,11,0.5)" },
};

export interface GestureMeta {
  type: AvatarGesture;
  label: string;
  emoji: string;
  tagline: string;
  soundType: "fanfare" | "chime" | "cheer" | "snare" | "gong" | "airhorn" | "pop";
}

export const GESTURE_CATALOG: Record<AvatarGesture, GestureMeta> = {
  IDLE: { type: "IDLE", label: "Neutral", emoji: "🙂", tagline: "Online & Ready", soundType: "pop" },
  GREETING_WAVE: { type: "GREETING_WAVE", label: "Wave", emoji: "👋", tagline: "Hey there!", soundType: "chime" },
  LOVE_HEART: { type: "LOVE_HEART", label: "Love & Heart", emoji: "❤️", tagline: "Sending love!", soundType: "fanfare" },
  APOLOGY_BOW: { type: "APOLOGY_BOW", label: "Sorry / Bow", emoji: "🙇", tagline: "My apologies!", soundType: "gong" },
  LOL_LAUGH: { type: "LOL_LAUGH", label: "LOL / Laugh", emoji: "😂", tagline: "Can't stop laughing!", soundType: "snare" },
  GG_CLAP: { type: "GG_CLAP", label: "GG / Applause", emoji: "👏", tagline: "Great game!", soundType: "cheer" },
  MINDBLOWN: { type: "MINDBLOWN", label: "Mindblown", emoji: "🤯", tagline: "Unbelievable!", soundType: "airhorn" },
  HYPE_FIRE: { type: "HYPE_FIRE", label: "Hype / Fire", emoji: "🔥", tagline: "Pure energy!", soundType: "fanfare" },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  char?: string;
  life: number;
  maxLife: number;
}

/**
 * Automatically detects an expressive avatar gesture from user text or emojis
 */
export function detectEmotionGesture(text: string): AvatarGesture | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (
    text.includes("❤️") ||
    text.includes("💖") ||
    text.includes("💕") ||
    text.includes("🥰") ||
    text.includes("😍") ||
    text.includes("😘") ||
    text.includes("❤️‍🔥") ||
    lower.includes("love") ||
    lower.includes("pyar")
  ) {
    return "LOVE_HEART";
  }
  if (
    text.includes("🔥") ||
    text.includes("⚡") ||
    text.includes("💯") ||
    text.includes("🚀") ||
    text.includes("💥") ||
    text.includes("💎") ||
    text.includes("🎯") ||
    lower.includes("hype") ||
    lower.includes("op") ||
    lower.includes("fire")
  ) {
    return "HYPE_FIRE";
  }
  if (
    text.includes("😂") ||
    text.includes("🤣") ||
    text.includes("😆") ||
    lower.includes("lol") ||
    lower.includes("lmao") ||
    lower.includes("haha") ||
    lower.includes("rofl")
  ) {
    return "LOL_LAUGH";
  }
  if (
    text.includes("👋") ||
    text.includes("🙋") ||
    text.includes("🤖") ||
    text.includes("✨") ||
    text.includes("🎙️") ||
    text.includes("📻") ||
    lower.includes("hi ") ||
    lower.includes("hello") ||
    lower.includes("hey") ||
    lower.includes("namaste") ||
    lower.includes("sup")
  ) {
    return "GREETING_WAVE";
  }
  if (
    text.includes("👏") ||
    text.includes("🎉") ||
    text.includes("🏆") ||
    text.includes("👑") ||
    text.includes("👍") ||
    text.includes("🦾") ||
    lower.includes("gg") ||
    lower.includes("congrats") ||
    lower.includes("cheers")
  ) {
    return "GG_CLAP";
  }
  if (
    text.includes("🙇") ||
    text.includes("🥺") ||
    text.includes("😭") ||
    text.includes("😢") ||
    text.includes("🙏") ||
    lower.includes("sorry") ||
    lower.includes("maaf") ||
    lower.includes("plz")
  ) {
    return "APOLOGY_BOW";
  }
  if (
    text.includes("🤯") ||
    text.includes("😱") ||
    text.includes("💀") ||
    text.includes("🛸") ||
    text.includes("🌌") ||
    text.includes("🔮") ||
    lower.includes("wtf") ||
    lower.includes("omg") ||
    lower.includes("mindblown") ||
    lower.includes("bruh")
  ) {
    return "MINDBLOWN";
  }
  return null;
}

/**
 * 2.5D / 3D Realistic Canvas Rig Animation Driver with Dynamic Cursor/Touch Eye Tracking
 */
export class AvatarRigDriver {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: AvatarConfig;
  private gesture: AvatarGesture = "IDLE";
  private time: number = 0;
  private animFrameId: number | null = null;
  private particles: Particle[] = [];

  // Interactive 3D Cursor & Head Tracking
  public pointerX: number = 0;
  public pointerY: number = 0;
  private targetPointerX: number = 0;
  private targetPointerY: number = 0;
  private bounceIntensity: number = 0;

  constructor(canvas: HTMLCanvasElement, config: AvatarConfig = DEFAULT_AVATAR_CONFIG) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    this.ctx = context;
    this.config = config;
  }

  public updateConfig(newConfig: Partial<AvatarConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public setGesture(gesture: AvatarGesture) {
    this.gesture = gesture;
    this.particles = [];
    this.bounceIntensity = 1.0;
  }

  public setPointer(normX: number, normY: number) {
    this.targetPointerX = Math.max(-1, Math.min(1, normX));
    this.targetPointerY = Math.max(-1, Math.min(1, normY));
  }

  public resetPointer() {
    this.targetPointerX = 0;
    this.targetPointerY = 0;
  }

  public triggerInteractivePoke() {
    this.bounceIntensity = 1.4;
    this.emitParticles(2, "✨", "#ffffff");
  }

  public start() {
    if (this.animFrameId) return;
    const renderLoop = (t: number) => {
      this.time = t * 0.001;
      this.render();
      this.animFrameId = requestAnimationFrame(renderLoop);
    };
    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private emitParticles(count: number, char?: string, color: string = "#ffffff") {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 90,
        y: cy + (Math.random() - 0.5) * 70 - 25,
        vx: (Math.random() - 0.5) * 45,
        vy: -Math.random() * 55 - 25,
        size: Math.random() * 8 + 6,
        alpha: 1,
        color,
        char,
        life: 0,
        maxLife: Math.random() * 0.8 + 0.6,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }
  }

  private render() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // Smooth pointer and bounce physics
    this.pointerX += (this.targetPointerX - this.pointerX) * 0.15;
    this.pointerY += (this.targetPointerY - this.pointerY) * 0.15;
    if (this.bounceIntensity > 0.01) {
      this.bounceIntensity *= 0.93;
    } else {
      this.bounceIntensity = 0;
    }

    // ── Framing & Center (Fully Visible Upper Body & Head) ───────────────────
    const cx = width / 2;
    const cy = height * 0.53;
    // Scale designed so bounds fit comfortably within the circle without any clipping
    const scale = Math.min(width, height) / 195;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const t = this.time;
    const skin = SKIN_PALETTES[this.config.skinTone] || SKIN_PALETTES.ALMOND;
    const hair = HAIR_PALETTES[this.config.hairColor] || HAIR_PALETTES.CYAN;
    const outfit = OUTFIT_PALETTES[this.config.outfitColor] || OUTFIT_PALETTES.OBSIDIAN;

    // ── Kinematic Calculations based on Gesture & 3D Pointer Tracking ─────────
    const servoJitter = Math.sin(t * 30) * 0.003;
    let headOffsetY = Math.sin(t * 3.5) * 2.2 + this.pointerY * 4.0 - this.bounceIntensity * 6;
    let headTilt = Math.sin(t * 2.5) * 0.04 + this.pointerX * 0.2 + servoJitter;
    let torsoTilt = this.pointerX * 0.09;
    let leftArmAngle = 0.22 + Math.sin(t * 3) * 0.05;
    let rightArmAngle = -0.22 - Math.sin(t * 3) * 0.05;
    let eyeMorph: "OPEN" | "BLINK" | "HEART" | "CRY" | "SQUINT" | "SHOCKED" = "OPEN";
    let mouthMorph: "SMILE" | "OPEN_LAUGH" | "POUT" | "SHOCKED" | "TALK" = "SMILE";
    let showCrown = false;

    // Robotic Mechanical Eyelid/Optic Blink
    if (Math.sin(t * 1.5) > 0.93) {
      eyeMorph = "BLINK";
    }

    // Beacon / Ear glow color based on gesture
    let neonColor = skin.iris || "#38bdf8";

    switch (this.gesture) {
      case "GREETING_WAVE":
        headTilt = Math.sin(t * 6) * 0.09 + this.pointerX * 0.15;
        rightArmAngle = -1.75 + Math.sin(t * 12) * 0.5;
        eyeMorph = "OPEN";
        mouthMorph = "SMILE";
        neonColor = "#38bdf8";
        if (Math.random() < 0.12) this.emitParticles(1, "✨", "#38bdf8");
        break;

      case "LOVE_HEART":
        headOffsetY = Math.sin(t * 5) * 3.8 + this.pointerY * 2;
        eyeMorph = "HEART";
        mouthMorph = "SMILE";
        neonColor = "#f43f5e";
        leftArmAngle = -1.15 + Math.sin(t * 4) * 0.08;
        rightArmAngle = 1.15 - Math.sin(t * 4) * 0.08;
        if (Math.random() < 0.16) this.emitParticles(1, "❤️", "#f43f5e");
        break;

      case "APOLOGY_BOW":
        torsoTilt = 0.28 + Math.sin(t * 3) * 0.04;
        headOffsetY = 12;
        headTilt = 0.16;
        eyeMorph = "CRY";
        mouthMorph = "POUT";
        neonColor = "#06b6d4";
        leftArmAngle = 0.45;
        rightArmAngle = -0.45;
        if (Math.random() < 0.1) this.emitParticles(1, "💧", "#38bdf8");
        break;

      case "LOL_LAUGH":
        headOffsetY = Math.sin(t * 18) * 3.8;
        headTilt = Math.sin(t * 8) * 0.12;
        eyeMorph = "SQUINT";
        mouthMorph = "OPEN_LAUGH";
        neonColor = "#facc15";
        leftArmAngle = 0.5 + Math.sin(t * 12) * 0.2;
        rightArmAngle = -0.5 - Math.sin(t * 12) * 0.2;
        if (Math.random() < 0.15) this.emitParticles(1, "✨", "#facc15");
        break;

      case "GG_CLAP":
        leftArmAngle = -1.05 + Math.sin(t * 14) * 0.35;
        rightArmAngle = 1.05 - Math.sin(t * 14) * 0.35;
        eyeMorph = "OPEN";
        mouthMorph = "SMILE";
        neonColor = "#a855f7";
        showCrown = true;
        if (Math.random() < 0.15) this.emitParticles(1, "🎉", "#a855f7");
        break;

      case "MINDBLOWN":
        headOffsetY = -6 + Math.sin(t * 8) * 1.8;
        eyeMorph = "SHOCKED";
        mouthMorph = "SHOCKED";
        neonColor = "#ec4899";
        leftArmAngle = -1.55;
        rightArmAngle = 1.55;
        if (Math.random() < 0.2) this.emitParticles(1, "⚡", "#38bdf8");
        break;

      case "HYPE_FIRE":
        headOffsetY = Math.sin(t * 10) * 4.2;
        leftArmAngle = -2.0 + Math.sin(t * 8) * 0.2;
        rightArmAngle = 2.0 - Math.sin(t * 8) * 0.2;
        eyeMorph = "OPEN";
        mouthMorph = "OPEN_LAUGH";
        neonColor = "#f97316";
        if (Math.random() < 0.25) this.emitParticles(2, "🔥", "#f97316");
        break;

      default:
        break;
    }

    // ── 1. BACKGROUND GLOW AURA ───────────────────────────────────────────────
    const auraGrad = ctx.createRadialGradient(0, -10, 10, 0, -10, 85);
    auraGrad.addColorStop(0, `${neonColor}28`);
    auraGrad.addColorStop(0.7, `${neonColor}0a`);
    auraGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -10, 85, 0, Math.PI * 2);
    ctx.fill();

    // ── 2. MINIATURE 3D ROBOTIC CHASSIS (TORSO) ───────────────────────────────
    ctx.save();
    ctx.rotate(torsoTilt);

    // Torso Base Gradient (Metallic Cyber Shell)
    const torsoGrad = ctx.createLinearGradient(-35, 30, 35, 75);
    torsoGrad.addColorStop(0, outfit.base);
    torsoGrad.addColorStop(0.5, outfit.shadow);
    torsoGrad.addColorStop(1, "#050507");

    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = outfit.trim || "#ffffff";
    ctx.lineWidth = 1.8;

    // Cute rounded robot body
    ctx.beginPath();
    ctx.roundRect(-30, 32, 60, 42, [14, 14, 22, 22]);
    ctx.fill();
    ctx.stroke();

    // Chest Panel Seam Line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-24, 48);
    ctx.lineTo(24, 48);
    ctx.stroke();

    // Glowing Central Arc Power Core with Rotating Reactor Rays
    const coreGrad = ctx.createRadialGradient(0, 52, 1, 0, 52, 9);
    coreGrad.addColorStop(0, "#ffffff");
    coreGrad.addColorStop(0.4, neonColor);
    coreGrad.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 52, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Core pulsing ring
    ctx.strokeStyle = `${neonColor}99`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 52, 11 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // ── 3. ARTICULATED ROBOTIC HANDS ──────────────────────────────────────────
    const drawRobotHand = (hx: number, hy: number, angle: number, isRight: boolean) => {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(angle);

      // Arm Segment
      ctx.strokeStyle = outfit.shadow;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 18);
      ctx.stroke();

      // Arm Outline
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 18);
      ctx.stroke();

      // Hand / Knuckle Sphere
      const handGrad = ctx.createRadialGradient(0, 22, 1, 0, 22, 7);
      handGrad.addColorStop(0, "#ffffff");
      handGrad.addColorStop(0.6, outfit.base);
      handGrad.addColorStop(1, "#09090b");
      ctx.fillStyle = handGrad;
      ctx.beginPath();
      ctx.arc(0, 22, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Glowing Palm Repulsor
      ctx.fillStyle = neonColor;
      ctx.beginPath();
      ctx.arc(0, 22, 2.5 + Math.sin(t * 8) * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Left & Right Hands
    drawRobotHand(-30, 36, leftArmAngle, false);
    drawRobotHand(30, 36, rightArmAngle, true);

    ctx.restore(); // End Torso

    // ── 4. CUTE 3D MINIATURE ROBOT HEAD & HELMET ──────────────────────────────
    ctx.save();
    ctx.translate(0, headOffsetY);
    ctx.rotate(headTilt);

    // Dynamic 3D Perspective Shift from Pointer
    const pX = this.pointerX * 4;
    const pY = this.pointerY * 3;

    // Top Antenna / Beacon
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(0, -66);
    ctx.stroke();

    // Antenna Glowing Status Beacon Orb
    const beaconGrad = ctx.createRadialGradient(0, -68, 1, 0, -68, 8);
    beaconGrad.addColorStop(0, "#ffffff");
    beaconGrad.addColorStop(0.5, neonColor);
    beaconGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = beaconGrad;
    ctx.beginPath();
    ctx.arc(0, -68, 6.5 + Math.sin(t * 8) * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ear Pods / Audio Fins (Left & Right)
    const drawEarPod = (ex: number, isRight: boolean) => {
      ctx.save();
      ctx.translate(ex, -12);
      const earGrad = ctx.createLinearGradient(-6, -16, 6, 16);
      earGrad.addColorStop(0, outfit.base);
      earGrad.addColorStop(1, "#050507");
      ctx.fillStyle = earGrad;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(isRight ? -2 : -10, -15, 12, 30, 5);
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Ring on Ear
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(isRight ? 4 : -4, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    drawEarPod(-44, false);
    drawEarPod(44, true);

    // 3D Cute Chibi Helmet Chassis (Outer Shell)
    const helmetGrad = ctx.createRadialGradient(-12, -24, 8, 0, -10, 52);
    helmetGrad.addColorStop(0, "#ffffff");
    helmetGrad.addColorStop(0.3, outfit.base);
    helmetGrad.addColorStop(0.8, outfit.shadow);
    helmetGrad.addColorStop(1, "#09090b");

    ctx.fillStyle = helmetGrad;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-42, -50, 84, 76, [34, 34, 28, 28]);
    ctx.fill();
    ctx.stroke();

    // ── 5. CURVED OLED / CRT VISOR SCREEN ─────────────────────────────────────
    const visorGrad = ctx.createLinearGradient(0, -36, 0, 18);
    visorGrad.addColorStop(0, "#050508");
    visorGrad.addColorStop(0.6, "#090912");
    visorGrad.addColorStop(1, "#020204");

    ctx.fillStyle = visorGrad;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-34 + pX * 0.5, -38 + pY * 0.5, 68, 56, [22, 22, 18, 18]);
    ctx.fill();
    ctx.stroke();

    // Dynamic Holographic Scanline Sweep
    const scanlineY = -36 + ((t * 25) % 52);
    ctx.fillStyle = `${neonColor}15`;
    ctx.fillRect(-32 + pX * 0.5, scanlineY + pY * 0.5, 64, 4);

    // Glass Visor 3D Specular Arc Reflection (Top Curvature Glare)
    const glassGlare = ctx.createLinearGradient(-30, -36, 30, -15);
    glassGlare.addColorStop(0, "rgba(255,255,255,0.45)");
    glassGlare.addColorStop(0.4, "rgba(255,255,255,0.1)");
    glassGlare.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glassGlare;
    ctx.beginPath();
    ctx.ellipse(pX * 0.6, -26 + pY * 0.6, 26, 9, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // ── 6. GLOWING EMOTIVE OLED EYES & MOUTH ──────────────────────────────────
    ctx.save();
    ctx.translate(pX, pY);

    const eyeColor = neonColor;

    if (eyeMorph === "BLINK") {
      // Sleek Horizontal Blinking Laser Line
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-22, -10);
      ctx.lineTo(-6, -10);
      ctx.moveTo(6, -10);
      ctx.lineTo(22, -10);
      ctx.stroke();
    } else if (eyeMorph === "HEART") {
      // 💖 Glowing Neon Hearts for Love
      const drawHeartEye = (hx: number) => {
        ctx.save();
        ctx.translate(hx, -10);
        const beat = 1 + Math.sin(t * 12) * 0.15;
        ctx.scale(beat, beat);
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.bezierCurveTo(-5, -4, -8, -1, -5, 4);
        ctx.lineTo(0, 9);
        ctx.lineTo(5, 4);
        ctx.bezierCurveTo(8, -1, 5, -4, 0, 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };
      drawHeartEye(-14);
      drawHeartEye(14);
    } else if (eyeMorph === "SQUINT") {
      // 😆 Curved Joyful Laughing Arcs ( ^ _ ^ )
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(-14, -7, 6.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(14, -7, 6.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (eyeMorph === "CRY") {
      // 🥺 Droopy Sad Puppy Eyes with Tear Drip ( T _ T )
      ctx.strokeStyle = eyeColor;
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(-14, -13, 6, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(14, -13, 6, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();

      // Animated Blue Tear Drop
      const tearY = -5 + ((t * 22) % 20);
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(14, tearY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (eyeMorph === "SHOCKED") {
      // 🤯 Shocked Wide Glowing Concentric Rings
      const drawShockEye = (ex: number) => {
        ctx.strokeStyle = eyeColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, -10, 7.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, -10, 2.5, 0, Math.PI * 2);
        ctx.fill();
      };
      drawShockEye(-14);
      drawShockEye(14);
    } else {
      // 🌟 Open Glowing Anime/Chibi Robot Eyes with 3D Pupil Tracking
      const drawRobotEye = (ex: number) => {
        // Glowing Background Sclera Capsule
        ctx.fillStyle = "#0c0c16";
        ctx.beginPath();
        ctx.roundRect(ex - 8, -19, 16, 18, 7);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3D Iris Center Offset by Cursor
        const irisX = ex + this.pointerX * 2.5;
        const irisY = -10 + this.pointerY * 2.0;

        // Radiant Iris Gradient
        const irisGrad = ctx.createRadialGradient(irisX, irisY, 1, irisX, irisY, 6.5);
        irisGrad.addColorStop(0, "#ffffff");
        irisGrad.addColorStop(0.5, eyeColor);
        irisGrad.addColorStop(1, "#050508");
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(irisX, irisY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Deep Pupil
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(irisX, irisY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Glass Catchlights (Double Specular)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(irisX - 1.8, irisY - 1.8, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(irisX + 1.5, irisY + 1.5, 1, 0, Math.PI * 2);
        ctx.fill();
      };

      drawRobotEye(-14);
      drawRobotEye(14);
    }

    // OLED Mouth
    ctx.strokeStyle = eyeColor;
    ctx.fillStyle = eyeColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";

    if (mouthMorph === "OPEN_LAUGH") {
      ctx.beginPath();
      ctx.arc(0, 3, 7, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    } else if (mouthMorph === "POUT") {
      ctx.beginPath();
      ctx.arc(0, 7, 4.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mouthMorph === "SHOCKED") {
      ctx.beginPath();
      ctx.ellipse(0, 5, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cute smiling arc
      ctx.beginPath();
      ctx.arc(0, 2, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // LED Blushing Cheek Dots
    ctx.fillStyle = "rgba(244, 114, 182, 0.65)";
    ctx.beginPath();
    ctx.arc(-22, -1, 3.5, 0, Math.PI * 2);
    ctx.arc(22, -1, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // End Visor contents

    // ── 7. GOLDEN AURA CROWN (GG / WINNER) ───────────────────────────────────
    if (showCrown) {
      ctx.save();
      ctx.translate(0, -62);
      const crownGrad = ctx.createLinearGradient(-15, -12, 15, 12);
      crownGrad.addColorStop(0, "#fde047");
      crownGrad.addColorStop(0.5, "#eab308");
      crownGrad.addColorStop(1, "#ca8a04");
      ctx.fillStyle = crownGrad;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-16, 6);
      ctx.lineTo(-20, -10);
      ctx.lineTo(-8, -3);
      ctx.lineTo(0, -14);
      ctx.lineTo(8, -3);
      ctx.lineTo(20, -10);
      ctx.lineTo(16, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // End Head
    ctx.restore(); // End Scaling

    // ── 8. PARTICLES (HEARTS, SPARKS, TEARS, FLAMES) ──────────────────────────
    this.updateParticles(0.016);
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.char) {
        ctx.font = `${p.size * 1.5}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.char, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
