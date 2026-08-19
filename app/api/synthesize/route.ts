import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Curated Expressive Acoustic Voice Presets
export const VOICE_PRESETS: Record<string, string> = {
  SHAYARI_HINDI_MALE: "hi-IN-MadhurNeural",
  SHAYARI_HINDI_FEMALE: "hi-IN-SwaraNeural",
  POETRY_URDU_MALE: "ur-PK-AsadNeural",
  POETRY_URDU_FEMALE: "ur-PK-UzmaNeural",
  DEEP_NARRATIVE_EN: "en-US-GuyNeural",
  INTENSE_MONOLOGUE_EN: "en-US-ChristopherNeural",
  LOFI_WHISPER_EN: "en-US-JennyNeural",
  NOIR_STUDIO_EN: "en-GB-RyanNeural",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voice = "hi-IN-MadhurNeural",
      rate = "0%",
      pitch = "0Hz",
    } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Valid text input is required" },
        { status: 400 }
      );
    }

    // Hardcap character limit to 600 characters to preserve sub-second response times and prevent abuse
    if (text.length > 600) {
      return NextResponse.json(
        { error: "Text exceeds 600 character limit" },
        { status: 400 }
      );
    }

    // Sanitize rate and pitch
    let formattedRate = "0%";
    if (typeof rate === "number") {
      formattedRate = `${rate >= 0 ? "+" : ""}${rate}%`;
    } else if (typeof rate === "string") {
      formattedRate = rate.includes("%") ? rate : `${rate}%`;
    }

    let formattedPitch = "0Hz";
    if (typeof pitch === "number") {
      formattedPitch = `${pitch >= 0 ? "+" : ""}${pitch}Hz`;
    } else if (typeof pitch === "string") {
      formattedPitch = pitch.includes("Hz") ? pitch : `${pitch}Hz`;
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    // Stream generation into memory buffer
    const streamResult = tts.toStream(text.trim(), {
      rate: formattedRate,
      pitch: formattedPitch,
    });

    const audioStream = (streamResult as any).audioStream || streamResult;

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("[Synthesize API Error]:", error);
    return NextResponse.json(
      {
        error: "Failed to synthesize neural audio stream",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
