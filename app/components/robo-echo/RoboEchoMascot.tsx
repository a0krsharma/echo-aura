"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Flame,
  Moon,
  Feather,
  Cat,
  Cpu,
  RefreshCw,
  Zap,
  Share2,
  Send,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import type { RoboEmotion } from "./RoboEcho3DCanvas";

// Dynamically import 3D Canvas to guarantee client-side WebGL rendering
const RoboEcho3DCanvas = dynamic(() => import("./RoboEcho3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-center font-mono text-xs text-neutral-400">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span>INITIALIZING 3D OLED VISOR &amp; VOLT REACTOR...</span>
      </div>
    </div>
  ),
});

export interface MascotPersona {
  id: string;
  name: string;
  mode: RoboEmotion;
  tag: string;
  desc: string;
  icon: any;
  accentColor: string;
  pitch: number;
  rate: number;
  sampleVoiceTakes: string[];
}

export const MASCOT_PERSONAS: MascotPersona[] = [
  {
    id: "mimic_tom",
    name: "Retro Mimic (Tom)",
    mode: "mimic",
    tag: "🐱 HELIUM PARROT",
    desc: "Repeats everything you say in an ultra-cute high pitch voice with slap & tickle physics!",
    icon: Cat,
    accentColor: "from-amber-500 to-yellow-400",
    pitch: 1.65,
    rate: 1.15,
    sampleVoiceTakes: [
      "Meow! Repeat after me: Echo is the loudest voice on the internet!",
      "Hehehe stop tickling my plasma core, it tickles!",
      "I heard that! Say it again and I will mimic you louder!",
    ],
  },
  {
    id: "savage_roaster",
    name: "Savage Roaster",
    mode: "savage",
    tag: "🔥 HOSTEL ROAST",
    desc: "Razor-sharp sarcastic trash-talker for multiplayer matches and spicy banter.",
    icon: Flame,
    accentColor: "from-red-600 to-orange-500",
    pitch: 1.05,
    rate: 1.08,
    sampleVoiceTakes: [
      "Bhai tera mic mute tha ya tera confidence? Match toh tu haar chuka hai.",
      "Bro playing Ludo like it requires quantum physics. Roll the dice already!",
      "Even my antenna has better signal than your gameplay right now.",
    ],
  },
  {
    id: "sukoon_vent",
    name: "Sukoon (Deep Vent)",
    mode: "happy",
    tag: "🌙 2 AM COMPANION",
    desc: "Warm, empathetic listener for late-night thoughts. Never judges, always validates.",
    icon: Moon,
    accentColor: "from-emerald-500 to-teal-400",
    pitch: 0.95,
    rate: 0.92,
    sampleVoiceTakes: [
      "Take a deep breath. You survived 100% of your hardest days. I am right here listening.",
      "It is 2 AM, the world is quiet. Whatever is weighing on your mind, leave a piece of it with me.",
      "You don't have to carry everything alone tonight. Let's just breathe together.",
    ],
  },
  {
    id: "shayari_ustad",
    name: "Shayari Ustad",
    mode: "poetic",
    tag: "📜 URDU & HINDI POET",
    desc: "Answers life questions in classical rhyming couplets and soulful Urdu couplets.",
    icon: Feather,
    accentColor: "from-purple-600 to-pink-500",
    pitch: 1.0,
    rate: 0.95,
    sampleVoiceTakes: [
      "Hazaron khwahishen aisi ki har khwahish pe dam nikle... Bohat nikle mere armaan, lekin phir bhi kam nikle.",
      "Khamoshiyon ki bhi ek aawaz hoti hai... Echo pe aao, yahan dil ki har baat aazad hoti hai.",
      "Dard ko lafzon mein dhalna hi hunar hai... Suno gaur se, yeh aawaz ka safar hai.",
    ],
  },
  {
    id: "brainstorm_buddy",
    name: "Brainstorm Buddy",
    mode: "brainstorm",
    tag: "🧠 STARTUP PEER",
    desc: "Tech-savvy founder companion for product feedback, pitch debates, and study focus.",
    icon: Cpu,
    accentColor: "from-cyan-500 to-blue-500",
    pitch: 1.15,
    rate: 1.05,
    sampleVoiceTakes: [
      "What is the viral acquisition hook for this idea? If the retention is high, let's ship it today!",
      "Focus on the first 60 seconds aha moment. If user gets value in 2 clicks, you win.",
      "Let's break down the system architecture: WebRTC for voice, Three.js for 3D, and pure zero latency.",
    ],
  },
];

export const DESI_MASCOT_NAMES = [
  "ECHO-BOT // 01",
  "Echo-Bhai",
  "ByteBilli",
  "Vella Bot",
  "Radio Tauji",
  "Sukoon AI",
  "Midnight Dost",
  "Churan AI",
];

