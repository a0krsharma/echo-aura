import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { CURATED_STYLE_VAULT } from "@/lib/cloneStyles";

export async function POST(req: NextRequest) {
  try {
    let text = "";
    let styleId = "vintage_baritone";
    let rate = "0%";
    let pitch = "0Hz";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      text = String(formData.get("text") || "");
      styleId = String(formData.get("styleId") || "vintage_baritone");
      rate = String(formData.get("rate") || "0%");
      pitch = String(formData.get("pitch") || "0Hz");
    } else {
      const json = await req.json();
      text = json.text || "";
      styleId = json.styleId || "vintage_baritone";
      rate = json.rate || "0%";
      pitch = json.pitch || "0Hz";
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Text input is required for voice cloning synthesis" },
        { status: 400 }
      );
    }

    if (text.length > 600) {
      return NextResponse.json(
        { error: "Text exceeds 600 character limit" },
        { status: 400 }
      );
    }

    // Resolve Archetype or Personal Node Mapping
    const styleProfile = CURATED_STYLE_VAULT[styleId] || CURATED_STYLE_VAULT.vintage_baritone;
    const voice = styleProfile.baseVoice;

    // Sanitize rate and pitch
    let formattedRate = rate || styleProfile.defaultRate || "0%";
    if (!formattedRate.includes("%")) formattedRate = `${formattedRate}%`;

    let formattedPitch = pitch || styleProfile.defaultPitch || "0Hz";
    if (!formattedPitch.includes("Hz")) formattedPitch = `${formattedPitch}Hz`;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    // Stream cloned stem into memory buffer
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
        "X-Echo-Clone-Style": styleId,
      },
    });
  } catch (error: any) {
    console.error("[Clone Synthesis Error]:", error);
    return NextResponse.json(
      {
        error: "Failed to synthesize zero-shot clone stream",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
