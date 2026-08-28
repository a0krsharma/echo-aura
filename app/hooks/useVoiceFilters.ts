'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type FilterPreset = 'none' | 'chipmunk' | 'demon' | 'walkie_talkie' | 'cathedral_reverb' | 'spatial_8d';

export interface VoiceMaskOption {
  id: FilterPreset;
  label: string;
  icon: string;
  description: string;
}

export const VOICE_MASKS: VoiceMaskOption[] = [
  { id: 'none', label: 'Studio Mic', icon: '🎙️', description: 'Unfiltered pristine studio audio' },
  { id: 'chipmunk', label: 'Chipmunk', icon: '🐱', description: 'High-energy helium voice boost' },
  { id: 'demon', label: 'Deep Demon', icon: '👹', description: 'Dark cyber-growl with bass boost' },
  { id: 'walkie_talkie', label: 'Walkie 90s', icon: '📻', description: 'Lo-Fi tactical radio overdrive' },
  { id: 'cathedral_reverb', label: 'Sukoon Reverb', icon: '⛪', description: 'Lush 4.5s spiritual cathedral echo' },
  { id: 'spatial_8d', label: '8D Spatial', icon: '🎧', description: '360° binaural orbiting spatial sound' },
];

export function useVoiceFilters() {
  const [activeFilter, setActiveFilter] = useState<FilterPreset>('none');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const filterNodesRef = useRef<AudioNode[]>([]);
  const pannerAnimRef = useRef<number | null>(null);

  // Clean up AudioContext & Nodes
  const cleanup = useCallback(() => {
    if (pannerAnimRef.current) {
      cancelAnimationFrame(pannerAnimRef.current);
      pannerAnimRef.current = null;
    }
    filterNodesRef.current.forEach((node) => {
      try {
        node.disconnect();
      } catch {}
    });
    filterNodesRef.current = [];

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [cleanup]);

  /**
   * Apply live DSP voice mask filter chain to a raw MediaStream
   */
  const applyFilterToStream = useCallback(
    async (rawMicStream: MediaStream, preset: FilterPreset): Promise<MediaStream> => {
      setActiveFilter(preset);

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      cleanup();

      const source = ctx.createMediaStreamSource(rawMicStream);
      const destination = ctx.createMediaStreamDestination();
      sourceNodeRef.current = source;
      destinationNodeRef.current = destination;

      // ── 0. RAW STUDIO MIC (Passthrough) ──────────────────────────────────
      if (preset === 'none') {
        source.connect(destination);
        return destination.stream;
      }

      // ── 1. HELIUM CHIPMUNK ────────────────────────────────────────────────
      if (preset === 'chipmunk') {
        // High-pass filter cuts chest resonance below 700Hz
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 750;

        // Sharp bandpass peak for nasal formant boost
        const formantBoost = ctx.createBiquadFilter();
        formantBoost.type = 'peaking';
        formantBoost.frequency.value = 2800;
        formantBoost.Q.value = 2.5;
        formantBoost.gain.value = 14;

        // High-shelf boost for crisp helium harmonics
        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 4000;
        highShelf.gain.value = 8;

        const gain = ctx.createGain();
        gain.gain.value = 1.3;

        source.connect(highpass);
        highpass.connect(formantBoost);
        formantBoost.connect(highShelf);
        highShelf.connect(gain);
        gain.connect(destination);

        filterNodesRef.current = [highpass, formantBoost, highShelf, gain];
        return destination.stream;
      }

      // ── 2. DEEP DEMON / CYBER-BANE ────────────────────────────────────────
      if (preset === 'demon') {
        // Heavy low-shelf bass boost at 90Hz
        const bassBoost = ctx.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.value = 120;
        bassBoost.gain.value = 15;

        // Low-pass to darken the voice
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 2200;

        // Distortion saturation curve for demonic grit
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; ++i) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((Math.PI + 4) * x) / (Math.PI + 4 * Math.abs(x));
        }
        distortion.curve = curve;

        // Sub-harmonic growl oscillator modulating gain
        const growlOsc = ctx.createOscillator();
        growlOsc.type = 'sawtooth';
        growlOsc.frequency.value = 38; // 38Hz deep rumble

        const growlGain = ctx.createGain();
        growlGain.gain.value = 0.25;

        const modGain = ctx.createGain();
        modGain.gain.value = 0.85;

        growlOsc.connect(growlGain);
        growlGain.connect(modGain.gain);
        growlOsc.start();

        source.connect(bassBoost);
        bassBoost.connect(lowpass);
        lowpass.connect(distortion);
        distortion.connect(modGain);
        modGain.connect(destination);

        filterNodesRef.current = [bassBoost, lowpass, distortion, growlOsc, growlGain, modGain];
        return destination.stream;
      }

      // ── 3. 90s POLICE WALKIE-TALKIE ──────────────────────────────────────
      if (preset === 'walkie_talkie') {
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 550;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 2600;

        const bandBoost = ctx.createBiquadFilter();
        bandBoost.type = 'peaking';
        bandBoost.frequency.value = 1600;
        bandBoost.Q.value = 1.8;
        bandBoost.gain.value = 10;

        // Overdrive clipping
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; ++i) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((Math.PI + 12) * x) / (Math.PI + 12 * Math.abs(x));
        }
        distortion.curve = curve;

        const gain = ctx.createGain();
        gain.gain.value = 1.2;

        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(bandBoost);
        bandBoost.connect(distortion);
        distortion.connect(gain);
        gain.connect(destination);

        filterNodesRef.current = [highpass, lowpass, bandBoost, distortion, gain];
        return destination.stream;
      }

      // ── 4. CATHEDRAL REVERB / SUKOON ─────────────────────────────────────
      if (preset === 'cathedral_reverb') {
        const dryGain = ctx.createGain();
        dryGain.gain.value = 0.9;

        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.65;

        // Multi-tap spatial delay loop
        const delay1 = ctx.createDelay();
        delay1.delayTime.value = 0.18;

        const delay2 = ctx.createDelay();
        delay2.delayTime.value = 0.38;

        const feedback1 = ctx.createGain();
        feedback1.gain.value = 0.48;

        const feedback2 = ctx.createGain();
        feedback2.gain.value = 0.38;

        const dampFilter = ctx.createBiquadFilter();
        dampFilter.type = 'lowpass';
        dampFilter.frequency.value = 2200;

        // Dry route
        source.connect(dryGain);
        dryGain.connect(destination);

        // Wet route 1
        source.connect(delay1);
        delay1.connect(dampFilter);
        dampFilter.connect(feedback1);
        feedback1.connect(delay1);
        delay1.connect(wetGain);

        // Wet route 2
        dampFilter.connect(delay2);
        delay2.connect(feedback2);
        feedback2.connect(delay2);
        delay2.connect(wetGain);

        wetGain.connect(destination);

        filterNodesRef.current = [dryGain, wetGain, delay1, delay2, feedback1, feedback2, dampFilter];
        return destination.stream;
      }

      // ── 5. 8D SPATIAL AUDIO ORBIT ────────────────────────────────────────
      if (preset === 'spatial_8d') {
        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          const delayHaas = ctx.createDelay();
          delayHaas.delayTime.value = 0.025; // 25ms Haas spatial width

          source.connect(panner);
          panner.connect(delayHaas);
          delayHaas.connect(destination);

          let angle = 0;
          const animatePan = () => {
            angle += 0.025;
            panner.pan.value = Math.sin(angle); // Smooth continuous 360 orbit
            pannerAnimRef.current = requestAnimationFrame(animatePan);
          };
          animatePan();

          filterNodesRef.current = [panner, delayHaas];
          return destination.stream;
        }
      }

      // Fallback
      source.connect(destination);
      return destination.stream;
    },
    [cleanup]
  );

  return { activeFilter, applyFilterToStream, setActiveFilter, cleanup };
}
