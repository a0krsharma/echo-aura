/**
 * lib/cloudinary.ts
 * ─────────────────────────────────────────────────────
 * Lightweight Cloudinary upload helpers using unsigned
 * upload presets — no server-side signing required.
 */

export interface CloudinaryUploadResult {
  /** Public URL to the uploaded asset */
  secureUrl:  string;
  /** Cloudinary public_id — needed for transformations & deletion */
  publicId:   string;
  /** Duration in seconds for audio/video */
  duration?:  number;
  /** File format reported by Cloudinary */
  format:     string;
  /** File size in bytes */
  bytes:      number;
}

function getCloudConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dokmhb8tq";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "echo.aura";
  return { cloudName, uploadPreset };
}

/**
 * getExtensionFromBlob
 * Helper to determine appropriate file extension for audio Blob
 */
function getExtensionFromBlob(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "mp4";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mp3") || type.includes("mpeg")) return "mp3";
  if (type.includes("webm")) return "webm";
  return "mp3";
}

/**
 * createSilentAudioBlob
 * Fallback to ensure Cloudinary upload NEVER fails with EMPTY FILE
 */
function createSilentAudioBlob(): Blob {
  // Return a valid WAV header 44-byte dummy audio buffer
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = sampleRate * 1; // 1 second
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  /* RIFF identifier */
  view.setUint32(0, 0x52494646, false);
  /* file length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  view.setUint32(8, 0x57415645, false);
  /* format chunk identifier */
  view.setUint32(12, 0x666d7420, false);
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitsPerSample, true);
  /* data chunk identifier */
  view.setUint32(36, 0x64617461, false);
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * uploadAudio
 * Upload a raw audio Blob to Cloudinary.
 * Handles empty blobs gracefully with fallback wav audio.
 */
export async function uploadAudio(
  blob: Blob,
  filename = "echo-audio"
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudConfig();

  // If blob is missing or 0 bytes, fallback to valid silent audio blob
  const validBlob = (!blob || blob.size === 0) ? createSilentAudioBlob() : blob;
  const ext = getExtensionFromBlob(validBlob);
  const fullFilename = `${filename}.${ext}`;

  // Endpoints to try
  const endpoints = [
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const formData = new FormData();
      formData.append("file", validBlob, fullFilename);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        // Return the raw Cloudinary URL — DO NOT rename/change extension.
        // WebM and MP4 play natively in Android WebView & modern browsers.
        // Renaming to .mp3 causes silent audio (browser tries MP3 decode on WebM stream).
        const rawUrl: string = data.secure_url || data.url || "";
        return {
          secureUrl: rawUrl,
          publicId:  data.public_id || `audio-${Date.now()}`,
          duration:  data.duration  || 5,
          format:    data.format    || ext,
          bytes:     data.bytes     || validBlob.size,
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson.error?.message || `HTTP ${res.status}`);
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw new Error(`Cloudinary audio upload failed: ${lastError?.message || "Unknown error"}`);
}

/**
 * uploadImage
 */
export async function uploadImage(
  file: File | Blob,
  filename = "echo-image"
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudConfig();
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append("file", file, typeof file === "object" && "name" in file ? file.name : `${filename}.jpg`);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(endpoint, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary image upload failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    secureUrl: data.secure_url || data.url,
    publicId:  data.public_id,
    format:    data.format,
    bytes:     data.bytes,
  };
}

/**
 * getAudioStreamUrl
 */
export function getAudioStreamUrl(publicId: string): string {
  const { cloudName } = getCloudConfig();
  return `https://res.cloudinary.com/${cloudName}/video/upload/f_auto,q_auto/${publicId}`;
}

/**
 * getImageUrl
 */
export function getImageUrl(
  publicId: string,
  opts: { width?: number; quality?: number } = {}
): string {
  const { cloudName } = getCloudConfig();
  const { width = 400, quality = 80 } = opts;
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},q_${quality},f_auto/${publicId}`;
}
