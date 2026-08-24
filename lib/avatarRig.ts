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

export const SKIN_PALETTES: Record<AvatarSkinTone, { base: string; shadow: string; highlight: string; blush: string }> = {
  IVORY: { base: "#ffe4d6", shadow: "#f5c6b0", highlight: "#fff3ec", blush: "rgba(255, 120, 150, 0.4)" },
  CARAMEL: { base: "#d99b66", shadow: "#b87843", highlight: "#eec19a", blush: "rgba(230, 90, 110, 0.35)" },
  ESPRESSO: { base: "#6e432b", shadow: "#4e2b19", highlight: "#8c5b3e", blush: "rgba(210, 80, 100, 0.3)" },
  ALMOND: { base: "#f2c199", shadow: "#d99f73", highlight: "#fde3cb", blush: "rgba(255, 110, 130, 0.4)" },
  CYAN: { base: "#06b6d4", shadow: "#0891b2", highlight: "#67e8f9", blush: "rgba(168, 85, 247, 0.4)" },
  OBSIDIAN: { base: "#262626", shadow: "#171717", highlight: "#404040", blush: "rgba(244, 63, 94, 0.35)" },
};

export const HAIR_PALETTES: Record<AvatarHairColor, { base: string; highlight: string }> = {
  BLACK: { base: "#171717", highlight: "#404040" },
  BLONDE: { base: "#facc15", highlight: "#fef08a" },
  NEON_PINK: { base: "#ec4899", highlight: "#f472b6" },
  CYAN: { base: "#06b6d4", highlight: "#67e8f9" },
  EMERALD: { base: "#10b981", highlight: "#6ee7b7" },
  PURPLE: { base: "#a855f7", highlight: "#d8b4fe" },
  WHITE: { base: "#e5e5e5", highlight: "#ffffff" },
};

export const OUTFIT_PALETTES: Record<AvatarOutfitColor, { base: string; trim: string }> = {
  OBSIDIAN: { base: "#18181b", trim: "#ffffff" },
  WHITE: { base: "#f4f4f5", trim: "#000000" },
  CRIMSON: { base: "#dc2626", trim: "#fca5a5" },
  EMERALD: { base: "#059669", trim: "#6ee7b7" },
  CYAN: { base: "#0891b2", trim: "#67e8f9" },
  AMBER: { base: "#d97706", trim: "#fde68a" },
};

export interface GestureMeta {
  type: AvatarGesture;
  label: string;
  emoji: string;
  tagline: string;
  soundType: "fanfare" | "chime" | "cheer" | "snare" | "gong" | "airhorn" | "pop";
}

