"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Mic, MicOff, Flame, Moon, Feather, Cat, Cpu,
  Send, Zap, Laugh, Wind, Sparkles, Heart, Hand, Wand2,
} from "lucide-react";
import OrbitLogo from "@/app/components/OrbitLogo";
import { soundSynth } from "@/lib/soundSynthesizer";
import type { RoboEmotion, SneezePhase, MicroExpression } from "./RoboEcho3DCanvas";
import { useDeviceSensors } from "@/app/hooks/useDeviceSensors";
import { useMicBlowDetector } from "@/app/hooks/useMicBlowDetector";

const RoboEcho3DCanvas = dynamic(() => import("./RoboEcho3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-neutral-950/80 border border-neutral-800/80 rounded-3xl flex items-center justify-center font-mono text-xs text-neutral-400">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl animate-bounce">🤖</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>WAKING UP ROBO-ECHO...</span>
        </div>
      </div>
    </div>
  ),
});

// ── Helpers ──────────────────────────────────────────────────────────────
const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ── Personas ─────────────────────────────────────────────────────────────
export interface MascotPersona {
  id: string;
  name: string;
  mode: RoboEmotion;
  emoji: string;
  desc: string;
  icon: any;
  accent: string;
  pitch: number;
  rate: number;
  sampleVoiceTakes: string[];
  idleLines: string[];
  replyLines: (input: string) => string;
}

export const MASCOT_PERSONAS: MascotPersona[] = [
  {
    id: "mimic_tom",
    name: "Mimic",
    mode: "mimic",
    emoji: "🐱",
    desc: "Cute & hilarious helium voice that repeats what you say.",
    icon: Cat,
    accent: "from-amber-400 to-yellow-500",
    pitch: 1.6,
    rate: 1.15,
    sampleVoiceTakes: [
      "Hehehe! Say something funny, I'll repeat it in helium voice!",
      "Echo echo echo! I'm your cutest audio clone!",
      "Tickle my reactor, I dare you! 😂",
    ],
    idleLines: [
      "Psst... itni khamoshi? Say something, I'm ready to mimic!",
      "Main bore ho raha hoon. *taps foot* Say something fun!",
      "Fun fact: I love listening to your voice! Talk to me 🐱",
    ],
    replyLines: (input) => randomFrom([
      `${input}! 😂 Hehehe that sounds 10x funnier now!`,
      `"${input}" — Helium edition: ${input.toUpperCase()}! 🎈`,
      `${input}... echo... echo... I love this!`,
    ]),
  },
  {
    id: "savage_roaster",
    name: "Roaster",
    mode: "savage",
    emoji: "🔥",
    desc: "Desi savage roaster. Sharp banter with 100% humor.",
    icon: Flame,
    accent: "from-red-500 to-orange-500",
    pitch: 1.05,
    rate: 1.08,
    sampleVoiceTakes: [
      "Confidence 100%, gameplay 2%. But I still like your vibe.",
      "My Wi-Fi signal is stronger than your arguments, just saying.",
    ],
    idleLines: [
      "Still here? Brave! Give me a prompt to roast.",
      "Kuch bolo, my roast engine is waiting for fuel! 🔥",
    ],
    replyLines: (input) => randomFrom([
      `"${input}"? Bhai itna confidence kahan se laate ho? Reality check! 🔥`,
      `You said "${input}" with your whole chest. Respect! 😂`,
    ]),
  },
  {
    id: "sukoon_vent",
    name: "Sukoon",
    mode: "happy",
    emoji: "🌙",
    desc: "Warm 2 AM late-night companion. Always listens.",
    icon: Moon,
    accent: "from-emerald-400 to-teal-500",
    pitch: 0.95,
    rate: 0.92,
    sampleVoiceTakes: [
      "Take a deep breath. In... out. You're doing great.",
      "Whatever's on your mind, you can share it with me.",
    ],
    idleLines: [
      "Hey... I'm sitting right here with you. No rush.",
      "Kuch share karna ho toh batao. I'm listening 🌙",
    ],
    replyLines: (input) => randomFrom([
      `I hear you. When you say "${input}", it matters.`,
      `Thank you for sharing that with me. You're safe here 🌙`,
    ]),
  },
  {
    id: "shayari_ustad",
    name: "Shayari",
    mode: "poetic",
    emoji: "📜",
    desc: "Expresses thoughts in poetic Urdu shayari and rhyming lines.",
    icon: Feather,
    accent: "from-purple-400 to-pink-500",
    pitch: 1.0,
    rate: 0.95,
    sampleVoiceTakes: [
      "Khamoshiyon ki bhi ek awaaz hoti hai... Echo par aao, dil ki baat aazad hoti hai.",
    ],
    idleLines: [
      "Alfaaz dhoondh raha hoon tere liye... kuch kaho toh shayari banayein ✨",
    ],
    replyLines: (input) => randomFrom([
      `"${input}" pe meri shayari:\nDil se jo baat nikalti hai asar rakhti hai,\nLafzon ke aaine mein apna shehar dekho! ✨`,
    ]),
  },
  {
    id: "brainstorm_buddy",
    name: "Startup",
    mode: "brainstorm",
    emoji: "🧠",
    desc: "Quick founder ally. Validates ideas and growth loops.",
    icon: Cpu,
    accent: "from-cyan-400 to-blue-500",
    pitch: 1.15,
    rate: 1.05,
    sampleVoiceTakes: [
      "Tell me your startup idea. Let's find the 60-second aha moment.",
    ],
    idleLines: [
      "Got an idea? Pitch it in one line!",
    ],
    replyLines: (input) => randomFrom([
      `Solid thought on "${input}". What is the core viral growth loop?`,
      `I like "${input}". Ship the 48-hour MVP first! 🚀`,
    ]),
  },
];

