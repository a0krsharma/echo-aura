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
 * 2.5D Realistic Canvas Rig Animation Driver
 */
export class AvatarRigDriver {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: AvatarConfig;
  private gesture: AvatarGesture = "IDLE";
  private time: number = 0;
  private animFrameId: number | null = null;
  private particles: Particle[] = [];

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

    // ── Kinematic Calculations based on Gesture ──────────────────────────────
    let headOffsetY = Math.sin(t * 3) * 1.8;
    let headTilt = Math.sin(t * 2) * 0.035;
    let torsoTilt = 0;
    let leftArmAngle = 0.22;
    let rightArmAngle = -0.22;
    let eyeMorph: "OPEN" | "BLINK" | "HEART" | "CRY" | "SQUINT" | "SHOCKED" = "OPEN";
    let mouthMorph: "SMILE" | "OPEN_LAUGH" | "POUT" | "SHOCKED" | "TALK" = "SMILE";
    let showBlush = true;
    let showCrown = false;

    // Natural periodic eye blink
    if (Math.sin(t * 1.4) > 0.94) {
      eyeMorph = "BLINK";
    }

    switch (this.gesture) {
      case "GREETING_WAVE":
        headTilt = Math.sin(t * 6) * 0.07;
        rightArmAngle = -1.7 + Math.sin(t * 11) * 0.4;
        eyeMorph = "OPEN";
        mouthMorph = "SMILE";
        if (Math.random() < 0.12) this.emitParticles(1, "✨", "#fde047");
        break;

      case "LOVE_HEART":
        headOffsetY = Math.sin(t * 5) * 3.5;
        eyeMorph = "HEART";
        mouthMorph = "SMILE";
        leftArmAngle = -1.15 + Math.sin(t * 4) * 0.08;
        rightArmAngle = 1.15 - Math.sin(t * 4) * 0.08;
        if (Math.random() < 0.16) this.emitParticles(1, "❤️", "#f43f5e");
        break;

      case "APOLOGY_BOW":
        torsoTilt = 0.28 + Math.sin(t * 3) * 0.04;
        headOffsetY = 12;
        headTilt = 0.18;
        eyeMorph = "CRY";
        mouthMorph = "POUT";
        leftArmAngle = 0.45;
        rightArmAngle = -0.45;
        if (Math.random() < 0.1) this.emitParticles(1, "💧", "#38bdf8");
        break;

      case "LOL_LAUGH":
        headOffsetY = Math.sin(t * 16) * 3.5;
        headTilt = Math.sin(t * 8) * 0.1;
        eyeMorph = "SQUINT";
        mouthMorph = "OPEN_LAUGH";
        leftArmAngle = 0.5 + Math.sin(t * 12) * 0.18;
        rightArmAngle = -0.5 - Math.sin(t * 12) * 0.18;
        if (Math.random() < 0.15) this.emitParticles(1, "🤣", "#facc15");
        break;

      case "GG_CLAP":
        leftArmAngle = -1.0 + Math.sin(t * 14) * 0.3;
        rightArmAngle = 1.0 - Math.sin(t * 14) * 0.3;
        eyeMorph = "OPEN";
        mouthMorph = "SMILE";
        showCrown = true;
        if (Math.random() < 0.15) this.emitParticles(1, "🎉", "#a855f7");
        break;

      case "MINDBLOWN":
        headOffsetY = -5 + Math.sin(t * 8) * 1.5;
        eyeMorph = "SHOCKED";
        mouthMorph = "SHOCKED";
        leftArmAngle = -1.5;
        rightArmAngle = 1.5;
        if (Math.random() < 0.2) this.emitParticles(1, "⚡", "#38bdf8");
        break;

      case "HYPE_FIRE":
        headOffsetY = Math.sin(t * 10) * 4;
        leftArmAngle = -1.95 + Math.sin(t * 8) * 0.18;
        rightArmAngle = 1.95 - Math.sin(t * 8) * 0.18;
        eyeMorph = "OPEN";
        mouthMorph = "OPEN_LAUGH";
        if (Math.random() < 0.25) this.emitParticles(2, "🔥", "#f97316");
        break;

      default:
        break;
    }