export const GESTURE_CATALOG: Record<AvatarGesture, GestureMeta> = {
  IDLE: { type: "IDLE", label: "Neutral", emoji: "🙂", tagline: "Standing by", soundType: "pop" },
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
 * 2.5D Canvas Rig Animation Driver
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
    this.particles = []; // Reset particles on gesture switch
  }

  public start() {
    if (this.animFrameId) return;
    const renderLoop = (t: number) => {
      this.time = t * 0.001; // in seconds
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
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 60 - 20,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 50 - 20,
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

    const cx = width / 2;
    const cy = height * 0.52;
    const scale = Math.min(width, height) / 240;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const t = this.time;
    const skin = SKIN_PALETTES[this.config.skinTone] || SKIN_PALETTES.ALMOND;
    const hair = HAIR_PALETTES[this.config.hairColor] || HAIR_PALETTES.CYAN;
    const outfit = OUTFIT_PALETTES[this.config.outfitColor] || OUTFIT_PALETTES.OBSIDIAN;

    // ── Kinematic Calculations based on Gesture ──────────────────────────────
    let headOffsetY = Math.sin(t * 3) * 2;
    let headTilt = Math.sin(t * 2) * 0.04;
    let torsoTilt = 0;
    let leftArmAngle = 0.2;
    let rightArmAngle = -0.2;
    let eyeMorph: "OPEN" | "BLINK" | "HEART" | "CRY" | "SQUINT" | "SHOCKED" = "OPEN";
    let mouthMorph: "SMILE" | "OPEN_LAUGH" | "POUT" | "SHOCKED" | "TALK" = "SMILE";
    let showBlush = true;
    let showSweat = false;
    let showCrown = false;

    // Natural periodic eye blink
    if (Math.sin(t * 1.5) > 0.95) {
      eyeMorph = "BLINK";
    }

    switch (this.gesture) {
      case "GREETING_WAVE":
        headTilt = Math.sin(t * 6) * 0.08;
        rightArmAngle = -1.8 + Math.sin(t * 12) * 0.45; // Rapid wave
        eyeMorph = "OPEN";
        mouthMorph = "SMILE";
        if (Math.random() < 0.1) this.emitParticles(1, "✨", "#fde047");
        break;

      case "LOVE_HEART":
        headOffsetY = Math.sin(t * 5) * 4;
        eyeMorph = "HEART";
        mouthMorph = "SMILE";
        leftArmAngle = -1.2 + Math.sin(t * 4) * 0.1;
        rightArmAngle = 1.2 - Math.sin(t * 4) * 0.1;
        if (Math.random() < 0.15) this.emitParticles(1, "❤️", "#f43f5e");
        break;

      case "APOLOGY_BOW":
        torsoTilt = 0.35 + Math.sin(t * 3) * 0.05;
        headOffsetY = 15;
        headTilt = 0.2;
        eyeMorph = "CRY";
        mouthMorph = "POUT";
        leftArmAngle = 0.5;
        rightArmAngle = -0.5;
        showSweat = true;
        if (Math.random() < 0.1) this.emitParticles(1, "💧", "#38bdf8");
        break;

      case "LOL_LAUGH":
        headOffsetY = Math.sin(t * 16) * 4; // Fast bounce
        headTilt = Math.sin(t * 8) * 0.12;
        eyeMorph = "SQUINT";
        mouthMorph = "OPEN_LAUGH";
        leftArmAngle = 0.6 + Math.sin(t * 12) * 0.2;
        rightArmAngle = -0.6 - Math.sin(t * 12) * 0.2;
        if (Math.random() < 0.15) this.emitParticles(1, "🤣", "#facc15");
        break;

      case "GG_CLAP":
        leftArmAngle = -1.1 + Math.sin(t * 14) * 0.35;
        rightArmAngle = 1.1 - Math.sin(t * 14) * 0.35;
        eyeMorph = "OPEN";
        mouthMorph = "SMILE";
        showCrown = true;
        if (Math.random() < 0.15) this.emitParticles(1, "🎉", "#a855f7");
        break;

      case "MINDBLOWN":
        headOffsetY = -6 + Math.sin(t * 8) * 2;
        eyeMorph = "SHOCKED";
        mouthMorph = "SHOCKED";
        leftArmAngle = -1.6;
        rightArmAngle = 1.6;
        if (Math.random() < 0.2) this.emitParticles(1, "⚡", "#38bdf8");
        break;

      case "HYPE_FIRE":
        headOffsetY = Math.sin(t * 10) * 5;
        leftArmAngle = -2.1 + Math.sin(t * 8) * 0.2;
        rightArmAngle = 2.1 - Math.sin(t * 8) * 0.2;
        eyeMorph = "OPEN";
        mouthMorph = "OPEN_LAUGH";
        if (Math.random() < 0.25) this.emitParticles(2, "🔥", "#f97316");
        break;

      default:
        // Idle breathing
        break;
    }

    // ── 1. Render Torso & Outfit ─────────────────────────────────────────────
    ctx.save();
    ctx.rotate(torsoTilt);

    // Torso Base
    ctx.fillStyle = outfit.base;
    ctx.beginPath();
    ctx.roundRect(-30, 25, 60, 55, [12, 12, 4, 4]);
    ctx.fill();
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Collar / Neon trim
    ctx.fillStyle = outfit.trim;
    ctx.beginPath();
    ctx.moveTo(-14, 25);
    ctx.lineTo(0, 38);
    ctx.lineTo(14, 25);
    ctx.lineWidth = 3;
    ctx.strokeStyle = outfit.trim;
    ctx.stroke();

    // ── 2. Render Arms / Limbs ───────────────────────────────────────────────
    // Left Arm
    ctx.save();
    ctx.translate(-28, 32);
    ctx.rotate(leftArmAngle);
    ctx.fillStyle = outfit.base;
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 42, 6);
    ctx.fill();
    ctx.stroke();
    // Left Hand
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(0, 44, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Arm
    ctx.save();
    ctx.translate(28, 32);
    ctx.rotate(rightArmAngle);
    ctx.fillStyle = outfit.base;
    ctx.strokeStyle = outfit.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-7, 0, 14, 42, 6);
    ctx.fill();
    ctx.stroke();
    // Right Hand
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(0, 44, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Restore Torso

    // ── 3. Render Head, Hair & Face ──────────────────────────────────────────
    ctx.save();
    ctx.translate(0, headOffsetY);
    ctx.rotate(headTilt);

    // Neck
    ctx.fillStyle = skin.shadow;
    ctx.beginPath();
    ctx.roundRect(-9, 15, 18, 16, 4);
    ctx.fill();

    // Head Base (2.5D Shaded)
    const headGrad = ctx.createRadialGradient(-6, -10, 8, 0, 0, 48);
    headGrad.addColorStop(0, skin.highlight);
    headGrad.addColorStop(0.7, skin.base);
    headGrad.addColorStop(1, skin.shadow);

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.roundRect(-36, -42, 72, 68, 28);
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Ears
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(-37, -10, 7, 0, Math.PI * 2);
    ctx.arc(37, -10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Blush Cheeks
    if (showBlush) {
      ctx.fillStyle = skin.blush;
      ctx.beginPath();
      ctx.ellipse(-20, 2, 8, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(20, 2, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 4. Facial Morph Targets (Eyes & Eyebrows) ────────────────────────────
    if (eyeMorph === "HEART") {
      // Heart Eyes
      ctx.fillStyle = "#f43f5e";
      const drawHeart = (hx: number, hy: number) => {
        ctx.beginPath();
        ctx.arc(hx - 3.5, hy - 2, 4.5, Math.PI, 0, false);
        ctx.arc(hx + 3.5, hy - 2, 4.5, Math.PI, 0, false);
        ctx.lineTo(hx, hy + 6.5);
        ctx.closePath();
        ctx.fill();
      };
      drawHeart(-16, -12);
      drawHeart(16, -12);
    } else if (eyeMorph === "BLINK" || eyeMorph === "SQUINT") {
      // Squint / Blink Lashes
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.quadraticCurveTo(-16, -16, -10, -12);
      ctx.moveTo(10, -12);
      ctx.quadraticCurveTo(16, -16, 22, -12);
      ctx.stroke();
    } else if (eyeMorph === "CRY") {
      // Tearful Eyes
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, -10);
      ctx.lineTo(-10, -14);
      ctx.moveTo(22, -10);
      ctx.lineTo(10, -14);
      ctx.stroke();

      // Big Teardrops
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(-16, 0, 4, 0, Math.PI * 2);
      ctx.arc(16, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (eyeMorph === "SHOCKED") {
      // Big Wide Open Eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-16, -12, 9, 0, Math.PI * 2);
      ctx.arc(16, -12, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Small Tiny Pupils
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(-16, -12, 3, 0, Math.PI * 2);
      ctx.arc(16, -12, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standard Expressive Eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-16, -12, 7.5, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(16, -12, 7.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pupils with Catchlights
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(-16, -11, 4.5, 0, Math.PI * 2);
      ctx.arc(16, -11, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-18, -13, 2, 0, Math.PI * 2);
      ctx.arc(14, -13, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 5. Mouth Morph Targets ───────────────────────────────────────────────
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    if (mouthMorph === "OPEN_LAUGH") {
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(0, 7, 10, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Teeth
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.rect(-7, 7, 14, 4);
      ctx.fill();
    } else if (mouthMorph === "POUT") {
      ctx.beginPath();
      ctx.arc(0, 13, 6, Math.PI, 0); // Inverted curve
      ctx.stroke();
    } else if (mouthMorph === "SHOCKED") {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(0, 10, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Standard Smile
      ctx.beginPath();
      ctx.arc(0, 5, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // ── 6. Hair Styles ───────────────────────────────────────────────────────
    ctx.fillStyle = hair.base;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;

    switch (this.config.hairStyle) {
      case "CYBER_FADE":
        ctx.beginPath();
        ctx.roundRect(-37, -54, 74, 22, [14, 14, 0, 0]);
        ctx.fill();
        ctx.stroke();
        break;

      case "CURLY_AFRO":
        ctx.beginPath();
        ctx.arc(0, -32, 44, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();
        ctx.stroke();
        break;

      case "NEON_BOB":
        ctx.beginPath();
        ctx.roundRect(-42, -52, 84, 48, [20, 20, 12, 12]);
        ctx.fill();
        ctx.stroke();
        break;

      case "SPIKY_ANIME":
        ctx.beginPath();
        ctx.moveTo(-36, -38);
        ctx.lineTo(-44, -60);
        ctx.lineTo(-24, -48);
        ctx.lineTo(-10, -68);
        ctx.lineTo(6, -50);
        ctx.lineTo(24, -66);
        ctx.lineTo(36, -38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case "PUNK_DREADS":
        ctx.beginPath();
        ctx.roundRect(-38, -56, 76, 26, [16, 16, 4, 4]);
        ctx.fill();
        ctx.stroke();
        // Side strands
        ctx.beginPath();
        ctx.roundRect(-42, -30, 10, 36, 4);
        ctx.roundRect(32, -30, 10, 36, 4);
        ctx.fill();
        ctx.stroke();
        break;

      default:
        // Bald / Minimal
        break;
    }

    // ── 7. Eyewear & Cyber Accessories ───────────────────────────────────────
    if (this.config.eyewear === "CYBER_VISOR") {
      ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-30, -18, 60, 14, 4);
      ctx.fill();
      ctx.stroke();

      // Visor Glow Line
      ctx.strokeStyle = "#a5f3fc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-24, -11);
      ctx.lineTo(24, -11);
      ctx.stroke();
    } else if (this.config.eyewear === "RETRO_SHADES") {
      ctx.fillStyle = "#000000";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-26, -17, 22, 13, 3);
      ctx.roundRect(4, -17, 22, 13, 3);
      ctx.fill();
      ctx.stroke();
    } else if (this.config.eyewear === "WIREFRAME_GLASSES") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-16, -12, 10, 0, Math.PI * 2);
      ctx.arc(16, -12, 10, 0, Math.PI * 2);
      ctx.moveTo(-6, -12);
      ctx.lineTo(6, -12);
      ctx.stroke();
    }

    // GG Crown Overlay
    if (showCrown) {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -48);
      ctx.lineTo(-24, -66);
      ctx.lineTo(-8, -56);
      ctx.lineTo(0, -72);
      ctx.lineTo(8, -56);
      ctx.lineTo(24, -66);
      ctx.lineTo(18, -48);
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
