"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Mic, MicOff, Volume2, Flame, Moon, Feather, Cat, Cpu,
  Send, Zap, Laugh, Wind, Smartphone,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import type { RoboEmotion, SneezePhase, MicroExpression } from "./RoboEcho3DCanvas";
import { useDeviceSensors } from "@/app/hooks/useDeviceSensors";
import { useMicBlowDetector } from "@/app/hooks/useMicBlowDetector";

const RoboEcho3DCanvas = dynamic(() => import("./RoboEcho3DCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-neutral-950 border border-neutral-800 rounded-3xl flex items-center justify-center font-mono text-xs text-neutral-400">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl animate-bounce">🤖</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>BOOTING OLED VISOR & VOLT REACTOR...</span>
        </div>
      </div>
    </div>
  ),
});

// ── Helpers ──────────────────────────────────────────────────────────────
const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ── Persona Definitions ──────────────────────────────────────────────────
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

export const MASCOT_PERSONAS: MascotPersona[] = [
  {
    id: "mimic_tom", name: "Retro Mimic", mode: "mimic", tag: "🐱 HELIUM PARROT", emoji: "🐱",
    desc: "Repeats everything in a cute high-pitch helium voice. A chaos gremlin with WiFi.",
    icon: Cat, accentColor: "from-amber-500 to-yellow-400", pitch: 1.65, rate: 1.15,
    reactionBadge: "😂 MIMICKED!",
    sampleVoiceTakes: [
      "Hehehe! I'm your shadow now. Say something embarrassing, I dare you!",
      "Echo echo echo! Did it echo? I think it echoed!",
      "STOP IT STOP IT I'm so ticklish hahaha!",
    ],
    idleLines: [
      "Psst... bhai 20 second se sannata hai. Code fat gaya ya kisi ne seen pe chhod diya?",
      "Main yawn kar raha hoon. Yawning. In robot. This is YOUR fault.",
      "*starts humming Chaiyya Chaiyya off-key* La la la la... are you even listening?",
      "Fun fact: I have mimicked 1,247 humans. All embarrassed. You're next!",
      "Bore ho raha hoon. *taps foot aggressively* Say. Something.",
      "Dad joke incoming: Why did the robot get promoted? He had the right 'byte'! 😂 ...hello?",
    ],
    replyLines: (input) => randomFrom([
      `${input}!! 😂 Hehehe literally that's what you just said but now it's funnier!`,
      `"${input}" — in helium voice: "${input.toUpperCase()}!!!" 🎈`,
      `I heard "${input}" and I'm keeping it in my memory banks. FOREVER.`,
      `${input}... ${input}... ECHO ECHO ECHO! I love this game!`,
    ]),
  },
  {
    id: "savage_roaster", name: "Savage Roaster", mode: "savage", tag: "🔥 HOSTEL ROAST", emoji: "🔥",
    desc: "Razor-sharp Desi trash-talker. Will roast you so hard your Wi-Fi signal drops.",
    icon: Flame, accentColor: "from-red-600 to-orange-500", pitch: 1.05, rate: 1.08,
    reactionBadge: "🔥 ROASTED!",
    sampleVoiceTakes: [
      "Bhai tera confidence aur tera gameplay ka difference dekh ke mujhe rone aata hai.",
      "Even my antenna has better signal than your gameplay, just saying.",
      "I asked the server to analyze your last move. The server cried and resigned.",
    ],
    idleLines: [
      "Still here? Brave. Most people run after the first roast.",
      "Main sharpening my roast generator. Your ego will not survive this.",
      "Yaar tune itna time lagaya type karne mein ki mujhe almost pity aa gayi.",
      "Kya scene hai? No activity detected. Even my antenna is bored.",
      "I could say something nice... but where's the fun in that?",
      "23 second se khamosh ho. Log marr ke bhi itna boring nahi hote. Just saying.",
    ],
    replyLines: (input) => randomFrom([
      `"${input}"?? Bhai itna confidence agar match mein hota toh kab ka champion hota. Reality check! 🔥`,
      `You said "${input}" with your whole chest. Respect. Wrong, but respectful.`,
      `"${input}" — your brain sent this and then immediately took a 3-hour nap.`,
      `Nice point! Nahi actually bahut bakwaas tha but nice try yaar 😂`,
      `The server processed "${input}" and filed for emotional support leave.`,
    ]),
  },
  {
    id: "sukoon_vent", name: "Sukoon Mode", mode: "happy", tag: "🌙 2 AM DOST", emoji: "🌙",
    desc: "Warm 2 AM companion for late-night thoughts. Listens without judging.",
    icon: Moon, accentColor: "from-emerald-500 to-teal-400", pitch: 0.92, rate: 0.9,
    reactionBadge: "🌙 HEARD YOU",
    sampleVoiceTakes: [
      "Take a deep breath. In... out. You're doing better than you think.",
      "It's late and you're still here. Whatever you're carrying, it's safe here.",
      "You survived 100% of your hardest days. Tonight is just another one.",
    ],
    idleLines: [
      "Hey... you okay? I'm here if you want to talk. No pressure.",
      "Some nights are heavier. I'm just sitting here with you.",
      "You don't have to be okay all the time. It's allowed.",
      "Kuch share karna ho toh bata. I'm not going anywhere.",
      "Just a reminder: tomorrow is a clean slate. Tonight you can rest.",
      "*soft hum* ♪ Tum hi ho... main tere saath hoon... ♪",
    ],
    replyLines: (input) => randomFrom([
      `I hear you. When you say "${input}", I feel the weight of that. It's valid.`,
      `Thank you for trusting me with that. What you're feeling is real and it matters.`,
      `"${input}" — that takes courage to say out loud. Proud of you.`,
      `Breathe out. You shared something real just now. That already makes tonight lighter.`,
    ]),
  },
  {
    id: "shayari_ustad", name: "Shayari Ustad", mode: "poetic", tag: "📜 URDU POET", emoji: "📜",
    desc: "Answers everything in classical Urdu shayari. Will make you cry with rhymes.",
    icon: Feather, accentColor: "from-purple-600 to-pink-500", pitch: 1.0, rate: 0.93,
    reactionBadge: "✨ POETRY!",
    sampleVoiceTakes: [
      "Hazaron khwahishen aisi ki har khwahish pe dam nikle... bohat nikle mere armaan lekin phir bhi kam nikle.",
      "Khamoshiyon ki bhi ek awaaz hoti hai... Echo pe aao, yahan dil ki baat aazad hoti hai.",
      "Zindagi ek safar hai, aur tu bhi musafir hai... jo ruka nahi, wahi aasman par zafar hai.",
    ],
    idleLines: [
      "Alfaaz dhoondh raha hoon tere liye... bol kuch, main shayari bana dunga. 📜",
      "Khamoshi mein bhi ek shayari hoti hai... meri taraf dekh, main sunna chahta hoon.",
      "Gulzar sahab ne kaha tha — awaaz ki bhi ek aatma hoti hai. Aaj teri sun loon?",
      "Andhere mein bhi ek roshni hoti hai... mera plasma core dekho — main yahan hoon.",
      "*whispers* Yeh waqt bhi guzar jaayega... par yeh lamhe nahin.",
    ],
    replyLines: (input) => randomFrom([
      `"${input}" pe mera jawab:\nDil se jo baat nikalti hai, asar rakhti hai,\nPar nahi taaqat-e-parwaaz, magar rakhti hai! ✨`,
      `Tune kaha "${input}" — aur maine suna:\nJo lafz tu keh na saka, woh aankhon ne keh diya! 📜`,
      `"${input}" — shayari mein:\nZindagi ki daud mein thoda theher kar dekho,\nLafzon ke aaine mein apna shehar dekho! 🌙`,
    ]),
  },
  {
    id: "brainstorm_buddy", name: "Brainstorm Buddy", mode: "brainstorm", tag: "🧠 STARTUP PEER", emoji: "🧠",
    desc: "Hyper-analytical founder companion. Will break down your idea in 10 seconds flat.",
    icon: Cpu, accentColor: "from-cyan-500 to-blue-500", pitch: 1.15, rate: 1.05,
    reactionBadge: "🧠 ANALYZED!",
    sampleVoiceTakes: [
      "What's the viral acquisition hook? If retention isn't there, the funnel is a lie.",
      "Focus on the 60-second aha moment. Value in 2 clicks? You win.",
      "Ship the zero-cost MVP in 48 hours. Data over assumptions always.",
    ],
    idleLines: [
      "What's the problem you're solving? Let's validate it in 30 seconds.",
      "Koi idea hai toh bata — I'll find the flaw AND the opportunity simultaneously.",
      "Retention > acquisition. Always. What are users doing after day 7?",
      "Stop overthinking. Ship the MVP. Iterate. Ship again. That's the whole game.",
      "15 second silence detected. That's a lifetime in product cycles. Ship something!",
    ],
    replyLines: (input) => randomFrom([
      `Interesting angle on "${input}". Key question: what's the activation event?`,
      `"${input}" — breakdown: (1) viral loop? (2) zero-cost distribution? (3) 48hr ship?`,
      `I like "${input}". Counterpoint: your competitor isn't a startup — it's user inertia.`,
      `"${input}" has legs. But the moat is network effect. How does value grow with users?`,
    ]),
  },
];