    // ── 1. Realistic 3D Torso & Cyber Jacket ─────────────────────────────────
    ctx.save();
    ctx.rotate(torsoTilt);

    // Torso Ambient Shadow
    ctx.fillStyle = outfit.shadow;
    ctx.beginPath();
    ctx.roundRect(-30, 24, 60, 48, [14, 14, 6, 6]);
    ctx.fill();

    // Torso Front Plate with 3D Gradient
    const torsoGrad = ctx.createLinearGradient(-30, 24, 30, 72);
    torsoGrad.addColorStop(0, outfit.base);
    torsoGrad.addColorStop(0.6, outfit.base);
    torsoGrad.addColorStop(1, outfit.shadow);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.roundRect(-28, 22, 56, 46, [12, 12, 4, 4]);
    ctx.fill();
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 2;
    ctx.stroke();

    // High Cyber Collar
    ctx.fillStyle = outfit.shadow;
    ctx.beginPath();
    ctx.roundRect(-16, 18, 32, 12, 4);
    ctx.fill();
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Metallic Zipper & Cyber Trim
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(0, 68);
    ctx.stroke();

    // Cyber Chest Badge
    ctx.fillStyle = outfit.trim;
    ctx.beginPath();
    ctx.roundRect(-18, 34, 10, 4, 1);
    ctx.fill();

