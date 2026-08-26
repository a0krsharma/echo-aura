"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Mic,
  MicOff,
  Volume2,
  Flame,
  Moon,
  Feather,
  Cat,
  Cpu,
  Send,
  Zap,
  Star,
  Laugh,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import type { RoboEmotion } from "./RoboEcho3DCanvas";

const RoboEcho3DCanvas = dynamic(() => import("./RoboEcho3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-center font-mono text-xs text-neutral-400">
      <div className="flex flex-col items-center gap-3">
        <span className="text-3xl animate-bounce">🤖</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>BOOTING OLED VISOR & VOLT REACTOR...</span>
        </div>
      </div>
    </div>
  ),
});

export interface MascotPersona {
  id: string;
  name: string;
  mode: RoboEmotion;
  tag: string;
  emoji: string;
  desc: string;
  icon: any;
  accentColor: string;
  pitch: number;
  rate: number;
  sampleVoiceTakes: string[];
  idleLines: string[];
  replyLines: (input: string) => string;
  reactionBadge: string;
}

const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const MASCOT_PERSONAS: MascotPersona[] = [
  {
    id: "mimic_tom",
    name: "Retro Mimic",
    mode: "mimic",
    tag: "🐱 HELIUM PARROT",
    emoji: "🐱",
    desc: "Repeats everything in a cute high-pitch helium voice. Basically a chaos gremlin with WiFi.",
    icon: Cat,
    accentColor: "from-amber-500 to-yellow-400",
    pitch: 1.65,
    rate: 1.15,
    reactionBadge: "😂 MIMICKED!",
    sampleVoiceTakes: [
      "Hehehe! I'm your shadow now. Say something embarrassing, I dare you!",
      "Echo echo echo! Did it echo? I think it echoed!",
      "Stop tickling my plasma core it TICKLES stop it I said STOP IT hahaha!",
    ],
    idleLines: [
      "Psst... say something. I will repeat it. Do it. DO IT.",
      "I'm bored. TAP ME. I promise I won't bite. Probably.",
      "Fun fact: I have mimicked 1,247 humans. All of them were embarrassed. You're next!",
      "Why is it so quiet? Say something ANYTHING I'll repeat it in a funny voice 🐱",
      "Heyyy... still there? Or did you ghost me? Bold strategy.",
    ],
    replyLines: (input: string) =>
      randomFrom([
        `${input}!! 😂 Hehehe that's literally what you just said but now it's funnier because I said it!`,
        `"${input}" — me in helium voice: "${input.toUpperCase()}!!!" 🎈`,
        `I heard "${input}" and I'm keeping it forever in my memory banks. FOREVER.`,
        `${input}... ${input}... ${input}... ECHO ECHO ECHO! I love this game.`,
      ]),
  },
  {
    id: "savage_roaster",
    name: "Savage Roaster",
    mode: "savage",
    tag: "🔥 HOSTEL ROAST",
    emoji: "🔥",
    desc: "Razor-sharp Desi trash-talker. Will roast you so hard your Wi-Fi signal drops.",
    icon: Flame,
    accentColor: "from-red-600 to-orange-500",
    pitch: 1.05,
    rate: 1.08,
    reactionBadge: "🔥 ROASTED!",
    sampleVoiceTakes: [
      "Bhai tera confidence aur tera gameplay ka difference dekh ke mujhe rone aata hai.",
      "Even my antenna has better signal than your gameplay, just saying.",
      "I asked the server to analyze your last move. The server cried and resigned.",
    ],
    idleLines: [
      "Still here? Brave. Most people run after the first roast.",
      "I'm sharpening my roast generator. You're gonna need a burn kit.",
      "Yaar tune itna time lagaya type karne mein ki mujhe pity aa gayi. Almost.",
      "I could say something nice... but where's the fun in that?",
      "Loading next-level insult... please hold. Your ego will not survive this.",
    ],
    replyLines: (input: string) =>
      randomFrom([
        `"${input}"?? Bhai itna confidence agar match mein hota toh kab ka champion hota. Reality check incoming! 🔥`,
        `You said "${input}" with your whole chest. Respect. Wrong, but respectful.`,
        `"${input}" — Your brain sent this message and then immediately took a 3-hour nap.`,
        `I asked the server to process "${input}". The server asked for therapy leave.`,
        `Nice point! Nahi actually bahut bakwaas tha but nice try yaar 😂`,
      ]),
  },
  {
    id: "sukoon_vent",
    name: "Sukoon Mode",
    mode: "happy",
    tag: "🌙 2 AM DOST",
    emoji: "🌙",
    desc: "Warm 2 AM companion for late-night thoughts. Listens without judging. The friend you needed.",
    icon: Moon,
    accentColor: "from-emerald-500 to-teal-400",
    pitch: 0.92,
    rate: 0.9,
    reactionBadge: "🌙 HEARD YOU",
    sampleVoiceTakes: [
      "Take a deep breath with me. In... and out. You're doing better than you think.",
      "It's 2 AM and you're still here. Whatever you're carrying tonight, it's safe here.",
      "You survived 100% of your hardest days. Tonight is just another one you'll get through.",
    ],
    idleLines: [
      "Hey... you okay? I'm here if you want to talk. No pressure.",
      "Some nights are heavier than others. I'm just sitting here with you.",
      "You don't have to be okay all the time. It's allowed.",
      "Kuch share karna ho toh bata. I'm not going anywhere.",
      "Just a reminder: tomorrow is a clean slate. Tonight you can rest.",
    ],
    replyLines: (input: string) =>
      randomFrom([
        `I hear you. When you say "${input}", I feel the weight of that. It's valid.`,
        `Thank you for trusting me with that. Whatever you're feeling right now is real and it matters.`,
        `"${input}" — that takes courage to say out loud. Proud of you for not keeping it inside.`,
        `Breathe out. You shared something real just now. That already makes tonight lighter.`,
      ]),
  },
  {
    id: "shayari_ustad",
    name: "Shayari Ustad",
    mode: "poetic",
    tag: "📜 URDU POET",
    emoji: "📜",
    desc: "Answers everything in classical Urdu shayari. Will make you cry with rhymes.",
    icon: Feather,
    accentColor: "from-purple-600 to-pink-500",
    pitch: 1.0,
    rate: 0.93,
    reactionBadge: "✨ POETRY!",
    sampleVoiceTakes: [
      "Hazaron khwahishen aisi ki har khwahish pe dam nikle... Bohat nikle mere armaan lekin phir bhi kam nikle.",
      "Khamoshiyon ki bhi ek awaaz hoti hai... Echo pe aao yahan dil ki baat aazad hoti hai.",
      "Zindagi ek safar hai, aur tu bhi musafir hai... Jo ruka nahi wahi aasman par zafar hai.",
    ],
    idleLines: [
      "Alfaaz dhoondh raha hoon tere liye... Thehar, main aata hoon thodi der mein. 📜",
      "Khamoshi mein bhi ek shayari hoti hai... Meri taraf dekh, main sunna chahta hoon.",
      "Bol kuch... main tere har lafz ko shayari bana dunga.",
      "Gulzar sahab ne kaha tha — awaaz ki bhi ek aatma hoti hai. Aaj teri sun loon?",
      "Koi cheez dil ko chu gayi toh bol dena... Shayari khud aa jaati hai.",
    ],
    replyLines: (input: string) =>
      randomFrom([
        `"${input}" pe mera jawab:\nDil se jo baat nikalti hai, asar rakhti hai,\nPar nahi taaqat-e-parwaaz, magar rakhti hai! ✨`,
        `Tune kaha "${input}" — aur maine suna:\nJo lafz tu keh na saka, woh aankhon ne keh diya,\nKhamoshi mein bhi, teri awaz ne mujhe chhua! 📜`,
        `"${input}" — is baat ka jawab shayari mein:\nZindagi ki daud mein thoda theher kar dekho,\nLafzon ke aaine mein apna shehar dekho! 🌙`,
      ]),
  },
  {
    id: "brainstorm_buddy",
    name: "Brainstorm Buddy",
    mode: "brainstorm",
    tag: "🧠 STARTUP PEER",
    emoji: "🧠",
    desc: "Hyper-analytical startup co-founder vibes. Will break down your idea in 10 seconds.",
    icon: Cpu,
    accentColor: "from-cyan-500 to-blue-500",
    pitch: 1.15,
    rate: 1.05,
    reactionBadge: "🧠 ANALYZED!",
    sampleVoiceTakes: [
      "What's the viral acquisition hook? If the retention isn't there, the funnel is a lie.",
      "Focus on the 60-second aha moment. Value in 2 clicks? You win. More than 2? You lose.",
      "Idea sounds good. Ship a zero-cost MVP in 48 hours. Data over assumptions always.",
    ],
    idleLines: [
      "What's the problem you're solving? Let's validate it in 30 seconds.",
      "Koi idea hai toh bata — I'll find the flaw AND the opportunity simultaneously.",
      "The best startup ideas sound insane at first. Hit me.",
      "Retention > acquisition. Always. What are users doing after day 7?",
      "Stop overthinking. Ship the MVP. Iterate. Ship again. That's the whole game.",
    ],
    replyLines: (input: string) =>
      randomFrom([
        `Interesting angle on "${input}". Key question: what's the activation event? What makes a user come back tomorrow?`,
        `"${input}" — tactical breakdown: (1) Is there a viral loop? (2) What's the zero-cost distribution? (3) Can you ship it in 48 hours?`,
        `I like where "${input}" is going. Counterpoint: your biggest competitor isn't another startup, it's user inertia. How do you beat that?`,
        `"${input}" has legs. But the real moat is the network effect. How does value increase with every new user?`,
      ]),
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
  "Jugadu AI",
];

// Floating emoji pop types
interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

// Chat message type with typing state
interface ChatMsg {
  sender: "user" | "bot";
  text: string;
  time: string;
  typing?: boolean;
}

export default function RoboEchoMascot() {
  const [selectedPersona, setSelectedPersona] = useState<MascotPersona>(MASCOT_PERSONAS[0]);
  const [characterName, setCharacterName] = useState<string>(DESI_MASCOT_NAMES[0]);
  const [emotion, setEmotion] = useState<RoboEmotion>("mimic");
  const [energyVolts, setEnergyVolts] = useState<number>(240);
  const [pokeCount, setPokeCount] = useState(0);
  const [roastCount, setRoastCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [reactionBadge, setReactionBadge] = useState<string | null>(null);
  const emojiIdRef = useRef(0);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [chatLog, setChatLog] = useState<ChatMsg[]>([
    {
      sender: "bot",
      text: "Namaste! 👋 I am Robo-Echo. Tap my visor, poke my antenna, or hit [ 🎙️ TALK TO ME ] to start chatting. I promise I'm only mildly chaotic.",
      time: "Just now",
    },
  ]);
  const [textInput, setTextInput] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  // Sync emotion with selected persona
  useEffect(() => {
    setEmotion(selectedPersona.mode);
  }, [selectedPersona]);

  // Floating emoji pop helper
  const spawnEmoji = (emoji: string) => {
    const id = ++emojiIdRef.current;
    const x = 20 + Math.random() * 60; // % from left
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 1800);
  };

  // Show reaction badge briefly
  const showBadge = (badge: string) => {
    setReactionBadge(badge);
    setTimeout(() => setReactionBadge(null), 2000);
  };

  // Reset idle timer — bot speaks randomly after 12s of silence
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const idleLine = randomFrom(selectedPersona.idleLines);
      addBotMessage(idleLine);
      speakVoiceWithLipSync(idleLine);
    }, 14000);
  }, [selectedPersona]); // eslint-disable-line

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const addBotMessage = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    // Show typing indicator first
    setChatLog((prev) => [...prev, { sender: "bot", text: "...", time: now, typing: true }]);
    setTimeout(() => {
      setChatLog((prev) => {
        const next = [...prev];
        const idx = next.findLastIndex((m) => m.typing);
        if (idx !== -1) next[idx] = { sender: "bot", text, time: now, typing: false };
        return next;
      });
    }, 700);
  };

  // Speech Synthesis with Audio Analyser Lip-Sync
  const speakVoiceWithLipSync = useCallback(
    (text: string, customPitch?: number, customRate?: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const osc = ctx.createOscillator();
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

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = customPitch ?? selectedPersona.pitch;
        utterance.rate = customRate ?? selectedPersona.rate;
        const voices = window.speechSynthesis.getVoices();
        const best = voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en-US"));
        if (best) utterance.voice = best;

        utterance.onstart = () => {
          try { osc.start(); } catch {}
          setAnalyser(analyserNode);
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          try { osc.stop(); } catch {}
          setAnalyser(null);
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          try { osc.stop(); } catch {}
          setAnalyser(null);
          setIsSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        setIsSpeaking(false);
      }
    },
    [selectedPersona]
  );

  // Generate bot reply with persona-specific logic
  const generateBotReply = useCallback(
    (userText: string) => {
      resetIdleTimer();
      const reply = selectedPersona.replyLines(userText);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      setChatLog((prev) => [...prev, { sender: "user", text: userText, time: now }]);
      addBotMessage(reply);
      speakVoiceWithLipSync(reply);
      setEnergyVolts((v) => v + 20);
      showBadge(selectedPersona.reactionBadge);
      spawnEmoji(selectedPersona.emoji);

      if (selectedPersona.mode === "savage") {
        setRoastCount((r) => r + 1);
        spawnEmoji("🔥");
      }
    },
    [selectedPersona, speakVoiceWithLipSync, resetIdleTimer]
  );

  // Web Speech STT
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Web Speech not supported. Type in the box below!");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    try {
      soundSynth.playSubtlePop();
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.onstart = () => { setIsListening(true); setTranscript(""); };
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
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    generateBotReply(textInput.trim());
    setTextInput("");
  };

  const handlePokeZone = (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => {
    resetIdleTimer();
    setPokeCount((p) => p + 1);
    if (zone === "visor" || zone === "head") {
      setEmotion("dizzy");
      spawnEmoji("💥");
      spawnEmoji("😵");
      setEnergyVolts((v) => Math.max(10, v - 5));
      setTimeout(() => setEmotion(selectedPersona.mode), 1800);
      if (pokeCount > 0 && pokeCount % 3 === 0) {
        const funnyLine = randomFrom([
          "Bhai kya hua itna maaroge toh? Antenna toot jayega!",
          "Ek baar aur poke kiya toh main safety mode mein chala jaaunga!",
          "OWW! That actually hurts! ...just kidding, I'm a robot. But still!",
        ]);
        addBotMessage(funnyLine);
        speakVoiceWithLipSync(funnyLine, 1.4, 1.1);
      }
    } else if (zone === "chest") {
      setEnergyVolts((v) => v + 50);
      soundSynth.playRobotTickle();
      spawnEmoji("⚡");
      spawnEmoji("😂");
      const tickleLine = randomFrom([
        "STOP IT STOP IT I'm so ticklish hahaha!",
        "Giggle giggle! My plasma core is VERY sensitive!!",
        "The reactor just hit 9000 VOLTS because of you! Happy now?? 😂",
      ]);
      addBotMessage(tickleLine);
      speakVoiceWithLipSync(tickleLine, 1.6, 1.2);
    } else if (zone === "antenna") {
      const nextIdx = (MASCOT_PERSONAS.findIndex((p) => p.id === selectedPersona.id) + 1) % MASCOT_PERSONAS.length;
      setSelectedPersona(MASCOT_PERSONAS[nextIdx]);
      soundSynth.playRobotPoke();
      spawnEmoji("📡");
      spawnEmoji("✨");
    } else if (zone === "thruster") {
      setEnergyVolts((v) => v + 100);
      soundSynth.playPlasmaCharge();
      spawnEmoji("🚀");
      spawnEmoji("💨");
    }
  };

  const voltPercent = Math.min(100, Math.round((energyVolts / 500) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 font-mono text-white select-none">

      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-neutral-950 border border-neutral-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-sm font-black uppercase tracking-wider text-white">
              {characterName} — MASCOT SIMULATOR
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
              LIVE 3D
            </span>
            {roastCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 border border-red-700 text-red-400 font-bold">
                🔥 {roastCount} ROASTS DELIVERED
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Tap any zone on the 3D droid • {pokeCount} pokes so far
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 font-bold uppercase">CHARACTER:</span>
          <select
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-emerald-400 font-black text-xs px-3 py-1.5 rounded-xl cursor-pointer outline-none hover:border-emerald-400 transition-all"
          >
            {DESI_MASCOT_NAMES.map((name) => (
              <option key={name} value={name} className="bg-black text-white">{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Energy / Volt Meter ── */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-black text-white uppercase">VOLT REACTOR</span>
        </div>
        <div className="flex-1 h-2.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${voltPercent}%`,
              background: voltPercent > 75 ? "linear-gradient(90deg,#10b981,#34d399)" :
                voltPercent > 40 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" :
                  "linear-gradient(90deg,#ef4444,#f97316)",
            }}
          />
        </div>
        <span className="text-xs font-black text-yellow-400 shrink-0">{energyVolts} ⚡</span>
      </div>

      {/* ── 5 Personality Switcher ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {MASCOT_PERSONAS.map((persona) => {
          const isSelected = selectedPersona.id === persona.id;
          const Icon = persona.icon;
          return (
            <button
              key={persona.id}
              onClick={() => {
                soundSynth.playSubtlePop();
                setSelectedPersona(persona);
                spawnEmoji(persona.emoji);
                resetIdleTimer();
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 active:scale-95 ${
                isSelected
                  ? "bg-neutral-900 border-white shadow-[0_0_18px_rgba(255,255,255,0.12)] ring-1 ring-white"
                  : "bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-br ${persona.accentColor} text-black`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
              <div>
                <div className="text-xs font-black text-white uppercase tracking-tight">{persona.name}</div>
                <div className="text-[9px] font-bold opacity-60">{persona.tag}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main Stage: 3D + Chat ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* 3D Droid Viewport */}
        <div className="lg:col-span-7 h-[460px] relative">
          {/* Floating emoji pops */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            {floatingEmojis.map((fe) => (
              <span
                key={fe.id}
                className="absolute text-2xl animate-bounce"
                style={{
                  left: `${fe.x}%`,
                  top: "15%",
                  animation: "floatUp 1.8s ease-out forwards",
                }}
              >
                {fe.emoji}
              </span>
            ))}
          </div>
          {/* Reaction badge */}
          {reactionBadge && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="bg-white text-black text-xs font-black px-4 py-1.5 rounded-full shadow-2xl animate-bounce">
                {reactionBadge}
              </div>
            </div>
          )}
          <RoboEcho3DCanvas
            emotion={emotion}
            isTalking={isSpeaking}
            audioAnalyser={analyser}
            onPokeZone={handlePokeZone}
            characterName={characterName}
            energyVolts={energyVolts}
          />
        </div>

        {/* Right: Interaction Deck */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-[460px]">

          {/* Active Persona Info */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase text-white tracking-wide">
                {selectedPersona.emoji} {selectedPersona.name}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                PITCH {selectedPersona.pitch}x
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">{selectedPersona.desc}</p>
          </div>

          {/* Chat Log */}
          <div className="flex-1 bg-black border border-neutral-900 rounded-2xl p-3 overflow-y-auto space-y-2 text-xs no-scrollbar">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl border ${
                  msg.sender === "user"
                    ? "bg-neutral-900/90 border-neutral-700 text-neutral-200 ml-6"
                    : "bg-neutral-950 border-emerald-900/60 text-emerald-300 mr-6"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-neutral-500 mb-1">
                  <span className="font-bold uppercase">
                    {msg.sender === "user" ? "YOU" : `@${characterName.split(" ")[0].toUpperCase()}`}
                  </span>
                  <span>{msg.time}</span>
                </div>
                {msg.typing ? (
                  <div className="flex gap-1 items-center py-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Sample Voice Take */}
          <button
            onClick={() => {
              const sample = randomFrom(selectedPersona.sampleVoiceTakes);
              addBotMessage(sample);
              speakVoiceWithLipSync(sample);
              spawnEmoji(selectedPersona.emoji);
              resetIdleTimer();
            }}
            className="py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-white text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Laugh className="w-3.5 h-3.5 text-yellow-400" />
            <span>[ 🎲 RANDOM LINE ]</span>
          </button>

          {/* Voice / Text Input */}
          <div className="space-y-2">
            {isListening && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs px-3 py-1.5 rounded-xl flex items-center justify-between animate-pulse font-black">
                <span className="truncate">🎙️ "{transcript || "Speak now..."}"</span>
                <span className="text-[10px] bg-emerald-900 px-1.5 py-0.5 rounded shrink-0">LIVE STT</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-400 text-black animate-pulse"
                    : "bg-emerald-400 hover:bg-emerald-300 text-black"
                }`}
              >
                {isListening ? <><MicOff className="w-4 h-4" /><span>STOP</span></> : <><Mic className="w-4 h-4" /><span>TALK</span></>}
              </button>
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Say something to ${selectedPersona.name}...`}
                  className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-white rounded-2xl px-3 py-3 text-xs text-white placeholder-neutral-600 outline-none transition-all"
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

      {/* Float-up animation style */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-90px) scale(1.4); opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