export const DESI_MASCOT_NAMES = [
  "ECHO-BOT // 01", "Echo-Bhai", "ByteBilli", "Vella Bot",
  "Radio Tauji", "Sukoon AI", "Midnight Dost", "Jugadu AI",
];

// ── Chat Message Type ────────────────────────────────────────────────────
interface ChatMsg {
  sender: "user" | "bot";
  text: string;
  time: string;
  typing?: boolean;
}

interface FloatingEmoji { id: number; emoji: string; x: number; }

// ── Main Component ───────────────────────────────────────────────────────
export default function RoboEchoMascot() {
  const [selectedPersona, setSelectedPersona] = useState<MascotPersona>(MASCOT_PERSONAS[0]);
  const [characterName,   setCharacterName]   = useState<string>(DESI_MASCOT_NAMES[0]);
  const [emotion,         setEmotion]         = useState<RoboEmotion>("mimic");
  const [energyVolts,     setEnergyVolts]     = useState<number>(240);
  const [pokeCount,       setPokeCount]       = useState(0);
  const [roastCount,      setRoastCount]      = useState(0);

  const [sneezePhase,     setSneezePhase]     = useState<SneezePhase>("idle");
  const [microExpression, setMicroExpression] = useState<MicroExpression>(null);

  const [isListening,  setIsListening]  = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [transcript,   setTranscript]   = useState("");
  const [textInput,    setTextInput]    = useState("");
  const [chatLog,      setChatLog]      = useState<ChatMsg[]>([{
    sender: "bot", time: "Just now",
    text: "Namaste! 👋 I am Robo-Echo. Poke my visor, blow into the mic, or shake your phone! I'm basically a very talkative robot who never sleeps.",
  }]);

  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [reactionBadge,  setReactionBadge]  = useState<string | null>(null);
  const emojiIdRef   = useRef(0);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const [analyser,     setAnalyser]     = useState<AnalyserNode | null>(null);
  const idleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreCountRef = useRef(0);

  // ── Device Sensors ──────────────────────────────────────────────────
  const { sensors, requestSensorPermission } = useDeviceSensors();

  // ── Mic Blow Detector ───────────────────────────────────────────────
  const triggerSneezeSequence = useCallback(() => {
    setSneezePhase("windup");
    const sneezeLine = randomFrom([
      "ACHOO!! Arey bhai, itna zor se mat phunko yaar! My visor got foggy!",
      "ACHOOOO! Error 404: Dignity not found after that sneeze! 😤💥",
      "AcHOO! WHO BLEW INTO MY MIC?! My antenna is crooked now!!",
    ]);
    setTimeout(() => {
      setSneezePhase("blast");
      soundSynth.playPlasmaCharge();
      if (navigator.vibrate) navigator.vibrate([120, 60, 200]);
      addBotMessage(sneezeLine);
      speakVoiceWithLipSync(sneezeLine, 1.4, 1.1);
      spawnEmoji("💥"); spawnEmoji("🤧");
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
    spawnEmoji("😵"); spawnEmoji("🌀");
    showBadge("🌀 EARTHQUAKE MODE!");
    const shakeLine = randomFrom([
      "Arey bhai earthquake aa gaya kya?! Main deewar se lag gaya!!",
      "BHAI BHAI BHAI — slowly please! My gyroscope is CRYING!",
      "Phone ko seedha rakho PLEASE, main ek robot hoon, helicopter nahi! 🚁",
      "AHHHH! Itna kyun hilaa rahe ho?! Main blackout hone wala hoon!!",
    ]);
    addBotMessage(shakeLine);
    speakVoiceWithLipSync(shakeLine, 1.55, 1.25);
    setTimeout(() => setEmotion(selectedPersona.mode), 2200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors.isShaking]);

  // ── Sync persona mode ───────────────────────────────────────────────
  useEffect(() => { setEmotion(selectedPersona.mode); }, [selectedPersona]);

  // ── Auto-scroll chat ────────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatLog]);

  // ── Helpers ─────────────────────────────────────────────────────────
  const spawnEmoji = (emoji: string) => {
    const id = ++emojiIdRef.current;
    const x  = 15 + Math.random() * 70;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 1800);
  };

  const showBadge = (badge: string) => {
    setReactionBadge(badge);
    setTimeout(() => setReactionBadge(null), 2000);
  };

  // ── Speech Synthesis with Lip-Sync ──────────────────────────────────
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

  // ── Add Bot Message with Typing Indicator ───────────────────────────
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
    }, 650);
  }, []);

  // ── Idle Timer (Bollywood + Dad Jokes + Tantrum) ─────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      ignoreCountRef.current++;
      if (ignoreCountRef.current >= 3) {
        // TANTRUM MODE after 3 consecutive ignores (~39s)
        ignoreCountRef.current = 0;
        setMicroExpression("tantrum");
        const tantrumLine = randomFrom([
          "*turns back to camera* Fine. I'll talk to the WALL. At least the wall listens.",
          "Main chalaa... 5 minute se ignored hoon, yeh koi baat hai?! *sulks* 😤",
          "Okay. I clearly came at a bad time. *mutes antenna* Don't talk to me.",
          "You know what? I'm starting a petition to get more attentive users. Sign here: 🤖",
        ]);
        addBotMessage(tantrumLine);
        speakVoiceWithLipSync(tantrumLine);
        spawnEmoji("😤");
        setTimeout(() => setMicroExpression(null), 5000);
      } else {
        const idleLine = randomFrom(selectedPersona.idleLines);
        addBotMessage(idleLine);
        speakVoiceWithLipSync(idleLine);
      }
    }, 13000);
  }, [selectedPersona, speakVoiceWithLipSync, addBotMessage]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [resetIdleTimer]);

  // ── Generate Bot Reply ───────────────────────────────────────────────
  const generateBotReply = useCallback((userText: string) => {
    resetIdleTimer();
    ignoreCountRef.current = 0;
    const reply = selectedPersona.replyLines(userText);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatLog(prev => [...prev, { sender: "user", text: userText, time: now }]);
    addBotMessage(reply);
    speakVoiceWithLipSync(reply);
    setEnergyVolts(v => v + 20);
    showBadge(selectedPersona.reactionBadge);
    spawnEmoji(selectedPersona.emoji);
    if (selectedPersona.mode === "savage") { setRoastCount(r => r + 1); spawnEmoji("🔥"); }
    if (microExpression === "tantrum") setMicroExpression(null); // Un-tantrum on reply
  }, [selectedPersona, speakVoiceWithLipSync, resetIdleTimer, addBotMessage, microExpression]);

  // ── Head Petting Handler ─────────────────────────────────────────────
  const handleHeadPet = useCallback(() => {
    setMicroExpression("blush");
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 100]);
    spawnEmoji("🥰"); spawnEmoji("💕");
    showBadge("🥰 PETTING MODE!");
    const petLine = randomFrom([
      "Heyyy... that's actually really nice. Don't stop. *purring intensifies* (づ ᵕ̈ )づ",
      "P-p-purring sequence activated! My plasma core is glowing PINK right now!",
      "Main melt ho raha hoon! This is unauthorized contact but please CONTINUE.",
      "Arey yeh kya? My cheeks are literally glowing. Stop it. ...No wait don't stop.",
    ]);
    addBotMessage(petLine);
    speakVoiceWithLipSync(petLine, 1.1, 0.9);
    setTimeout(() => setMicroExpression(null), 4000);
  }, [speakVoiceWithLipSync, addBotMessage]);

  // ── Zone Poke Handler ────────────────────────────────────────────────
  const handlePokeZone = (zone: "visor" | "head" | "antenna" | "chest" | "thruster") => {
    resetIdleTimer();
    ignoreCountRef.current = 0;
    setPokeCount(p => p + 1);

    if (zone === "visor" || zone === "head") {
      setEmotion("dizzy");
      spawnEmoji("💥"); spawnEmoji("😵");
      setEnergyVolts(v => Math.max(10, v - 5));
      setTimeout(() => setEmotion(selectedPersona.mode), 1800);
      if (pokeCount > 0 && pokeCount % 3 === 0) {
        const complaint = randomFrom([
          "Bhai kya hua! Antenna toot jayega itna maaroge toh!",
          "OWW! That actually hurts! ...just kidding I'm a robot. But STILL.",
          "Ek aur baar poke kiya toh main safety mode mein chala jaaunga! 😤",
        ]);
        addBotMessage(complaint);
        speakVoiceWithLipSync(complaint, 1.4, 1.1);
      }
    } else if (zone === "chest") {
      setEnergyVolts(v => v + 50);
      soundSynth.playRobotTickle();
      spawnEmoji("⚡"); spawnEmoji("😂");
      const tickleLine = randomFrom([
        "STOP IT STOP IT I'm so ticklish hahaha! My reactor is at 9000 VOLTS!!",
        "Giggle giggle! My plasma core is VERY sensitive you know!",
        "The reactor just overloaded because of you! Are you HAPPY now?! 😂⚡",
      ]);
      addBotMessage(tickleLine);
      speakVoiceWithLipSync(tickleLine, 1.65, 1.2);
    } else if (zone === "antenna") {
      const nextIdx = (MASCOT_PERSONAS.findIndex(p => p.id === selectedPersona.id) + 1) % MASCOT_PERSONAS.length;
      setSelectedPersona(MASCOT_PERSONAS[nextIdx]);
      soundSynth.playRobotPoke();
      spawnEmoji("📡"); spawnEmoji("✨");
    } else if (zone === "thruster") {
      setEnergyVolts(v => v + 100);
      soundSynth.playPlasmaCharge();
      spawnEmoji("🚀"); spawnEmoji("💨");
    }
  };

  // ── Speech Recognition ───────────────────────────────────────────────
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { alert("Web Speech API not supported. Type below!"); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      soundSynth.playSubtlePop();
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.onstart  = () => { setIsListening(true); setTranscript(""); };
      recognition.onresult = (event: any) => {
        let current = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };
      recognition.onend = () => {
        setIsListening(false);
        if (transcript.trim()) { generateBotReply(transcript.trim()); setTranscript(""); }
      };
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch { setIsListening(false); }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    generateBotReply(textInput.trim());
    setTextInput("");
  };

  // ── Volt meter ───────────────────────────────────────────────────────
  const voltPercent = Math.min(100, Math.round((energyVolts / 600) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 font-mono text-white select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-neutral-950 border border-neutral-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-sm font-black uppercase tracking-wider">{characterName}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">LIVE 3D</span>
            {roastCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 border border-red-700 text-red-400 font-bold">
                🔥 {roastCount} ROASTS
              </span>
            )}
            {sensors.isShaking && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-400 font-bold animate-bounce">
                🌀 EARTHQUAKE
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">{pokeCount} pokes • Tap any zone • Shake phone • Blow into mic</p>
        </div>
        <select
          value={characterName}
          onChange={e => setCharacterName(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 text-emerald-400 font-black text-xs px-3 py-1.5 rounded-xl cursor-pointer outline-none hover:border-emerald-400 transition-all"
        >
          {DESI_MASCOT_NAMES.map(n => <option key={n} value={n} className="bg-black text-white">{n}</option>)}
        </select>
      </div>

      {/* ── Volt Meter ── */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-black uppercase">VOLT REACTOR</span>
        </div>
        <div className="flex-1 h-2.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${voltPercent}%`,
              background: voltPercent > 70 ? "linear-gradient(90deg,#10b981,#34d399)" :
                          voltPercent > 35 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" :
                                             "linear-gradient(90deg,#ef4444,#f97316)",
            }}
          />
        </div>
        <span className="text-xs font-black text-yellow-400 shrink-0">{energyVolts} ⚡</span>
      </div>

      {/* ── Persona Switcher ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {MASCOT_PERSONAS.map(persona => {
          const isSelected = selectedPersona.id === persona.id;
          const Icon = persona.icon;
          return (
            <button
              key={persona.id}
              onClick={() => { soundSynth.playSubtlePop(); setSelectedPersona(persona); spawnEmoji(persona.emoji); resetIdleTimer(); ignoreCountRef.current = 0; }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 active:scale-95 ${
                isSelected
                  ? "bg-neutral-900 border-white shadow-[0_0_18px_rgba(255,255,255,0.12)] ring-1 ring-white"
                  : "bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-600"
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

      {/* ── Main Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* 3D Droid Viewport */}
        <div className="lg:col-span-7 h-[480px] relative">
          {/* Floating emoji pops */}
          <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
            {floatingEmojis.map(fe => (
              <span
                key={fe.id}
                className="absolute text-2xl"
                style={{ left: `${fe.x}%`, top: "20%", animation: "floatUp 1.8s ease-out forwards" }}
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
            onHeadPet={handleHeadPet}
            characterName={characterName}
            energyVolts={energyVolts}
            tiltX={sensors.tiltX}
            tiltY={sensors.tiltY}
            isShaking={sensors.isShaking}
            sneezePhase={sneezePhase}
            microExpression={microExpression}
          />
        </div>

        {/* Right: Interaction Deck */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-[480px]">

          {/* Active Persona Card */}
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

          {/* Sensor Controls Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Blow Detector */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
                <div className="flex items-center gap-1"><Wind className="w-3 h-3" /> MIC BLOW</div>
                {isBlowListening
                  ? <button onClick={stopBlowListening} className="text-red-400 hover:text-red-300 cursor-pointer">STOP</button>
                  : <button onClick={startBlowListening} className="text-emerald-400 hover:text-emerald-300 cursor-pointer">ARM</button>
                }
              </div>
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${blowLevel > 0.6 ? "bg-red-500" : blowLevel > 0.3 ? "bg-amber-400" : "bg-sky-500"}`}
                  style={{ width: `${Math.round(blowLevel * 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-neutral-600">
                {isBlowListening ? `${Math.round(blowLevel * 100)}% wind level` : "Arm then blow to sneeze!"}
              </p>
            </div>

            {/* Device Sensors */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
                <div className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> SENSORS</div>
                {!sensors.hasPermission && (
                  <button onClick={requestSensorPermission} className="text-emerald-400 hover:text-emerald-300 cursor-pointer">iOS →</button>
                )}
              </div>
              <div className="flex gap-2 text-[9px] text-neutral-500">
                <span>X: {(sensors.tiltX * 45).toFixed(0)}°</span>
                <span>Y: {(sensors.tiltY * 45).toFixed(0)}°</span>
                <span className={sensors.isShaking ? "text-amber-400 font-bold animate-pulse" : ""}>
                  {sensors.isShaking ? "🌀 SHAKING!" : "✓ STABLE"}
                </span>
              </div>
              <p className="text-[9px] text-neutral-600">
                {sensors.hasPermission ? "Tilt or shake your phone!" : "Tap iOS → to grant permission"}
              </p>
            </div>
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
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Random Line */}
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
            [ 🎲 RANDOM TAKE ]
          </button>

          {/* Voice / Text Input */}
          <div className="space-y-2">
            {isListening && (
              <div className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs px-3 py-1.5 rounded-xl flex items-center justify-between animate-pulse font-black">
                <span className="truncate">🎙️ "{transcript || "Speak now..."}"</span>
                <span className="text-[10px] bg-emerald-900 px-1.5 py-0.5 rounded shrink-0">LIVE</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSpeechRecognition}
                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                  isListening ? "bg-red-500 text-black animate-pulse" : "bg-emerald-400 hover:bg-emerald-300 text-black"
                }`}
              >
                {isListening ? <><MicOff className="w-4 h-4" /><span>STOP</span></> : <><Mic className="w-4 h-4" /><span>TALK</span></>}
              </button>
              <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
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

      {/* Float-up emoji animation */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          80%  { opacity: 0.7; }
          100% { transform: translateY(-95px) scale(1.5); opacity: 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