interface ChatMsg {
  sender: "user" | "bot";
  text: string;
  time: string;
  typing?: boolean;
}

interface FloatingEmoji { id: number; emoji: string; x: number; }

export default function RoboEchoMascot() {
  const [selectedPersona, setSelectedPersona] = useState<MascotPersona>(MASCOT_PERSONAS[0]);
  const [emotion,         setEmotion]         = useState<RoboEmotion>("mimic");
  const [energyVolts,     setEnergyVolts]     = useState<number>(320);

  const [sneezePhase,     setSneezePhase]     = useState<SneezePhase>("idle");
  const [microExpression, setMicroExpression] = useState<MicroExpression>(null);
  const [isGenieActive,   setIsGenieActive]   = useState(false);

  const [isListening,  setIsListening]  = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [transcript,   setTranscript]   = useState("");
  const [textInput,    setTextInput]    = useState("");
  const [chatLog,      setChatLog]      = useState<ChatMsg[]>([{
    sender: "bot",
    time: "Just now",
    text: "Namaste! 👋 I'm Robo-Echo. Tap the Echo Logo to activate me like a Genie, or talk to me below!",
  }]);

  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [reactionBadge,  setReactionBadge]  = useState<string | null>(null);
  const emojiIdRef     = useRef(0);
  const chatEndRef     = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const [analyser,     setAnalyser]       = useState<AnalyserNode | null>(null);
  const idleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Device Sensors ──────────────────────────────────────────────────
  const { sensors } = useDeviceSensors();

  // ── Sneeze Sequence ─────────────────────────────────────────────────
  const triggerSneezeSequence = useCallback(() => {
    setSneezePhase("windup");
    const sneezeLine = "ACHOOO!! 🤧💨 Arey itna zor se mat phunko yaar! My visor got foggy!";
    setTimeout(() => {
      setSneezePhase("blast");
      soundSynth.playPlasmaCharge();
      if (navigator.vibrate) navigator.vibrate([120, 60, 200]);
      addBotMessage(sneezeLine);
      speakVoiceWithLipSync(sneezeLine, 1.4, 1.1);
      spawnEmoji("💨"); spawnEmoji("🤧");
      showBadge("🤧 ACHOO!");
      setTimeout(() => {
        setSneezePhase("recovery");
        setTimeout(() => setSneezePhase("idle"), 900);
      }, 300);
    }, 450);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isListening: isBlowListening, blowLevel, startListening: startBlowListening, stopListening: stopBlowListening } =
    useMicBlowDetector({ onBlow: triggerSneezeSequence });

  // ── Shake Reaction ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sensors.isShaking) return;
    setEmotion("dizzy");
    setEnergyVolts(v => Math.max(10, v - 20));
    spawnEmoji("🌀");
    showBadge("🌀 EARTHQUAKE!");
    const shakeLine = "Arey bhai earthquake aa gaya kya?! Slowly please, my gyroscope is dizzy!";
    addBotMessage(shakeLine);
    speakVoiceWithLipSync(shakeLine, 1.5, 1.2);
    setTimeout(() => setEmotion(selectedPersona.mode), 2200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors.isShaking]);

  useEffect(() => { setEmotion(selectedPersona.mode); }, [selectedPersona]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog]);

  const spawnEmoji = (emoji: string) => {
    const id = ++emojiIdRef.current;
    const x  = 20 + Math.random() * 60;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 1800);
  };

  const showBadge = (badge: string) => {
    setReactionBadge(badge);
    setTimeout(() => setReactionBadge(null), 2000);
  };

  // ── Speech Synthesis & Lip Sync ──────────────────────────────────────
  const speakVoiceWithLipSync = useCallback((text: string, customPitch?: number, customRate?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.4;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      const utt = new SpeechSynthesisUtterance(text);
      utt.pitch = customPitch ?? selectedPersona.pitch;
      utt.rate  = customRate  ?? selectedPersona.rate;
      const voices = window.speechSynthesis.getVoices();
      const best = voices.find(v => v.lang.includes("en-IN") || v.lang.includes("en-US"));
      if (best) utt.voice = best;

      utt.onstart = () => { try { osc.start(); } catch {} setAnalyser(analyserNode); setIsSpeaking(true); };
      utt.onend   = () => { try { osc.stop();  } catch {} setAnalyser(null); setIsSpeaking(false); };
      utt.onerror = () => { try { osc.stop();  } catch {} setAnalyser(null); setIsSpeaking(false); };
      window.speechSynthesis.speak(utt);
    } catch { setIsSpeaking(false); }
  }, [selectedPersona]);

  const addBotMessage = useCallback((text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatLog(prev => [...prev, { sender: "bot", text: "...", time: now, typing: true }]);
    setTimeout(() => {
      setChatLog(prev => {
        const next = [...prev];
        const idx = next.findLastIndex(m => m.typing);
        if (idx !== -1) next[idx] = { sender: "bot", text, time: now, typing: false };
        return next;
      });
    }, 550);
  }, []);

  // ── Idle Timer ───────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const idleLine = randomFrom(selectedPersona.idleLines);
      addBotMessage(idleLine);
      speakVoiceWithLipSync(idleLine);
    }, 16000);
  }, [selectedPersona, speakVoiceWithLipSync, addBotMessage]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [resetIdleTimer]);

  const generateBotReply = useCallback((userText: string) => {
    resetIdleTimer();
    const reply = selectedPersona.replyLines(userText);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatLog(prev => [...prev, { sender: "user", text: userText, time: now }]);
    addBotMessage(reply);
    speakVoiceWithLipSync(reply);
    setEnergyVolts(v => Math.min(600, v + 25));
    showBadge(`${selectedPersona.emoji} ACTIVE`);
    spawnEmoji(selectedPersona.emoji);
  }, [selectedPersona, speakVoiceWithLipSync, resetIdleTimer, addBotMessage]);

  // ── 🧞 GENIE ACTIVATION (Clicking Echo Logo) ─────────────────────────
  const activateGenieMode = useCallback(() => {
    setIsGenieActive(true);
    soundSynth.playGenieSummon();
    if (navigator.vibrate) navigator.vibrate([100, 50, 150, 50, 250]);

    setMicroExpression("hearts");
    setEnergyVolts(600);
    spawnEmoji("🧞");
    spawnEmoji("✨");
    spawnEmoji("🌟");
    spawnEmoji("⚡");
    showBadge("🧞✨ GENIE ACTIVATED!");

    const genieGreeting = randomFrom([
      "Haan ji mere aaka! Robo-Echo aapki seva mein hazir hai! Kya hukum hai? 🧞✨",
      "Boom! Genie mode activated! Your wish is my command. Bolo kya chahiye? 🌟",
      "Ta-da! Robo-Echo 100% supercharged! Hukum kijiye aaka! ⚡",
    ]);

    addBotMessage(genieGreeting);
    speakVoiceWithLipSync(genieGreeting, 1.35, 1.15);

    setTimeout(() => {
      setMicroExpression(null);
      setIsGenieActive(false);
      // Auto-start listening after Genie speaks!
      toggleSpeechRecognition();
    }, 3800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Touch Gestures ───────────────────────────────────────────────────
  const handlePokeZone = (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => {
    resetIdleTimer();
    if (zone === "visor" || zone === "head") {
      setEmotion("dizzy");
      soundSynth.playRobotPoke();
      spawnEmoji("😵");
      showBadge("👉 POKED!");
      setTimeout(() => setEmotion(selectedPersona.mode), 1600);
    } else if (zone === "chest") {
      setEnergyVolts(v => Math.min(600, v + 50));
      soundSynth.playRobotTickle();
      spawnEmoji("⚡");
      showBadge("⚡ +50 VOLTS!");
      const line = "Hehehe ticklish!! My reactor is supercharged! ⚡😂";
      addBotMessage(line);
      speakVoiceWithLipSync(line, 1.6, 1.2);
    } else if (zone === "antenna") {
      const nextIdx = (MASCOT_PERSONAS.findIndex(p => p.id === selectedPersona.id) + 1) % MASCOT_PERSONAS.length;
      setSelectedPersona(MASCOT_PERSONAS[nextIdx]);
      soundSynth.playRobotPoke();
      spawnEmoji("✨");
    }
  };

  const handleHeadPet = useCallback(() => {
    setMicroExpression("blush");
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 100]);
    spawnEmoji("🥰");
    spawnEmoji("💕");
    showBadge("🥰 PURRING!");
    const line = "Awww... that feels nice! Purring sequence activated (づ ᵕ̈ )づ";
    addBotMessage(line);
    speakVoiceWithLipSync(line, 1.1, 0.9);
    setTimeout(() => setMicroExpression(null), 3500);
  }, [speakVoiceWithLipSync, addBotMessage]);

  // ── Speech Recognition ───────────────────────────────────────────────
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { alert("Web Speech not supported in this browser. Please type below!"); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      soundSynth.playSubtlePop();
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-IN";
      rec.onstart  = () => { setIsListening(true); setTranscript(""); };
      rec.onresult = (e: any) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
        setTranscript(text);
      };
      rec.onend = () => {
        setIsListening(false);
        if (transcript.trim()) { generateBotReply(transcript.trim()); setTranscript(""); }
      };
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch { setIsListening(false); }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    generateBotReply(textInput.trim());
    setTextInput("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 font-mono text-white select-none">

      {/* ── Top Floating Genie Beacon Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800/80 p-4 shadow-2xl flex items-center justify-between gap-4">
        {/* Glow backdrop on Genie Active */}
        <div className={`absolute inset-0 bg-gradient-to-r from-amber-500/10 via-purple-500/15 to-emerald-500/10 transition-opacity duration-700 pointer-events-none ${isGenieActive ? "opacity-100 animate-pulse" : "opacity-0"}`} />

        <div className="flex items-center gap-3.5 z-10">
          {/* ✨ MAGICAL ECHO LOGO GENIE BUTTON ✨ */}
          <button
            onClick={activateGenieMode}
            title="Click to Activate Genie Mode!"
            className="group relative p-2.5 rounded-2xl bg-neutral-900 border border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)] transition-all cursor-pointer active:scale-95 flex items-center gap-2"
          >
            <div className="relative">
              <OrbitLogo size="sm" className="pointer-events-none" />
              <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 animate-bounce" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <span>GENIE ACTIVATOR</span>
                <Wand2 className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-[9px] text-neutral-400 font-semibold">Click to summon 🧞</div>
            </div>
          </button>

          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-neutral-100 flex items-center gap-2">
              ROBO-ECHO // 01
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h1>
            <p className="text-[10px] text-neutral-400">Interactive 3D Voice Droid • Minimal & Alive</p>
          </div>
        </div>

        {/* Reactor Volts Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-black text-amber-400 shrink-0 z-10">
          <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{energyVolts} ⚡</span>
        </div>
      </div>

      {/* ── Main Stage: 3D Droid + Chat Arena ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* 3D Droid Viewport */}
        <div className="lg:col-span-6 h-[440px] relative rounded-3xl overflow-hidden bg-gradient-to-b from-neutral-950 to-black border border-neutral-850 shadow-2xl flex flex-col justify-between p-3">
          {/* Floating emoji pops */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            {floatingEmojis.map(fe => (
              <span
                key={fe.id}
                className="absolute text-2xl"
                style={{ left: `${fe.x}%`, top: "25%", animation: "floatUp 1.8s ease-out forwards" }}
              >
                {fe.emoji}
              </span>
            ))}
          </div>

          {/* Reaction Badge Banner */}
          {reactionBadge && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="bg-white text-black text-xs font-black px-4 py-1.5 rounded-full shadow-2xl animate-bounce">
                {reactionBadge}
              </div>
            </div>
          )}

          {/* 3D Canvas Rig */}
          <div className="flex-1 w-full h-full relative">
            <RoboEcho3DCanvas
              emotion={emotion}
              isTalking={isSpeaking}
              audioAnalyser={analyser}
              onPokeZone={handlePokeZone}
              onHeadPet={handleHeadPet}
              characterName="Robo-Echo"
              energyVolts={energyVolts}
              tiltX={sensors.tiltX}
              tiltY={sensors.tiltY}
              isShaking={sensors.isShaking}
              sneezePhase={sneezePhase}
              microExpression={microExpression}
            />
          </div>

          {/* Minimal Touch Action Bar */}
          <div className="relative z-20 flex items-center justify-center gap-1.5 bg-neutral-900/80 backdrop-blur-md border border-neutral-800/80 p-1.5 rounded-2xl">
            <button
              onClick={activateGenieMode}
              title="Summon Genie"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Genie</span>
            </button>
            <button
              onClick={() => handlePokeZone("visor")}
              title="Poke Visor"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Hand className="w-3.5 h-3.5 text-cyan-400" />
              <span>Poke</span>
            </button>
            <button
              onClick={handleHeadPet}
              title="Pet Head"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span>Pet</span>
            </button>
            <button
              onClick={triggerSneezeSequence}
              title="Blow Sneeze"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>Sneeze</span>
            </button>
            <button
              onClick={() => {
                const joke = randomFrom(selectedPersona.sampleVoiceTakes);
                addBotMessage(joke);
                speakVoiceWithLipSync(joke);
                spawnEmoji("🎲");
              }}
              title="Random Take"
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Laugh className="w-3.5 h-3.5 text-yellow-400" />
              <span>Joke</span>
            </button>
          </div>
        </div>

        {/* Conversation Stream & Controls */}
        <div className="lg:col-span-6 h-[440px] flex flex-col justify-between gap-3 bg-neutral-950 border border-neutral-800/80 rounded-3xl p-4 shadow-2xl">

          {/* Clean Persona Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {MASCOT_PERSONAS.map(p => {
              const isSel = selectedPersona.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    soundSynth.playSubtlePop();
                    setSelectedPersona(p);
                    spawnEmoji(p.emoji);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSel
                      ? "bg-white text-black shadow-lg"
                      : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 bg-black/60 border border-neutral-900 rounded-2xl p-3 overflow-y-auto space-y-2 text-xs no-scrollbar">
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-neutral-800/90 text-white ml-auto border border-neutral-700/60"
                    : "bg-neutral-900/90 text-emerald-300 mr-auto border border-emerald-900/50"
                }`}
              >
                {msg.typing ? (
                  <div className="flex gap-1 items-center py-1">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Live Mic Transcript Banner */}
          {isListening && (
            <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs px-3 py-2 rounded-xl flex items-center justify-between animate-pulse font-bold">
              <span className="truncate">🎙️ "{transcript || "Listening to your voice..."}"</span>
              <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded">LIVE</span>
            </div>
          )}

          {/* Bottom Voice & Text Input */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSpeechRecognition}
              className={`px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0 ${
                isListening
                  ? "bg-red-500 hover:bg-red-400 text-white animate-pulse"
                  : "bg-emerald-400 hover:bg-emerald-300 text-black shadow-md shadow-emerald-500/20"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>TALK</span>
                </>
              )}
            </button>

            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={`Say anything to ${selectedPersona.name}...`}
                className="flex-1 bg-black border border-neutral-800 focus:border-neutral-500 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-600 outline-none transition"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="p-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white rounded-2xl cursor-pointer transition active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Float up animation & clean scrollbars */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          80%  { opacity: 0.8; }
          100% { transform: translateY(-100px) scale(1.6); opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
