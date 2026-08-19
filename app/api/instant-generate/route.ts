import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { BG_PRESETS } from "@/lib/audioMixer";

export interface SongSection {
  type: "VERSE 1" | "CHORUS" | "VERSE 2" | "OUTRO" | "STANZA";
  lines: string[];
}

export interface SongComposition {
  title: string;
  genre: string;
  sections: SongSection[];
  fullLyrics: string;
  vocalVoice: string;
  bgTrackId: string;
  rate: string;
  pitch: string;
  estimatedDurationSec: number;
}

// ── Full Structured Song & Shayari Compositions Engine ────────────────────────
function composeFullSong(userPrompt: string, requestedLength: "full" | "quick", requestedVoice?: string): SongComposition {
  const p = userPrompt.toLowerCase();
  const isFull = requestedLength === "full";

  // 1. Sad Acoustic Song / Emotional Hindi Ghazal
  if (
    p.includes("sad") ||
    p.includes("acoustic") ||
    p.includes("lonely") ||
    p.includes("heartbreak") ||
    p.includes("rain") ||
    p.includes("dard") ||
    p.includes("yaad") ||
    p.includes("shayari") ||
    p.includes("ghazal") ||
    p.includes("dil") ||
    p.includes("hindi")
  ) {
    const fullSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "ख़ामोशियों की अपनी एक अजीब दास्तान होती है,",
          "जो लफ़्ज़ों में ना आए वो बात बयां होती है।",
          "इस शहर के शोर में जब खुद को तलाशने निकले,",
          "हर मोड़ पे तेरी ही यादों का कारवां मिलता है।",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "ये भीगी रातें, ये तन्हा समां,",
          "तू पास नहीं फिर भी हर सू है यहां।",
          "एक दर्द सा जो सीने में जाग उठता है,",
          "तेरे बिन ये दिल अब कहां संभलता है।",
        ],
      },
      {
        type: "VERSE 2",
        lines: [
          "कागज़ पे उतर आए तो अश्क नहीं रहते,",
          "लफ़्ज़ों में ढल जाएं तो ग़म सख्त नहीं रहते।",
          "हम ढूंढते रहे उजाला गैरों की महफ़िल में,",
          "और अपनी ही रोशनी चुपचाप बुझ जाती है।",
        ],
      },
      {
        type: "OUTRO",
        lines: [
          "हर गूंज के पीछे एक अनकही सदा है,",
          "ये इश्क़ भी शायद एक खूबसूरत सज़ा है...",
        ],
      },
    ];

    const quickSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "ख़ामोशियों की अपनी एक अजीब दास्तान होती है,",
          "जो लफ़्ज़ों में ना आए वो बात बयां होती है।",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "ये भीगी रातें, ये तन्हा समां,",
          "तेरे बिन ये दिल अब कहां संभलता है।",
        ],
      },
    ];

    const activeSections = isFull ? fullSections : quickSections;
    const fullLyrics = activeSections.map((s) => `[${s.type}]\n${s.lines.join("\n")}`).join("\n\n");

    return {
      title: isFull ? "Tanhai Ki Baarish (Full Acoustic)" : "Khamoshiyon Ka Safar",
      genre: "Sad Acoustic Ghazal",
      sections: activeSections,
      fullLyrics,
      vocalVoice: requestedVoice || "hi-IN-MadhurNeural",
      bgTrackId: "acoustic_noir",
      rate: "-6%",
      pitch: "-2Hz",
      estimatedDurationSec: isFull ? 68 : 28,
    };
  }

  // 2. Classical Urdu Poetry & Mehfil Ghazal
  if (p.includes("urdu") || p.includes("ishq") || p.includes("mohabbat") || p.includes("poetry") || p.includes("shayar")) {
    const fullSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "दिल की महफ़िल में कभी जब वो उजाला करते हैं,",
          "हम भी चुपके से नई बात निकाला करते हैं।",
          "उनकी नज़रों का असर दिल पे कुछ ऐसा हुआ,",
          "हर शिकवे को हम दुआ में ढाला करते हैं।",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "अजब सी कशिश है तेरी बातों में यारा,",
          "डूबा जो किनारे पे वो था बेचारा।",
          "मोहब्बत का मौसम जब रंग बदलता है,",
          "हर ज़र्रा ज़माने का महकने लगता है।",
        ],
      },
      {
        type: "VERSE 2",
        lines: [
          "रातों के मुसाफ़िर को कोई मंज़िल तो मिले,",
          "इस सहरा-ए-ग़म में कोई साहिल तो मिले।",
          "हम खुद ही मिटा देंगे सारे गिले-शिकवे,",
          "एक बार वो हमसफ़र बा-वफ़ा तो मिले।",
        ],
      },
      {
        type: "OUTRO",
        lines: [
          "ये दास्तान-ए-शौक़ यूं ही चलती रहेगी,",
          "दिल की शमा हर शाम जलती रहेगी...",
        ],
      },
    ];

    const quickSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "दिल की महफ़िल में कभी जब वो उजाला करते हैं,",
          "हम भी चुपके से नई बात निकाला करते हैं।",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "अजब सी कशिश है तेरी बातों में यारा,",
          "डूबा जो किनारे पे वो था बेचारा।",
        ],
      },
    ];

    const activeSections = isFull ? fullSections : quickSections;
    const fullLyrics = activeSections.map((s) => `[${s.type}]\n${s.lines.join("\n")}`).join("\n\n");

    return {
      title: isFull ? "Dastaan-e-Shauq (Urdu Ghazal)" : "Mehfil-e-Khaas",
      genre: "Classical Urdu Poetry",
      sections: activeSections,
      fullLyrics,
      vocalVoice: requestedVoice || "ur-PK-AsadNeural",
      bgTrackId: "acoustic_noir",
      rate: "-5%",
      pitch: "-1Hz",
      estimatedDurationSec: isFull ? 70 : 30,
    };
  }

  // 3. Late-Night Lo-Fi Indie Pop & Thought Monologue
  if (p.includes("lofi") || p.includes("lo-fi") || p.includes("indie") || p.includes("chill") || p.includes("sleep") || p.includes("relax") || p.includes("night")) {
    const fullSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "Streetlights flickering through the cold window pane,",
          "Washing away the noise in midnight rain.",
          "We talk in whispers when the whole world sleeps,",
          "Counting the promises that nobody keeps.",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "Floating through the static in a parallel room,",
          "Turning past regret into late-night bloom.",
          "Just you and me and the vinyl hum,",
          "Waiting for the morning sun to come.",
        ],
      },
      {
        type: "VERSE 2",
        lines: [
          "The coffee got cold an hour ago,",
          "Watching old shadows move soft and slow.",
          "Every broken lyric finally found its rhyme,",
          "Lost in the frequency, stepping out of time.",
        ],
      },
      {
        type: "OUTRO",
        lines: [
          "Just let the beat ride till the darkness fades,",
          "Echoes remaining in the velvet shades...",
        ],
      },
    ];

    const quickSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "Streetlights flickering through the cold window pane,",
          "Washing away the noise in midnight rain.",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "Floating through the static in a parallel room,",
          "Just you and me and the vinyl hum.",
        ],
      },
    ];

    const activeSections = isFull ? fullSections : quickSections;
    const fullLyrics = activeSections.map((s) => `[${s.type}]\n${s.lines.join("\n")}`).join("\n\n");

    return {
      title: isFull ? "Velvet Midnight (Full Lo-Fi Track)" : "Static & Coffee",
      genre: "Midnight Lo-Fi Indie",
      sections: activeSections,
      fullLyrics,
      vocalVoice: requestedVoice || "en-US-JennyNeural",
      bgTrackId: "lofi_chill",
      rate: "-4%",
      pitch: "+1Hz",
      estimatedDurationSec: isFull ? 64 : 26,
    };
  }

  // 4. Cyberpunk / Market Dispatch / High-Energy Track
  if (p.includes("cyberpunk") || p.includes("rap") || p.includes("market") || p.includes("trading") || p.includes("crypto") || p.includes("energy") || p.includes("tech")) {
    const fullSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "Terminal Node 09 online. Telemetry live.",
          "Scanning liquidity blocks on the 5-minute drive.",
          "They panic at the resistance while the floor gets built,",
          "Zero emotion on the tape, strictly trading without guilt.",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "Synthesizing alpha across the decentralized wire,",
          "When volatility spikes, we step into the fire.",
          "High speed, low latency, all systems primed,",
          "Every single breakout perfectly timed.",
        ],
      },
      {
        type: "VERSE 2",
        lines: [
          "Neon reflections on the multi-monitor array,",
          "Institutional flow moving before the break of day.",
          "Stick to the protocol, protect your position size,",
          "The signals are clear right in front of your eyes.",
        ],
      },
      {
        type: "OUTRO",
        lines: [
          "Execution confirmed. Node verified.",
          "Echo frequency transmission complete.",
        ],
      },
    ];

    const quickSections: SongSection[] = [
      {
        type: "VERSE 1",
        lines: [
          "Terminal Node 09 online. Telemetry live.",
          "Scanning liquidity blocks on the 5-minute drive.",
        ],
      },
      {
        type: "CHORUS",
        lines: [
          "Synthesizing alpha across the decentralized wire,",
          "Every single breakout perfectly timed.",
        ],
      },
    ];

    const activeSections = isFull ? fullSections : quickSections;
    const fullLyrics = activeSections.map((s) => `[${s.type}]\n${s.lines.join("\n")}`).join("\n\n");

    return {
      title: isFull ? "Order Flow Overdrive (Full Track)" : "Terminal Alpha",
      genre: "Cyberpunk Dispatch",
      sections: activeSections,
      fullLyrics,
      vocalVoice: requestedVoice || "en-US-GuyNeural",
      bgTrackId: "synthwave_ambient",
      rate: "+8%",
      pitch: "+1Hz",
      estimatedDurationSec: isFull ? 60 : 25,
    };
  }

  // 5. Default Universal Soulful Ballad
  const fullSections: SongSection[] = [
    {
      type: "VERSE 1",
      lines: [
        "In the quiet spaces between who we are,",
        "We catch a glimpse of every distant star.",
        "Writing our story one melody at a time,",
        "Searching for meaning in the rhythm and the rhyme.",
      ],
    },
    {
      type: "CHORUS",
      lines: [
        "And all the echoes of yesterday,",
        "Gently guide us through the gray.",
        "Hold onto the sound, let the music breathe,",
        "In this frequency, we find what we believe.",
      ],
    },
    {
      type: "VERSE 2",
      lines: [
        "A thousand voices drifting through the air,",
        "Finding connection in the moments that we share.",
        "No matter where the winding journey goes,",
        "The harmony within continues as it flows.",
      ],
    },
    {
      type: "OUTRO",
      lines: [
        "Let the song linger when the lights go low,",
        "Carried by the gentle undertow...",
      ],
    },
  ];

  const quickSections: SongSection[] = [
    {
      type: "VERSE 1",
      lines: [
        "In the quiet spaces between who we are,",
        "We catch a glimpse of every distant star.",
      ],
    },
    {
      type: "CHORUS",
      lines: [
        "And all the echoes of yesterday,",
        "Gently guide us through the gray.",
      ],
    },
  ];

  const activeSections = isFull ? fullSections : quickSections;
  const fullLyrics = activeSections.map((s) => `[${s.type}]\n${s.lines.join("\n")}`).join("\n\n");

  return {
    title: isFull ? "Echoes in Harmony (Full Song)" : "Echoes in Harmony",
    genre: "Soulful Acoustic Ballad",
    sections: activeSections,
    fullLyrics,
    vocalVoice: requestedVoice || "en-US-ChristopherNeural",
    bgTrackId: "acoustic_noir",
    rate: "-4%",
    pitch: "-1Hz",
    estimatedDurationSec: isFull ? 65 : 26,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    const length = (body.length === "quick" ? "quick" : "full") as "full" | "quick";
    const voiceOverride = body.voiceId ? String(body.voiceId) : undefined;

    if (!prompt) {
      return NextResponse.json(
        { error: "A prompt is required to generate a song" },
        { status: 400 }
      );
    }

    // 1. Compose full structured song lyrics & vocal profile
    const composition = composeFullSong(prompt, length, voiceOverride);

    // 2. Synthesize complete vocal performance
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      composition.vocalVoice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    // Speak all lines smoothly with pauses between stanzas
    const cleanSpeechText = composition.sections
      .map((s) => s.lines.join(" ... "))
      .join(" ...... ");

    const streamResult = tts.toStream(cleanSpeechText, {
      rate: composition.rate,
      pitch: composition.pitch,
    });

    const audioStream = (streamResult as any).audioStream || streamResult;

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

    // 3. Resolve background backing instrumental loop
    const bgPreset =
      BG_PRESETS.find((bg) => bg.id === composition.bgTrackId) || BG_PRESETS[0];

    return NextResponse.json({
      success: true,
      title: composition.title,
      genre: composition.genre,
      sections: composition.sections,
      fullLyrics: composition.fullLyrics,
      vocalVoice: composition.vocalVoice,
      audioBase64,
      bgTrackUrl: bgPreset.id !== "none" ? bgPreset.url : "",
      bgTrackId: bgPreset.id,
      defaultDucking: 0.22,
      estimatedDurationSec: composition.estimatedDurationSec,
    });
  } catch (error: any) {
    console.error("[Instant Full Song Generate Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate song", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
