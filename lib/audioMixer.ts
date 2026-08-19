/**
 * lib/audioMixer.ts
 * ─────────────────────────────────────────────────────────────
 * Zero-Cost Client-Side Web Audio API Multi-Track Mixer.
 * 
 * Mixes synthesized vocal tracks with ambient lo-fi / acoustic loops
 * directly in the user's browser via `OfflineAudioContext`, automatically
 * ducking background stems to 20-25% volume and exporting master 16-bit WAV blobs.
 */

export interface BackgroundTrack {
  id: string;
  label: string;
  description: string;
  url: string;
}

export const BG_PRESETS: BackgroundTrack[] = [
  {
    id: "lofi_chill",
    label: "LO-FI // NOCTURNE BEAT",
    description: "Mellow vinyl lo-fi hip-hop drum groove",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "acoustic_noir",
    label: "ACOUSTIC // NOIR GUITAR LOOP",
    description: "Melancholic acoustic guitar chords for poetry & ghazals",
    url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
  },
  {
    id: "synthwave_ambient",
    label: "SYNTH // AMBIENT TERMINAL DRONE",
    description: "Deep atmospheric cyberpunk synthesizer pads",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
  },
  {
    id: "rain_ambient",
    label: "NATURE // NOCTURNE RAIN & STORM",
    description: "Gentle rain and distant thunder ambience",
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_73138b36a1.mp3",
  },
  {
    id: "none",
    label: "[ NO BACKGROUND // RAW VOCAL ONLY ]",
    description: "Clean acapella neural voice with no backing instrumental",
    url: "",
  },
];

/**
 * Decodes an audio URL or Blob into an AudioBuffer using Web Audio API
 */
async function loadAudioBuffer(
  urlOrBlobUrl: string,
  ctx: AudioContext | OfflineAudioContext
): Promise<AudioBuffer> {
  const response = await fetch(urlOrBlobUrl);
  if (!response.ok) {
    throw new Error(`Failed to load audio stream from ${urlOrBlobUrl}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

/**
 * Mixes vocal speech and background instrumental in the user's browser with zero cloud compute cost.
 *
 * @param vocalBlobUrl - Object URL of the raw vocal speech track
 * @param bgTrackUrl - Static URL of the background instrumental loop
 * @param bgVolume - Ducked background volume ratio (default 0.22 so voice is loud & clear)
 * @returns Master mixed 16-bit PCM WAV Blob
 */
export async function mixVocalWithBackground(
  vocalBlobUrl: string,
  bgTrackUrl: string,
  bgVolume: number = 0.22
): Promise<Blob> {
  // If no background requested, return raw vocal blob directly
  if (!bgTrackUrl) {
    const rawRes = await fetch(vocalBlobUrl);
    return await rawRes.blob();
  }

  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const [vocalBuffer, bgBuffer] = await Promise.all([
      loadAudioBuffer(vocalBlobUrl, tempCtx),
      loadAudioBuffer(bgTrackUrl, tempCtx),
    ]);

    const sampleRate = vocalBuffer.sampleRate;
    const totalLength = vocalBuffer.length;
    const durationSec = vocalBuffer.duration;

    // Hard quota check: 180 seconds max
    if (durationSec > 180) {
      throw new Error(`[ QUOTA EXCEEDED ] Audio duration (${Math.round(durationSec)}s) exceeds the maximum 180-second limit.`);
    }

    // Create an OfflineAudioContext bounded precisely to the vocal track duration
    const offlineCtx = new OfflineAudioContext(2, totalLength, sampleRate);

    // 1. Setup Vocal Source (100% Volume Master)
    const voiceSource = offlineCtx.createBufferSource();
    voiceSource.buffer = vocalBuffer;
    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.value = 1.0;
    voiceSource.connect(voiceGain);
    voiceGain.connect(offlineCtx.destination);

    // 2. Setup Background Loop Source (Looped & Ducked)
    const bgSource = offlineCtx.createBufferSource();
    bgSource.buffer = bgBuffer;
    bgSource.loop = true;
    const bgGain = offlineCtx.createGain();
    bgGain.gain.value = Math.max(0.05, Math.min(0.5, bgVolume)); // Ducked volume
    bgSource.connect(bgGain);
    bgGain.connect(offlineCtx.destination);

    // 3. Render Master Buffer
    voiceSource.start(0);
    bgSource.start(0);
    const renderedBuffer = await offlineCtx.startRendering();

    // 4. Encode to standard 16-bit PCM WAV
    return encodeWAV(renderedBuffer);
  } finally {
    try {
      await tempCtx.close();
    } catch {}
  }
}

/**
 * Encodes an AudioBuffer into a universally playable 16-bit PCM WAV Blob
 */
export function encodeWAV(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF header
  writeString("RIFF");
  setUint32(length - 8);
  writeString("WAVE");

  // fmt chunk
  writeString("fmt ");
  setUint32(16); // format chunk length
  setUint16(1);  // linear PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data chunk
  writeString("data");
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // Interleave and write 16-bit PCM samples
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: "audio/wav" });
}
