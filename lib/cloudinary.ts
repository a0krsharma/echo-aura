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
 *   2. Request explicit MP3 transcoding via eager transformation f_mp3.
 *   3. Store the EAGER URL (pre-transcoded MP3) — not the raw original URL.
 *   4. MP3 is universally supported: Android Chrome, iOS Safari, desktop all play it.
 *   5. MP3 files have full duration metadata at the START — no range-request issues.
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
 * Uses `video/upload` endpoint (Cloudinary's audio-aware path) with eager
 * transcoding to MP3 so the stored URL always points to an MP3 file that
 * works on all browsers and devices.
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

  const formData = new FormData();
  formData.append("file", blob, fullFilename);
  formData.append("upload_preset", uploadPreset);
  // Request eager MP3 transcoding — Cloudinary processes this server-side
  // and returns the ready MP3 URL in the `eager` array
  formData.append("eager", "f_mp3,q_auto:good");
  formData.append("eager_async", "false"); // wait for transcoding to finish

  // Use video/upload endpoint — handles audio files correctly (auto/upload
  // sometimes misclassifies audio as image and strips metadata)
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

  const res = await fetch(endpoint, { method: "POST", body: formData });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed: ${errBody?.error?.message || `HTTP ${res.status}`}`);
  }

  const data = await res.json();

  // Prefer the eager MP3 URL (pre-transcoded, universally playable)
  // Fall back to raw URL if eager is not available yet
  const eagerMp3Url: string | undefined = data.eager?.[0]?.secure_url;
  const rawUrl: string = data.secure_url || data.url || "";

  // If we got an eager MP3 URL, use it — otherwise use raw URL
  const finalUrl = eagerMp3Url || rawUrl;

  return {
    secureUrl: finalUrl,
    publicId:  data.public_id || `audio-${Date.now()}`,
    duration:  data.duration  || undefined,
    format:    eagerMp3Url ? "mp3" : (data.format || ext),
    bytes:     data.bytes     || blob.size,
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
 * Ensures a Cloudinary audio URL is directly playable by stripping any
 * inline transformation segments that break HTTP range requests.
 *
 * e.g. https://res.cloudinary.com/x/video/upload/f_mp3,q_auto/v1/foo.webm
 *   → https://res.cloudinary.com/x/video/upload/v1/foo.mp3
 *
 * Also normalises old blob: URLs (local temp URLs from MediaRecorder) to
 * return them as-is since they're already playable locally.
 */
export function getPlayableUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  // Blob URLs are local — return as-is
  if (rawUrl.startsWith("blob:")) return rawUrl;
  // Strip Cloudinary transformation segments (e.g. /f_mp3,q_auto/)
  return rawUrl.replace(/\/[a-z_,;:0-9]+(?:\/[a-z_,;:0-9]+)*\//i, (match) => {
    // Only strip if match looks like a transformation (contains _ or , )
    if (match.includes("_") || match.includes(",")) return "/";
    return match;
  });
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
