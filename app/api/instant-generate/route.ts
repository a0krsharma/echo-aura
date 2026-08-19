import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { BG_PRESETS } from "@/lib/audioMixer";

// Built-in intelligent lyricist & mood mapper for 100% original creations
function generateOriginalComposition(userPrompt: string): {
  title: string;
  lyrics: string;
  mood: "ghazal_sad" | "indie_lofi" | "noir_monologue" | "trading_dispatch" | "poetic_romantic";
  voice: string;
  bgId: string;
  rate: string;
  pitch: string;
} {
  const p = userPrompt.toLowerCase();

  // Pattern 1: Shayari / Ghazal / Sad Urdu / Hindi Poetry
  if (p.includes("shayari") || p.includes("ghazal") || p.includes("sad") || p.includes("lonely") || p.includes("dard") || p.includes("yaad") || p.includes("dil")) {
    const titles = [
      "Khamoshiyon Ka Safar",
      "Tanhai Ki Baarish",
      "Raat Ki Dastaan",
      "Bikhre Alfaaz",
      "Shor-e-Shahr Mein Sukoon",
    ];
    const verses = [
      "ख़ामोशियों की अपनी एक ज़ुबान होती है,\nजो लफ़्ज़ों में ना आए वो बात बयां होती है।\nइस शहर के शोर में कभी खुद को भी सुन लेना,\nहर गूंज के पीछे एक अनकही दास्तान होती है।",
      "रात की तन्हाई में जब हवा गुनगुनाती है,\nबीती हुई हर बात दिल को बहुत सताती है।\nहम ढूंढते रहे उजाला गैरों की महफ़िल में,\nऔर अपनी ही रोशनी चुपचाप बुझ जाती है।",
      "कागज़ पे उतर आए तो अश्क नहीं रहते,\nलफ़्ज़ों में ढल जाएं तो ग़म सख्त नहीं रहते।\nकुछ ज़ख्म वक़्त के साथ नासूर बन जाते हैं,\nजो चुपचाप सहे जाएं वो कभी कम नहीं होते।",
    ];

    const idx = Math.floor(Math.random() * verses.length);
    return {
      title: titles[idx % titles.length],
      lyrics: verses[idx],
      mood: "ghazal_sad",
      voice: "hi-IN-MadhurNeural",
      bgId: "acoustic_noir",
      rate: "-6%",
      pitch: "-2Hz",
    };
  }

  // Pattern 2: Trading / Crypto / Tech / Market Dispatch
  if (p.includes("trading") || p.includes("market") || p.includes("stock") || p.includes("crypto") || p.includes("tech") || p.includes("bitcoin") || p.includes("ai")) {
    const titles = [
      "Order Flow Telemetry 047",
      "Liquidity Sweep at Market Open",
      "Terminal Alpha Report",
      "Frequency Node Briefing",
    ];
    const scripts = [
      "Market open telemetry verified. Liquidity sweeps detected at key resistance nodes. Volatility expanding across the frequency. Maintain strict risk protocols.",
      "Terminal Node 09 online. Decentralized audio compute streaming at sub-second latency. Order book depth stable. All systems green for deployment.",
      "The tape doesn't lie. When retail panic sets in, institutional capital builds the floor. Watch the volume profile and stay disciplined.",
    ];

    const idx = Math.floor(Math.random() * scripts.length);
    return {
      title: titles[idx % titles.length],
      lyrics: scripts[idx],
      mood: "trading_dispatch",
      voice: "en-US-GuyNeural",
      bgId: "lofi_chill",
      rate: "+8%",
      pitch: "+1Hz",
    };
  }

  // Pattern 3: Cyberpunk / Midnight / Noir Monologue
  if (p.includes("noir") || p.includes("cyberpunk") || p.includes("midnight") || p.includes("rain") || p.includes("dark") || p.includes("philosophy") || p.includes("deep")) {
    const titles = [
      "Midnight Neon & Rain",
      "Echoes in the Digital Void",
      "Signals from District 4",
      "The Architecture of Thought",
    ];
    const monologues = [
      "Midnight in the terminal. The neon flickers against rain-slicked glass. We build architectures out of pure thought, broadcasting echoes into the void, waiting for a signal to bounce back.",
      "In a world of constant noise, true signal is the rarest currency. When you strip away the distraction, only the frequency of your conviction remains.",
      "The city breathes in pulses of light and code. Somewhere between the static, two frequencies intersect. That is where we build the future.",
    ];

    const idx = Math.floor(Math.random() * monologues.length);
    return {
      title: titles[idx % titles.length],
      lyrics: monologues[idx],
      mood: "noir_monologue",
      voice: "en-US-ChristopherNeural",
      bgId: "synthwave_ambient",
      rate: "-8%",
      pitch: "-2Hz",
    };
  }

  // Pattern 4: Default Romantic / Lo-Fi Indie Poetry
  const titles = [
    "Echoes of Tomorrow",
    "Soft Sunlight & Whispers",
    "Acoustic Nostalgia Loop",
    "Parallel Frequencies",
  ];
  const lyrics = [
    "Some moments stay etched forever in sound,\nLike soft whispers when there's no one around.\nA melody drifting through the open window,\nCarrying thoughts we never dared to let go.",
    "The sunlight shifts across an empty room,\nTurning old memories into afternoon bloom.\nWe write our stories one line at a time,\nCatching the rhythm, seeking the rhyme.",
  ];
  const idx = Math.floor(Math.random() * lyrics.length);

  return {
    title: titles[idx % titles.length],
    lyrics: lyrics[idx],
    mood: "indie_lofi",
    voice: "en-US-JennyNeural",
    bgId: "lofi_chill",
    rate: "-4%",
    pitch: "+1Hz",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "A prompt is required to generate an instant track" },
        { status: 400 }
      );
    }

    // 1. Generate 100% original composition & map mood
    const comp = generateOriginalComposition(prompt);

    // 2. Synthesize speech stream via MsEdgeTTS
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      comp.voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const streamResult = tts.toStream(comp.lyrics, {
      rate: comp.rate,
      pitch: comp.pitch,
    });

    const audioStream = (streamResult as any).audioStream || streamResult;

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

    // 3. Resolve background backing loop URL
    const bgPreset = BG_PRESETS.find((bg) => bg.id === comp.bgId) || BG_PRESETS[0];

    return NextResponse.json({
      success: true,
      title: comp.title,
      lyrics: comp.lyrics,
      mood: comp.mood,
      voice: comp.voice,
      audioBase64,
      bgTrackUrl: bgPreset.id !== "none" ? bgPreset.url : "",
      bgTrackId: bgPreset.id,
      defaultDucking: 0.22,
    });
  } catch (error: any) {
    console.error("[Instant Generate Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate instant track", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