export default function RoboEchoMascot() {
  const [selectedPersona, setSelectedPersona] = useState<MascotPersona>(MASCOT_PERSONAS[0]);
  const [characterName, setCharacterName] = useState<string>(DESI_MASCOT_NAMES[0]);
  const [emotion, setEmotion] = useState<RoboEmotion>("mimic");
  const [energyVolts, setEnergyVolts] = useState<number>(240);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "bot"; text: string; time: string }>>([
    {
      sender: "bot",
      text: "Namaste! I am Robo-Echo. Tap my visor, poke my antenna, or tap [ TALK TO ME ] below to hear me speak and mimic you!",
      time: "Just now",
    },
  ]);
  const [textInput, setTextInput] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Sync Persona mode with 3D emotion
  useEffect(() => {
    setEmotion(selectedPersona.mode);
  }, [selectedPersona]);

  // Speech Synthesis with Audio Analyser for 60 FPS 3D Lip-Sync
  const speakVoiceWithLipSync = useCallback((text: string, customPitch?: number, customRate?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Initialize Web Audio oscillator carrier to drive analyser node
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.4;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime); // Inaudible audio sync carrier

      osc.connect(gain);
      gain.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = customPitch ?? selectedPersona.pitch;
      utterance.rate = customRate ?? selectedPersona.rate;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const hindiOrEnglishVoice = voices.find(
        (v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN") || v.lang.includes("en-US")
      );
      if (hindiOrEnglishVoice) {
        utterance.voice = hindiOrEnglishVoice;
      }

      utterance.onstart = () => {
        try {
          osc.start();
        } catch {}
        setAnalyser(analyserNode);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        try {
          osc.stop();
        } catch {}
        setAnalyser(null);
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        try {
          osc.stop();
        } catch {}
        setAnalyser(null);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("[RoboEcho] Speech error:", e);
      setIsSpeaking(false);
    }
  }, [selectedPersona]);

  // Generate Personality Response
  const generateBotReply = useCallback((userText: string) => {
    let reply = "";
    const clean = userText.toLowerCase();

    if (selectedPersona.mode === "mimic") {
      // Talking Tom Mimic: Repeat with high pitch helium cute reaction
      reply = `${userText}! Hehehe, did you hear that? I speak just like you!`;
    } else if (selectedPersona.mode === "savage") {
      const roasts = [
        `You said "${userText}"? Bhai, itna confidence agar game me hota toh match na harte!`,
        `"${userText}"... Bro thought he cooked with that line! Try again with 10% more IQ.`,
        `I asked the server to analyze your move, and even the CPU started laughing!`,
        `Nice try, but your mic volume is louder than your match score right now!`,
      ];
      reply = roasts[Math.floor(Math.random() * roasts.length)];
    } else if (selectedPersona.mode === "happy") {
      // Sukoon Vent
      const deepComfort = [
        `I hear you. When you say "${userText}", I can feel the weight you've been carrying. It's safe to let it go here.`,
        `Thank you for trusting me with that. You are stronger than whatever is worrying you tonight.`,
        `Breathe out. Whatever happened today is done. Tomorrow is an open frequency.`,
      ];
      reply = deepComfort[Math.floor(Math.random() * deepComfort.length)];
    } else if (selectedPersona.mode === "poetic") {
      // Shayari Ustad
      const shayaris = [
        `"${userText}" pe humara jawab: \nDil se jo baat nikalti hai, asar rakhti hai... Par nahi, taaqat-e-parwaaz magar rakhti hai!`,
        `Khamosh labon se bhi izhaar hota hai... Yeh Echo hai janaab, yahan har aawaz ka deedar hota hai!`,
        `Zindagi ki daud mein thoda theher kar dekho... Lafzon ke aaine mein apna shehar dekho!`,
      ];
      reply = shayaris[Math.floor(Math.random() * shayaris.length)];
    } else {
      // Brainstorm Buddy
      reply = `Interesting point on "${userText}"! Here is the tactical takeaway: Focus on viral hooks, iterate in 24 hours, and ship with 60 FPS performance!`;
    }

    // Add to chat history
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatLog((prev) => [
      ...prev,
      { sender: "user", text: userText, time: now },
      { sender: "bot", text: reply, time: now },
    ]);

    // Speak reply out loud with 3D Lip-Sync
    speakVoiceWithLipSync(reply);
    setEnergyVolts((v) => v + 25);
  }, [selectedPersona, speakVoiceWithLipSync]);

  // Handle Speech-to-Text Recognition ($0 Web Speech API)
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Web Speech API is not supported on this browser. You can type in the box below!");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      soundSynth.playSubtlePop();
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        let current = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (transcript.trim()) {
          generateBotReply(transcript.trim());
          setTranscript("");
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("[SpeechRecognition] Error:", err);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("[SpeechRecognition] Start error:", e);
      setIsListening(false);
    }
  };

  // Handle Text Submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    generateBotReply(textInput.trim());
    setTextInput("");
  };

  // Interactive Hitbox Poke Callback
  const handlePokeZone = (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => {
    if (zone === "visor" || zone === "head") {
      setEmotion("dizzy");
      setEnergyVolts((v) => Math.max(10, v - 10));
      setTimeout(() => setEmotion(selectedPersona.mode), 1800);
    } else if (zone === "chest") {
      setEnergyVolts((v) => v + 50);
      soundSynth.playRobotTickle();
      if (selectedPersona.mode === "mimic") {
        speakVoiceWithLipSync("Giggle giggle! Stop tickling my reactor!", 1.7, 1.2);
      }
    } else if (zone === "antenna") {
      // Cycle persona on antenna poke
      const nextIdx = (MASCOT_PERSONAS.findIndex((p) => p.id === selectedPersona.id) + 1) % MASCOT_PERSONAS.length;
      setSelectedPersona(MASCOT_PERSONAS[nextIdx]);
      soundSynth.playRobotPoke();
    } else if (zone === "thruster") {
      setEnergyVolts((v) => v + 100);
      soundSynth.playPlasmaCharge();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-mono text-white select-none">
      {/* ── Top Mascot Selector Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-neutral-950 border border-neutral-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-base font-black uppercase tracking-wider text-white">
              ROBO-ECHO // 01 MASCOT SIMULATOR
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
              3D PROCEDURAL RIG
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Interactive Talking Mascot with OLED Visor, Talking Tom Mimicry, and 5 AI Personalities.
          </p>
        </div>

        {/* Desi Mascot Name Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 font-bold uppercase">CHARACTER:</span>
          <select
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-emerald-400 font-black text-xs px-3 py-1.5 rounded-xl cursor-pointer outline-none hover:border-emerald-400 transition-all"
          >
            {DESI_MASCOT_NAMES.map((name) => (
              <option key={name} value={name} className="bg-black text-white">
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 5 Personality Mode Switcher Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {MASCOT_PERSONAS.map((persona) => {
          const isSelected = selectedPersona.id === persona.id;
          const Icon = persona.icon;
          return (
            <button
              key={persona.id}
              onClick={() => {
                soundSynth.playSubtlePop();
                setSelectedPersona(persona);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 active:scale-95 ${
                isSelected
                  ? "bg-neutral-900 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white"
                  : "bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-br ${persona.accentColor} text-black font-black`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </div>

              <div>
                <div className="text-xs font-black text-white uppercase tracking-tight">{persona.name}</div>
                <div className="text-[9px] font-bold opacity-75">{persona.tag}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main Stage Grid: 3D Droid Viewport + Interactive Controller ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 3D Avatar Viewport (7 Cols) */}
        <div className="lg:col-span-7 h-[460px] relative">
          <RoboEcho3DCanvas
            emotion={emotion}
            isTalking={isSpeaking}
            audioAnalyser={analyser}
            onPokeZone={handlePokeZone}
            characterName={characterName}
            energyVolts={energyVolts}
          />
        </div>

        {/* Right: Live Interaction Deck & Voice Mimic Hub (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between h-[460px]">
          {/* Persona Card Header */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  ACTIVE PERSONA // {selectedPersona.name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                PITCH: {selectedPersona.pitch}x
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">{selectedPersona.desc}</p>
          </div>

          {/* Chat / Voice Transcript Log */}
          <div className="flex-1 bg-black border border-neutral-900 rounded-2xl p-3 overflow-y-auto no-scrollbar space-y-2.5 text-xs font-mono">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl border ${
                  msg.sender === "user"
                    ? "bg-neutral-900/90 border-neutral-700 text-neutral-200 ml-4"
                    : "bg-neutral-950 border-emerald-800/60 text-emerald-300 mr-4 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-neutral-500 mb-1">
                  <span className="font-bold uppercase">
                    {msg.sender === "user" ? "YOU (VOICE / TEXT)" : `@${characterName.toUpperCase()}`}
                  </span>
                  <span>{msg.time}</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Quick Voice Take Trigger Button */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const sample =
                  selectedPersona.sampleVoiceTakes[
                    Math.floor(Math.random() * selectedPersona.sampleVoiceTakes.length)
                  ];
                speakVoiceWithLipSync(sample);
              }}
              className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-white text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>[ 🔊 PLAY SAMPLE TAKE ]</span>
            </button>
          </div>

          {/* Speech & Text Input Bar */}
          <div className="space-y-2">
            {isListening && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs px-3 py-1.5 rounded-xl flex items-center justify-between animate-pulse font-black">
                <span className="truncate">🎙️ LISTENING: "{transcript || "Speak now..."}"</span>
                <span className="text-[10px] bg-emerald-900 px-1.5 py-0.5 rounded">WEB SPEECH API</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-400 text-black animate-pulse"
                    : "bg-emerald-400 hover:bg-emerald-300 text-black"
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>[ STOP ]</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>[ 🎙️ TALK TO ME ]</span>
                  </>
                )}
              </button>

              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type a message to roast/mimic..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-white rounded-2xl px-3 py-3 text-xs text-white placeholder-neutral-500 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="px-3.5 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 border border-neutral-700 text-white rounded-2xl cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
