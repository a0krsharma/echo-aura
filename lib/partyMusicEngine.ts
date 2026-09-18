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
  genre: "bollywood" | "punjabi" | "lofi" | "edm" | "antakshari" | "spotify";
  coverArt: string;
  bpm: number;
  durationSeconds: number;
  vibe: string;
}

// Static playlist is empty — all music comes via Spotify/YouTube sync
export const PARTY_PLAYLIST: PartyTrack[] = [];

// Fallback placeholder when no playlist tracks exist
const PLACEHOLDER_TRACK: PartyTrack = {
  id: "echo_space_music",
  title: "Queue Any Song from Spotify",
  artist: "Echo Co-Listening",
  album: "Spotify Co-Listening",
  genre: "spotify",
  coverArt: "🟢",
  bpm: 120,
  durationSeconds: 210,
  vibe: "Live Audio",
};

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

  // Active Spotify track stored separately — doesn't pollute PARTY_PLAYLIST
  private activeSpotifyTrack: PartyTrack | null = null;

  constructor() {
    if (typeof window !== "undefined") {
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

  private getCurrentTrack(): PartyTrack {
    // If Spotify is active, use the Spotify track
    if (this.isExternalAudio && this.activeSpotifyTrack) {
      return this.activeSpotifyTrack;
    }
    // Otherwise use the playlist or fallback
    return PARTY_PLAYLIST[this.currentTrackIndex] ?? PLACEHOLDER_TRACK;
  }

  public getState() {
    const track = this.getCurrentTrack();
    const progress =
      track.durationSeconds > 0
        ? Math.min(100, Math.floor((this.elapsedSeconds / track.durationSeconds) * 100))
        : 0;
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
      // Switching to internal track — clear Spotify
      this.isExternalAudio = false;
      this.activeSpotifyTrack = null;
    }

    this.isPlaying = true;

    if (!this.isExternalAudio) {
      this.startAudioSynthesis();
    } else {
      this.stopAudioSynthesis();
    }

    if (this.trackTimer) clearInterval(this.trackTimer);
    this.trackTimer = setInterval(() => {
      const cur = this.getCurrentTrack();
      if (!cur || cur.durationSeconds <= 0) return;
      this.elapsedSeconds++;
      if (this.elapsedSeconds >= cur.durationSeconds) {
        if (this.isExternalAudio) {
          // Spotify track ended — just stop the timer, don't auto-advance
          this.elapsedSeconds = cur.durationSeconds;
          this.notify();
        } else {
          this.nextTrack();
        }
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
    if (PARTY_PLAYLIST.length === 0) {
      // No internal tracks — just reset elapsed if in external mode
      this.elapsedSeconds = 0;
      this.notify();
      return;
    }
    this.currentTrackIndex = (this.currentTrackIndex + 1) % PARTY_PLAYLIST.length;
    this.elapsedSeconds = 0;
    this.skipVotes.clear();
    this.isExternalAudio = false;
    this.activeSpotifyTrack = null;
    if (this.isPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  public previousTrack() {
    if (PARTY_PLAYLIST.length === 0) {
      this.elapsedSeconds = 0;
      this.notify();
      return;
    }
    this.currentTrackIndex =
      (this.currentTrackIndex - 1 + PARTY_PLAYLIST.length) % PARTY_PLAYLIST.length;
    this.elapsedSeconds = 0;
    this.skipVotes.clear();
    this.isExternalAudio = false;
    this.activeSpotifyTrack = null;
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
    // Store the Spotify track in a dedicated slot, NOT in PARTY_PLAYLIST
    this.activeSpotifyTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: "Spotify Co-Listening",
      genre: "spotify",
      coverArt: track.coverArt || "🟢",
      bpm: track.bpm || 128,
      durationSeconds: track.durationSeconds || 195,
      vibe: "Spotify Co-Listening",
    };

    this.isExternalAudio = true;
    this.stopAudioSynthesis();
    this.elapsedSeconds = 0;
    this.isPlaying = true;

    // Start the progress timer
    if (this.trackTimer) clearInterval(this.trackTimer);
    this.trackTimer = setInterval(() => {
      const cur = this.activeSpotifyTrack;
      if (!cur || !this.isExternalAudio) return;
      this.elapsedSeconds++;
      this.notify();
    }, 1000);

    this.notify();
  }

  public voteToSkip(userHandle: string): { skipped: boolean; message: string } {
    this.skipVotes.add(userHandle);

    if (PARTY_PLAYLIST.length === 0) {
      // No tracks to skip to — just reset state
      return {
        skipped: false,
        message: "No songs in the party queue. Add songs from Spotify!",
      };
    }

    const prevIdx = this.currentTrackIndex;
    this.nextTrack();
    const newTrack = PARTY_PLAYLIST[this.currentTrackIndex];

    return {
      skipped: true,
      message: newTrack
        ? `⏭️ @${userHandle} changed the song to "${newTrack.title}"!`
        : `⏭️ @${userHandle} skipped the song.`,
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

    const track = this.getCurrentTrack();
    // Safety guard — skip synthesis if track has no bpm (shouldn't happen with PLACEHOLDER_TRACK)
    if (!track || typeof track.bpm !== "number") return;

    const bpm = track.bpm || 120;
    const beatIntervalMs = (60 / bpm) * 1000;

    let step = 0;

    // Musical scale notes based on genre
    const scales: Record<PartyTrack["genre"], number[]> = {
      bollywood: [130.81, 155.56, 174.61, 196.0, 233.08, 261.63], // D minor dance
      punjabi: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66],    // D Bhangra groove
      lofi: [174.61, 220.0, 261.63, 329.63, 392.0, 440.0],        // F major 7th chill
      edm: [110.0, 130.81, 146.83, 164.81, 196.0, 220.0],         // A minor punch
      antakshari: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63], // E minor Desi pop
      spotify: [110.0, 130.81, 146.83, 164.81, 196.0, 220.0],     // Co-listening groove
    };

    const curScale = scales[track.genre] ?? scales.bollywood;

    this.beatInterval = setInterval(() => {
      if (!this.isPlaying || !this.audioCtx) return;
      const t = this.audioCtx.currentTime;

      // 1. Kick Drum / Dhol Bass
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

      // 2. Snare / Clapping off-beat
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
      melOsc.type =
        track.genre === "lofi" ? "sine" : track.genre === "edm" ? "sawtooth" : "triangle";
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
