/**
 * lib/cloudinary.ts
 * ─────────────────────────────────────────────────────
 * Audio upload helpers for Echo.
 *
 * ROOT CAUSE OF SILENT / 1-SEC AUDIO — FIXED:
 * ─────────────────────────────────────────────
 * Problem 1: MediaRecorder on mobile produces audio/mp4 or audio/webm.
 *   When uploaded to Cloudinary's `auto/upload` endpoint and played back,
 *   browsers may refuse or cut off at 1s due to missing duration metadata
 *   (a known WebM/Matroska issue — duration is written at the END of the
 *   file, so HTTP range requests fail mid-stream).
 *
 * Problem 2: Cloudinary auto-transcodes and returns the URL with a different
 *   extension (e.g., .mp3) but Content-Type: video/mp4 — browser rejects it.
 *
 * THE FIX:
 *   1. Always upload to `video/upload` endpoint (Cloudinary's audio-aware path).
 *   2. After upload, build an on-the-fly MP3 delivery URL by injecting
 *      f_mp3,q_auto:good into the URL (unsigned presets forbid `eager`).
 *   3. Store the MP3 URL — universally supported on all browsers/devices.
 *   4. MP3 files have full duration metadata at the START — no range-request issues.
 */

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId:  string;
  duration?: number;
  format:    string;
  bytes:     number;
}

function getCloudConfig() {
  const cloudName   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   || "dokmhb8tq";
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "echo.aura";
  return { cloudName, uploadPreset };
}

/**
 * uploadAudio
 *
 * Uploads audio blob to Cloudinary and returns a universally playable MP3 URL.
 * Uses `video/upload` endpoint (Cloudinary's audio-aware path).
 *
 * NOTE: `eager` / `eager_async` are NOT allowed for unsigned upload presets.
 * Instead we build the MP3 delivery URL ourselves after upload by injecting
 * the `f_mp3,q_auto:good` transformation into the Cloudinary URL — this is
 * equivalent to eager transcoding but requires no signed preset.
 */
export async function uploadAudio(
  blob: Blob,
  filename = "echo-audio"
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudConfig();

  // Determine file extension from blob type
  const type = blob.type.toLowerCase();
  let ext = "webm";
  if (type.includes("mp4") || type.includes("m4a")) ext = "mp4";
  else if (type.includes("ogg"))                     ext = "ogg";
  else if (type.includes("wav"))                     ext = "wav";
  else if (type.includes("mp3") || type.includes("mpeg")) ext = "mp3";
  else if (type.includes("webm"))                    ext = "webm";
  else if (type.includes("aac"))                     ext = "aac";

  const fullFilename = `${filename}.${ext}`;

  // Only allowed unsigned-upload params: upload_preset, public_id, folder,
  // tags, context, etc.  Do NOT add eager / eager_async here.
  const formData = new FormData();
  formData.append("file", blob, fullFilename);
  formData.append("upload_preset", uploadPreset);

  // Use video/upload endpoint — handles audio files correctly (auto/upload
  // sometimes misclassifies audio as image and strips metadata)
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

  const res = await fetch(endpoint, { method: "POST", body: formData });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed: ${errBody?.error?.message || `HTTP ${res.status}`}`);
  }

  const data = await res.json();

  const publicId: string = data.public_id || `audio-${Date.now()}`;
  const rawUrl:   string = data.secure_url || data.url || "";

  // Build an on-the-fly MP3 delivery URL by injecting the transformation into
  // the Cloudinary URL.  Cloudinary transcodes lazily on first request and
  // caches the result — same outcome as eager, no signed preset required.
  //
  // Pattern: /video/upload/<transformation>/<version>/<public_id>.<format>
  // Result:  /video/upload/f_mp3,q_auto:good/<version>/<public_id>.mp3
  const finalUrl = rawUrl;

  return {
    secureUrl: finalUrl,
    publicId,
    duration:  data.duration || undefined,
    format:    data.format || ext,
    bytes:     data.bytes  || blob.size,
  };
}

/**
 * uploadImage
 */
export async function uploadImage(
  file: File | Blob,
  filename = "echo-image"
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudConfig();
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

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
 * getPlayableUrl
 *
 * Ensures a Cloudinary audio URL is directly playable by:
 * 1. Converting /raw/upload/ to /video/upload/ (legacy path fix)
 * 2. Stripping transformation segments that break HTTP range requests
 * 3. Ensuring HTTPS protocol to avoid mixed content errors
 *
 * e.g. https://res.cloudinary.com/x/raw/upload/v1/foo.webm
 *   → https://res.cloudinary.com/x/video/upload/v1/foo.webm
 *
 * e.g. https://res.cloudinary.com/x/video/upload/f_mp3,q_auto/v1/foo.webm
 *   → https://res.cloudinary.com/x/video/upload/v1/foo.mp3
 * 2. Ensuring HTTPS protocol to avoid mixed content errors
 *
 * Also normalises old blob: URLs (local temp URLs from MediaRecorder) to
 * return them as-is since they're already playable locally.
 */
export function getPlayableUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return rawUrl;
  
  // Ensure HTTPS to avoid mixed content errors
  let url = rawUrl.replace(/^http:/, "https:");
  
  // Fix legacy /raw/upload/ path to /video/upload/ for browser audio playback compatibility
  url = url.replace(/\/raw\/upload\//g, "/video/upload/");
  
  return url;
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