    // ── 2. Realistic 3D Arms & Sculpted Hands ────────────────────────────────
    // Left Arm
    ctx.save();
    ctx.translate(-26, 28);
    ctx.rotate(leftArmAngle);
    // Shoulder & Arm Sleeve
    const lArmGrad = ctx.createLinearGradient(-6, 0, 6, 36);
    lArmGrad.addColorStop(0, outfit.base);
    lArmGrad.addColorStop(1, outfit.shadow);
    ctx.fillStyle = lArmGrad;
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-6, 0, 12, 36, 5);
    ctx.fill();
    ctx.stroke();
    // Left Hand (Palm + Thumb)
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(0, 39, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skin.shadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Right Arm
    ctx.save();
    ctx.translate(26, 28);
    ctx.rotate(rightArmAngle);
    // Shoulder & Arm Sleeve
    const rArmGrad = ctx.createLinearGradient(-6, 0, 6, 36);
    rArmGrad.addColorStop(0, outfit.base);
    rArmGrad.addColorStop(1, outfit.shadow);
    ctx.fillStyle = rArmGrad;
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-6, 0, 12, 36, 5);
    ctx.fill();
    ctx.stroke();
    // Right Hand (Palm + Thumb)
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(0, 39, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skin.shadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore Torso

    // ── 3. Realistic 3D Head, Face & Skin Shading ────────────────────────────
    ctx.save();
    ctx.translate(0, headOffsetY);
    ctx.rotate(headTilt);

    // Neck with 3D Ambient Shadow
    const neckGrad = ctx.createLinearGradient(-8, 12, 8, 24);
    neckGrad.addColorStop(0, skin.shadow);
    neckGrad.addColorStop(1, skin.base);
    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.roundRect(-8, 12, 16, 15, 3);
    ctx.fill();

    // 3D Spherical Head (Multi-stop Radial Lighting)
    const headGrad = ctx.createRadialGradient(-7, -12, 6, 0, -4, 46);
    headGrad.addColorStop(0, skin.highlight);
    headGrad.addColorStop(0.55, skin.base);
    headGrad.addColorStop(0.9, skin.shadow);
    headGrad.addColorStop(1, skin.shadow);

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.roundRect(-34, -40, 68, 62, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ears with Depth
    const drawEar = (ex: number) => {
      ctx.fillStyle = skin.base;
      ctx.beginPath();
      ctx.arc(ex, -8, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = skin.shadow;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Inner Ear Cavity
      ctx.fillStyle = skin.shadow;
      ctx.beginPath();
      ctx.arc(ex + (ex > 0 ? -1.5 : 1.5), -8, 3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEar(-34);
    drawEar(34);

    // Subtle 3D Nose Bridge & Tip
    ctx.fillStyle = skin.shadow;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-2, 3);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();

    // Blush Cheeks (Soft Gradient)
    if (showBlush) {
      ctx.fillStyle = skin.blush;
      ctx.beginPath();
      ctx.ellipse(-18, 4, 7.5, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(18, 4, 7.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 4. Realistic 3D Expressive Eyes ──────────────────────────────────────
    if (eyeMorph === "HEART") {
      // 3D Glowing Heart Eyes
      const drawHeart = (hx: number, hy: number) => {
        ctx.save();
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(hx - 3.5, hy - 2, 4.5, Math.PI, 0, false);
        ctx.arc(hx + 3.5, hy - 2, 4.5, Math.PI, 0, false);
        ctx.lineTo(hx, hy + 6.5);
        ctx.closePath();
        ctx.fill();
        // Heart Specular Highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(hx - 3.5, hy - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawHeart(-15, -10);
      drawHeart(15, -10);
    } else if (eyeMorph === "BLINK" || eyeMorph === "SQUINT") {
      // Sleek Curved Eyelashes
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-21, -9);
      ctx.quadraticCurveTo(-15, -14, -9, -9);
      ctx.moveTo(9, -9);
      ctx.quadraticCurveTo(15, -14, 21, -9);
      ctx.stroke();
    } else if (eyeMorph === "CRY") {
      // Tearful Anime Eyes
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-10, -11);
      ctx.moveTo(20, -8);
      ctx.lineTo(10, -11);
      ctx.stroke();

      // Shimmering Teardrops
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(-15, 2, 4.5, 0, Math.PI * 2);
      ctx.arc(15, 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-16, 1, 1.5, 0, Math.PI * 2);
      ctx.arc(14, 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (eyeMorph === "SHOCKED") {
      // Shocked Wide Eyes
      const drawShockEye = (ex: number) => {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, -10, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Tiny Pupil
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(ex, -10, 3, 0, Math.PI * 2);
        ctx.fill();
      };
      drawShockEye(-15);
      drawShockEye(15);
    } else {
      // 🌟 Realistic Iris with Glass Specular Catchlights
      const drawRealisticEye = (ex: number) => {
        // Sclera (White base with upper eyelid shadow)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(ex, -10, 7.5, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Upper Eyelid Ambient Shadow
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.arc(ex, -10, 7.5, Math.PI, 0);
        ctx.fill();

        // Glowing Colored Iris (Radial Gradient)
        const irisGrad = ctx.createRadialGradient(ex, -9.5, 1, ex, -9.5, 5);
        irisGrad.addColorStop(0, skin.iris);
        irisGrad.addColorStop(0.7, skin.iris);
        irisGrad.addColorStop(1, "#09090b");
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ex, -9.5, 4.8, 0, Math.PI * 2);
        ctx.fill();

        // Deep Pupil
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(ex, -9.5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Glass Catchlights (Double Specular)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - 1.8, -11.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + 1.5, -8, 1, 0, Math.PI * 2);
        ctx.fill();

        // Upper Eyelash Line
        ctx.strokeStyle = "#18181b";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(ex, -10, 7.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      };
      drawRealisticEye(-15);
      drawRealisticEye(15);
    }

    // Eyebrows
    ctx.strokeStyle = hair.shadow;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-21, -19);
    ctx.quadraticCurveTo(-15, -21, -9, -19);
    ctx.moveTo(9, -19);
    ctx.quadraticCurveTo(15, -21, 21, -19);
    ctx.stroke();

    // ── 5. Realistic Mouth Morphs ────────────────────────────────────────────
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";

    if (mouthMorph === "OPEN_LAUGH") {
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(0, 6, 9.5, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // White Teeth
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.rect(-6.5, 6, 13, 3.5);
      ctx.fill();
    } else if (mouthMorph === "POUT") {
      ctx.beginPath();
      ctx.arc(0, 11, 5.5, Math.PI, 0);
      ctx.stroke();
    } else if (mouthMorph === "SHOCKED") {
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.ellipse(0, 8, 4.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Natural Smile
      ctx.beginPath();
      ctx.arc(0, 4.5, 7.5, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }

    // ── 6. Realistic 3D Hair Styles with Specular Sheen ──────────────────────
    ctx.fillStyle = hair.base;
    ctx.strokeStyle = hair.shadow;
    ctx.lineWidth = 1.8;

    switch (this.config.hairStyle) {
      case "CYBER_FADE":
        // Textured Undercut Fade
        ctx.beginPath();
        ctx.roundRect(-35, -52, 70, 22, [14, 14, 0, 0]);
        ctx.fill();
        ctx.stroke();
        // Glossy Sheen Highlight Across Crown
        ctx.fillStyle = hair.sheen;
        ctx.beginPath();
        ctx.roundRect(-24, -49, 48, 4.5, 2);
        ctx.fill();
        break;

      case "CURLY_AFRO":
        ctx.beginPath();
        ctx.arc(0, -30, 42, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();
        ctx.stroke();
        // Texture Rings
        ctx.strokeStyle = hair.sheen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-14, -36, 8, 0, Math.PI);
        ctx.arc(14, -36, 8, 0, Math.PI);
        ctx.stroke();
        break;

      case "NEON_BOB":
        ctx.beginPath();
        ctx.roundRect(-38, -50, 76, 46, [18, 18, 10, 10]);
        ctx.fill();
        ctx.stroke();
        // Hair Sheen Band
        ctx.fillStyle = hair.sheen;
        ctx.beginPath();
        ctx.roundRect(-28, -44, 56, 4, 2);
        ctx.fill();
        break;

      case "SPIKY_ANIME":
        ctx.beginPath();
        ctx.moveTo(-34, -36);
        ctx.lineTo(-40, -56);
        ctx.lineTo(-22, -45);
        ctx.lineTo(-10, -64);
        ctx.lineTo(5, -46);
        ctx.lineTo(22, -62);
        ctx.lineTo(34, -36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Spike Specular Highlights
        ctx.strokeStyle = hair.sheen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-9, -60);
        ctx.lineTo(-12, -48);
        ctx.moveTo(20, -58);
        ctx.lineTo(16, -48);
        ctx.stroke();
        break;

      case "PUNK_DREADS":
        ctx.beginPath();
        ctx.roundRect(-35, -53, 70, 24, [14, 14, 4, 4]);
        ctx.fill();
        ctx.stroke();
        // Dreadlocks Strands
        ctx.beginPath();
        ctx.roundRect(-39, -28, 9, 32, 4);
        ctx.roundRect(30, -28, 9, 32, 4);
        ctx.fill();
        ctx.stroke();
        break;

      default:
        break;
    }

    // ── 7. Eyewear & Cyber Accessories ───────────────────────────────────────
    if (this.config.eyewear === "CYBER_VISOR") {
      ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-28, -16, 56, 13, 3.5);
      ctx.fill();
      ctx.stroke();

      // Visor Neon Laser Beam
      ctx.strokeStyle = "#a5f3fc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-22, -9.5);
      ctx.lineTo(22, -9.5);
      ctx.stroke();
    } else if (this.config.eyewear === "RETRO_SHADES") {
      ctx.fillStyle = "#09090b";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-24, -15, 20, 12, 3);
      ctx.roundRect(4, -15, 20, 12, 3);
      ctx.fill();
      ctx.stroke();
      // Glass Flare
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-20, -12);
      ctx.lineTo(-8, -6);
      ctx.stroke();
    } else if (this.config.eyewear === "WIREFRAME_GLASSES") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-15, -10, 9, 0, Math.PI * 2);
      ctx.arc(15, -10, 9, 0, Math.PI * 2);
      ctx.moveTo(-6, -10);
      ctx.lineTo(6, -10);
      ctx.stroke();
    }

    // GG Crown Overlay
    if (showCrown) {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -44);
      ctx.lineTo(-22, -60);
      ctx.lineTo(-8, -52);
      ctx.lineTo(0, -66);
      ctx.lineTo(8, -52);
      ctx.lineTo(22, -60);
      ctx.lineTo(16, -44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore(); // Restore Head
    ctx.restore(); // Restore Root Scale

    // ── 8. Render Floating Particles ─────────────────────────────────────────
    this.updateParticles(1 / 60);
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.char) {
        ctx.font = `${p.size * 2}px sans-serif`;
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
