'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type RoboState =
  | 'idle'
  | 'listening'
  | 'talking'
  | 'thinking'
  | 'shaking'
  | 'poked'
  | 'sneeze_windup'
  | 'sneeze_blast'
  | 'sneeze_recovery'
  | 'interrupted';

export type RoboEmotion = 'happy' | 'dizzy' | 'savage' | 'poetic' | 'mimic' | 'brainstorm';

/**
 * Priority 1: Shake / Sneeze (Physical events)
 * Priority 2: Poke / Tap (Direct touch)
 * Priority 3: Talking / Lip-Sync (Active speech)
 * Priority 4: Tilt / Gyro (Continuous)
 * Priority 5: Idle chatter (>13s silence)
 */
const PRIORITY: Record<RoboState, number> = {
  sneeze_blast: 1, sneeze_windup: 1, sneeze_recovery: 1, shaking: 1,
  poked: 2,
  talking: 3, thinking: 3, interrupted: 3,
  listening: 4,
  idle: 5,
};

function canTransition(current: RoboState, next: RoboState): boolean {
  return PRIORITY[next] <= PRIORITY[current];
}

export function useRoboInteractionManager() {
  const [state, setState] = useState<RoboState>('idle');
  const [emotion, setEmotion] = useState<RoboEmotion>('happy');
  const [statusLog, setStatusLog] = useState('ALL SYSTEMS ONLINE // Ready.');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [blowLevel, setBlowLevel] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [hasSensorPermission, setHasSensorPermission] = useState(false);
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  const stateRef = useRef<RoboState>('idle');
  stateRef.current = state;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInteractionRef = useRef(Date.now());
  const blowCounterRef = useRef(0);
  const orientHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const touchActivity = useCallback(() => { lastInteractionRef.current = Date.now(); }, []);

  const safeSetState = useCallback((next: RoboState) => {
    setState(cur => (canTransition(cur, next) ? next : cur));
  }, []);

  // ── Text-to-Speech with Lip-Sync ──────────────────────────────────────
  const speak = useCallback((text: string, mood: RoboEmotion = 'happy') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    touchActivity();
    setEmotion(mood);
    safeSetState('talking');
    setStatusLog(`TRANSMITTING: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
    window.speechSynthesis.cancel();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc     = ctx.createOscillator();
    const gain    = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.3;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch = mood === 'savage' ? 0.9 : 1.25;
    utt.rate  = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const best = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-US'));
    if (best) utt.voice = best;

    utt.onstart = () => {
      try { osc.start(); } catch {}
      ttsAnalyserRef.current = analyser;
      setActiveAnalyser(analyser);
    };
    utt.onend = () => {
      try { osc.stop(); } catch {}
      ttsAnalyserRef.current = null;
      setActiveAnalyser(null);
      safeSetState('idle');
      setStatusLog('ONLINE // Listening for events.');
    };
    utt.onerror = () => {
      try { osc.stop(); } catch {}
      setActiveAnalyser(null);
      safeSetState('idle');
    };
    window.speechSynthesis.speak(utt);
  }, [touchActivity, safeSetState]);

  // ── Sneeze Choreography ────────────────────────────────────────────────
  const triggerSneeze = useCallback(() => {
    touchActivity();
    if (stateRef.current === 'sneeze_blast' || stateRef.current === 'sneeze_windup') return;
    safeSetState('sneeze_windup');
    setStatusLog('>> INCOMING AIR PRESSURE... INHALING...');

    setTimeout(() => {
      safeSetState('sneeze_blast');
      setStatusLog('💥 ACHOO! SNEEZE DISCHARGED!');
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([120, 60, 200]);

      setTimeout(() => {
        safeSetState('sneeze_recovery');
        setEmotion('dizzy');
        speak('Achoooo! Arey bhai, itni zor se hawa mat maaro! My visor got foggy!', 'savage');
      }, 350);
    }, 450);
  }, [touchActivity, safeSetState, speak]);

  // ── Poke Handler ───────────────────────────────────────────────────────
  const handlePoke = useCallback((zone: string) => {
    touchActivity();
    if (stateRef.current.startsWith('sneeze')) return;
    safeSetState('poked');

    if (zone === 'visor' || zone === 'head') {
      setEmotion('dizzy');
      setStatusLog('>> OPTICAL SENSOR OVERLOADED');
      setTimeout(() => safeSetState('idle'), 1200);
    } else if (zone === 'antenna') {
      speak('Antenna mat chhedo bhai! Network disconnect ho jayega!', 'savage');
    } else if (zone === 'chest') {
      setEmotion('happy');
      speak('Power core charged! Plus fifty volts received. Thank you!', 'happy');
    } else if (zone === 'thruster') {
      speak('Thruster engaged! Going to moon and back!', 'brainstorm');
    }
  }, [touchActivity, safeSetState, speak]);

  // ── Device Sensors ─────────────────────────────────────────────────────
  const enableSensors = useCallback(async () => {
    try {
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
        const r = await (DeviceOrientationEvent as any).requestPermission();
        if (r !== 'granted') return;
        await (DeviceMotionEvent as any).requestPermission();
      }
    } catch {}
    setHasSensorPermission(true);

    const orientHandler = (e: DeviceOrientationEvent) => {
      const gamma = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
      const beta  = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 45));
      setTilt({ x: gamma, y: beta });
    };
    const motionHandler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc?.x || !acc?.y || !acc?.z) return;
      const mag = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      if (mag > 24 && stateRef.current === 'idle') {
        touchActivity();
        safeSetState('shaking');
        setEmotion('dizzy');
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
        speak('Arey bhai! Earthquake aa gaya kya?! Rok lo!', 'dizzy');
      }
    };
    orientHandlerRef.current = orientHandler;
    motionHandlerRef.current = motionHandler;
    window.addEventListener('deviceorientation', orientHandler);
    window.addEventListener('devicemotion', motionHandler);
  }, [touchActivity, safeSetState, speak]);

  // ── Microphone for Blow Detection ──────────────────────────────────────
  const enableMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      micAnalyserRef.current = analyser;
      audioCtxRef.current = ctx;
      setIsMicActive(true);
    } catch (err) {
      console.error('[RoboInteractionManager] Mic error:', err);
    }
  }, []);

  // Blow polling at 33 FPS
  useEffect(() => {
    if (!isMicActive) return;
    const data = new Uint8Array(128);
    const interval = setInterval(() => {
      if (!micAnalyserRef.current || stateRef.current !== 'idle') return;
      micAnalyserRef.current.getByteFrequencyData(data);
      const lowRumble  = (data[0] + data[1] + data[2]) / 3;
      const highHiss   = (data[15] + data[20] + data[25]) / 3;
      const midSpeech  = (data[6] + data[8] + data[10]) / 3;
      const isBlow = lowRumble > 150 && highHiss > 45 && (lowRumble + highHiss) > midSpeech * 1.3;
      setBlowLevel(Math.min(1.0, (lowRumble + highHiss) / 300));
      if (isBlow) {
        blowCounterRef.current++;
        if (blowCounterRef.current >= 3) { blowCounterRef.current = 0; triggerSneeze(); }
      } else {
        blowCounterRef.current = Math.max(0, blowCounterRef.current - 1);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isMicActive, triggerSneeze]);

  // Anti-awkward idle chatter
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      if (stateRef.current !== 'idle' || Date.now() - lastInteractionRef.current < 13000) return;
      const lines = [
        'Bhai 13 second se sannata hai... kuch puch lo ya code test karo!',
        'Main offline ho jaunga agar aise hi chup rahoge. Just saying.',
        'Fun fact: I have processed 1,247 humans today. All of them more talkative than you.',
        'Hello? Main yahan hoon. Akela. Sad robot noises.',
      ];
      speak(lines[Math.floor(Math.random() * lines.length)], 'poetic');
    }, 5000);
    return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
  }, [speak]);

  // Cleanup sensors on unmount
  useEffect(() => {
    return () => {
      if (orientHandlerRef.current) window.removeEventListener('deviceorientation', orientHandlerRef.current);
      if (motionHandlerRef.current) window.removeEventListener('devicemotion', motionHandlerRef.current);
    };
  }, []);

  return {
    state, emotion, statusLog, tilt, blowLevel,
    isMicActive, hasSensorPermission, activeAnalyser,
    speak, triggerSneeze, handlePoke, enableSensors, enableMic,
  };
}
