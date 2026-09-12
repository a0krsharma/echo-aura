/**
 * lib/partyMusicEngine.ts
 * ─────────────────────────────────────────────────────
 * Synchronized Party Music & Spotify-Style Host DJ Engine
 * - Plays continuously during all party games (UNO, Ludo, Spin the Bottle, RPS, Antakshari, Raja Mantri)
 * - Synced room music state with track details, progress, and volume
 * - "Vote to change/skip song if not liked" functionality
 * - Procedural Web Audio music synthesis across Bollywood, Punjabi, EDM, and Desi Lo-Fi
 */

export interface PartyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: "bollywood" | "punjabi" | "lofi" | "edm" | "antakshari";
  coverArt: string;
  bpm: number;
  durationSeconds: number;
  vibe: string;
}

export const PARTY_PLAYLIST: PartyTrack[] = [
  {
    id: "kala_chashma",
    title: "Kala Chashma (Club Remix)",
    artist: "Badshah & Neha Kakkar",
    album: "Baar Baar Dekho",
    genre: "bollywood",
    coverArt: "🕶️",
    bpm: 128,
    durationSeconds: 185,
    vibe: "High Energy Dance",
  },
  {
    id: "lover_diljit",
    title: "Lover (Bhangra Club Vibe)",
    artist: "Diljit Dosanjh",
    album: "MoonChild Era",
    genre: "punjabi",
    coverArt: "🔥",
    bpm: 122,
    durationSeconds: 195,
    vibe: "Punjabi Party Heat",
  },
  {
    id: "kesariya_lofi",
    title: "Kesariya (Acoustic Night Lofi)",
    artist: "Arijit Singh & Pritam",
    album: "Brahmastra Chill",
    genre: "lofi",
    coverArt: "🌸",
    bpm: 90,
    durationSeconds: 210,
    vibe: "Romantic Late Night",
  },
  {
    id: "apna_bana_le",
    title: "Apna Bana Le (Midnight Lounge)",
    artist: "Arijit Singh & Sachin-Jigar",
    album: "Bhediya Acoustic",
    genre: "lofi",
    coverArt: "🌙",
    bpm: 86,
    durationSeconds: 220,
    vibe: "Sukoon & Cozy",
  },
  {
    id: "dhoom_machale",
    title: "Dhoom Machale (Festival EDM Mix)",
    artist: "Sunidhi Chauhan",
    album: "Dhoom Anthem",
    genre: "edm",
    coverArt: "⚡",
    bpm: 130,
    durationSeconds: 175,
    vibe: "Peak Party Banger",
  },
  {
    id: "antakshari_medley",
    title: "Antakshari Golden Medley",
    artist: "Kishore & Lata & Rafi Classics",
    album: "Retro Antakshari Live",
    genre: "antakshari",
    coverArt: "🎤",
    bpm: 108,
    durationSeconds: 240,
    vibe: "Sing-Along Chain",
  },
  {
    id: "mundian_bach_ke",
    title: "Mundian To Bach Ke (Bhangra Bass)",
    artist: "Panjabi MC & Labh Janjua",
    album: "The Album",
    genre: "punjabi",
    coverArt: "🥁",
    bpm: 125,
    durationSeconds: 190,
    vibe: "Dhol & Tumbi Power",
  },
  {
    id: "chaiyya_chaiyya_speed",
    title: "Chaiyya Chaiyya (138 BPM Turbo EDM)",
    artist: "Sukhwinder Singh & A.R. Rahman",
    album: "Dil Se Club Remix",
    genre: "bollywood",
    coverArt: "🚂",
    bpm: 138,
    durationSeconds: 195,
    vibe: "Fast Dance Banger",
  },
  {
    id: "boiler_room_banger",
    title: "Boiler Room Cyber Drop (142 BPM)",
    artist: "DJ Aura & Neon Grid",
    album: "Rave Station 2026",
    genre: "edm",
    coverArt: "🔥",
    bpm: 142,
    durationSeconds: 180,
    vibe: "142 BPM Peak Techno",
  },
  {
    id: "brown_munde_drill",
    title: "Brown Munde (135 BPM Club Drill)",
    artist: "AP Dhillon & Gurinder Gill",
    album: "Not by Chance Club",
    genre: "punjabi",
    coverArt: "⚡",
    bpm: 135,
    durationSeconds: 185,
    vibe: "High Energy Punjabi",
  },
  {
    id: "tauba_tauba_fast",
    title: "Tauba Tauba (132 BPM Groovy Club)",
    artist: "Karan Aujla",
    album: "Bad Newz Party",
    genre: "punjabi",
    coverArt: "🕺",
    bpm: 132,
    durationSeconds: 175,
    vibe: "Fast Bollywood Punjabi",
  },
  {
    id: "spotify_lofi_drive",
    title: "Midnight Tokyo Expressway (Lo-Fi)",
    artist: "Echo Aura Beats",
    album: "Chillhop 2026",
    genre: "lofi",
    coverArt: "🌧️",
    bpm: 88,
    durationSeconds: 180,
    vibe: "Jazzy Chillout",
  },
];

class PartyMusicEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private volume = 0.35;
  private trackTimer: any = null;
  private beatInterval: any = null;
  private elapsedSeconds = 0;
  private skipVotes = new Set<string>();
  private isExternalAudio = false;
  private listeners = new Set<(state: any) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      // Load saved volume
      try {
        const savedVol = localStorage.getItem("echo_party_volume");
        if (savedVol) this.volume = parseFloat(savedVol);
      } catch {}
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window !== "undefined") {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
    }
    return this.audioCtx;
  }

  public getState() {
    const track = PARTY_PLAYLIST[this.currentTrackIndex];
    const progress = Math.min(100, Math.floor((this.elapsedSeconds / track.durationSeconds) * 100));
    return {
      track,
      trackIndex: this.currentTrackIndex,
      isPlaying: this.isPlaying,
      isExternalAudio: this.isExternalAudio,
      volume: this.volume,
      elapsedSeconds: this.elapsedSeconds,
      progress,
      skipVotesCount: this.skipVotes.size,
      playlist: PARTY_PLAYLIST,
    };
  }

  public setExternalAudio(isExternal: boolean) {
    this.isExternalAudio = isExternal;
    if (isExternal) {
      this.stopAudioSynthesis();
    } else if (this.isPlaying) {
      this.startAudioSynthesis();
    }
    this.notify();
  }

  public subscribe(cb: (state: any) => void) {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(index?: number) {
    if (typeof index === "number" && index >= 0 && index < PARTY_PLAYLIST.length) {
      this.currentTrackIndex = index;
      this.elapsedSeconds = 0;
      this.skipVotes.clear();
      // If user manually selects a non-Spotify party track, resume internal audio
      if (!PARTY_PLAYLIST[index].album.includes("Spotify Live")) {
        this.isExternalAudio = false;
      }
    }

    this.isPlaying = true;
    if (!this.isExternalAudio) {
      this.startAudioSynthesis();
    } else {
      this.stopAudioSynthesis();
    }

    if (this.trackTimer) clearInterval(this.trackTimer);
    this.trackTimer = setInterval(() => {
      const cur = PARTY_PLAYLIST[this.currentTrackIndex];
      this.elapsedSeconds++;
      if (this.elapsedSeconds >= cur.durationSeconds) {
        this.nextTrack();
      } else {
        this.notify();
      }
    }, 1000);

    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    this.stopAudioSynthesis();
    if (this.trackTimer) {
      clearInterval(this.trackTimer);
      this.trackTimer = null;
    }
    this.notify();
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % PARTY_PLAYLIST.length;
    this.elapsedSeconds = 0;
    this.skipVotes.clear();
    this.isExternalAudio = false;
    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public previousTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + PARTY_PLAYLIST.length) % PARTY_PLAYLIST.length;
    this.elapsedSeconds = 0;
    this.skipVotes.clear();
    this.isExternalAudio = false;
    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public playSpotifyTrack(track: {
    id: string;
    title: string;
    artist: string;
    bpm?: number;
    durationSeconds?: number;
    coverArt?: string;
  }) {
    this.isExternalAudio = true;
    this.stopAudioSynthesis();

    const existingIdx = PARTY_PLAYLIST.findIndex(
      (t) => t.id === track.id || t.title.toLowerCase() === track.title.toLowerCase()
    );
    if (existingIdx !== -1) {
      this.currentTrackIndex = existingIdx;
      this.elapsedSeconds = 0;
      this.isPlaying = true;
      this.notify();
    } else {
      const newTrack: PartyTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: "Spotify Live Room Sync",
        genre: "edm",
        coverArt: track.coverArt || "🟢",
        bpm: track.bpm || 128,
        durationSeconds: track.durationSeconds || 195,
        vibe: "Spotify Live Room Sync",
      };
      PARTY_PLAYLIST.unshift(newTrack);
      this.currentTrackIndex = 0;
      this.elapsedSeconds = 0;
      this.isPlaying = true;
      this.notify();
    }
  }

  public voteToSkip(userHandle: string): { skipped: boolean; message: string } {
    this.skipVotes.add(userHandle);
    // Instant skip for party flow or 2 votes
    this.nextTrack();
    return {
      skipped: true,
      message: `⏭️ @${userHandle} changed the song to "${PARTY_PLAYLIST[this.currentTrackIndex].title}"!`,
    };
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem("echo_party_volume", this.volume.toString());
    } catch {}
    this.notify();
  }

  // ── PROCEDURAL SYNTHESIS ENGINE (Real Web Audio that plays in browser) ──
  private startAudioSynthesis() {
    this.stopAudioSynthesis();
    const ctx = this.getContext();
    if (!ctx) return;

    const track = PARTY_PLAYLIST[this.currentTrackIndex];
    const bpm = track.bpm || 120;
    const beatIntervalMs = (60 / bpm) * 1000;

    let step = 0;

    // Musical scale notes based on genre
    const scales: Record<PartyTrack["genre"], number[]> = {
      bollywood: [130.81, 155.56, 174.61, 196.0, 233.08, 261.63], // D minor dance
      punjabi: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66],   // D Bhangra groove
      lofi: [174.61, 220.0, 261.63, 329.63, 392.0, 440.0],       // F major 7th chill
      edm: [110.0, 130.81, 146.83, 164.81, 196.0, 220.0],        // A minor punch
      antakshari: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63], // E minor Desi pop
    };

    const curScale = scales[track.genre] || scales.bollywood;

    this.beatInterval = setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;
      const t = this.audioCtx.currentTime;

      // 1. Kick Drum / Dhol Bass (On beats 0 and 2 of 4)
      if (step % 4 === 0 || (track.genre === "punjabi" && step % 2 === 0)) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = "sine";
        const startPitch = track.genre === "punjabi" ? 150 : 130;
        osc.frequency.setValueAtTime(startPitch, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
        gain.gain.setValueAtTime(0.4 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      }

      // 2. Snare / Clapping off-beat (On beats 1 and 3 of 4)
      if (step % 2 === 1) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = track.genre === "lofi" ? "triangle" : "sawtooth";
        osc.frequency.setValueAtTime(220, t);
        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
      }

      // 3. Melodic Hook Arpeggio / Synths
      const noteFreq = curScale[step % curScale.length];
      const melOsc = this.audioCtx.createOscillator();
      const melGain = this.audioCtx.createGain();
      melOsc.type = track.genre === "lofi" ? "sine" : track.genre === "edm" ? "sawtooth" : "triangle";
      melOsc.frequency.setValueAtTime(noteFreq * (step % 2 === 0 ? 1 : 1.5), t);
      melGain.gain.setValueAtTime(0.18 * this.volume, t);
      melGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      melOsc.connect(melGain);
      melGain.connect(this.audioCtx.destination);
      melOsc.start(t);
      melOsc.stop(t + 0.22);

      // 4. Subtle Hi-Hat Ticks
      const hatOsc = this.audioCtx.createOscillator();
      const hatGain = this.audioCtx.createGain();
      hatOsc.type = "square";
      hatOsc.frequency.setValueAtTime(7000, t);
      hatGain.gain.setValueAtTime(0.06 * this.volume, t);
      hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      hatOsc.connect(hatGain);
      hatGain.connect(this.audioCtx.destination);
      hatOsc.start(t);
      hatOsc.stop(t + 0.03);

      step++;
    }, beatIntervalMs / 2); // 8th notes
  }

  private stopAudioSynthesis() {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }
}

export const partyMusicEngine = new PartyMusicEngine();
