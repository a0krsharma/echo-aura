/**
 * lib/spotify.ts
 * ─────────────────────────────────────────────────────────────
 * Spotify OAuth 2.0 PKCE (Proof Key for Code Exchange) Client
 * Handles client-side authorization, token management, track search,
 * and playback coordination for Echo Party Mode ($0 server overhead).
 */

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "e2bfb72a6a574a629b35048d0cf48bb8";
const SPOTIFY_REDIRECT_URI = typeof window !== "undefined"
  ? `${window.location.origin}/rooms`
  : "http://localhost:3000/rooms";

const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
].join(" ");

const STORAGE_KEYS = {
  ACCESS_TOKEN: "echo_spotify_access_token",
  REFRESH_TOKEN: "echo_spotify_refresh_token",
  EXPIRES_AT: "echo_spotify_expires_at",
  CODE_VERIFIER: "echo_spotify_code_verifier",
};

// ── PKCE Helper Functions ──────────────────────────────────────────────────
function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// ── Step 1: Redirect User to Spotify Auth Dialog ───────────────────────────
export async function initiateSpotifyLogin(returnUrl?: string): Promise<void> {
  if (typeof window === "undefined") return;

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  window.localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  if (returnUrl) {
    window.localStorage.setItem("echo_spotify_return_url", returnUrl);
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// ── Step 2: Handle OAuth Callback & Exchange Code ──────────────────────────
export async function handleSpotifyCallback(code: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const codeVerifier = window.localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!codeVerifier) return false;

  try {
    const payload = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });

    if (!response.ok) return false;

    const data = await response.json();
    const expiresAt = Date.now() + data.expires_in * 1000;

    window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    if (data.refresh_token) {
      window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    window.localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
    window.localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

    return true;
  } catch (error) {
    console.error("[Spotify Auth Error]:", error);
    return false;
  }
}

// ── Token Management ───────────────────────────────────────────────────────
export function getSpotifyToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAt = window.localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!token || !expiresAt) return null;
  if (Date.now() > Number(expiresAt)) {
    // Token expired
    return null;
  }
  return token;
}

export function disconnectSpotify(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
}

// ── Spotify Web API Operations ─────────────────────────────────────────────
export async function searchSpotifyTracks(query: string): Promise<any[]> {
  const token = getSpotifyToken();
  if (!token || !query.trim()) return [];

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.tracks?.items || [];
  } catch (e) {
    console.error("[Spotify Search Error]:", e);
    return [];
  }
}

export async function playSpotifyTrack(trackUri: string, positionMs = 0): Promise<boolean> {
  const token = getSpotifyToken();
  if (!token) return false;

  try {
    const res = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [trackUri],
        position_ms: Math.max(0, positionMs),
      }),
    });
    return res.ok || res.status === 204;
  } catch (e) {
    console.error("[Spotify Play Error]:", e);
    return false;
  }
}

export async function pauseSpotifyPlayback(): Promise<boolean> {
  const token = getSpotifyToken();
  if (!token) return false;

  try {
    const res = await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 204;
  } catch (e) {
    console.error("[Spotify Pause Error]:", e);
    return false;
  }
}

export async function seekSpotifyPlayback(positionMs: number): Promise<boolean> {
  const token = getSpotifyToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.max(0, positionMs)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.ok || res.status === 204;
  } catch (e) {
    console.error("[Spotify Seek Error]:", e);
    return false;
  }
}
