/**
 * lib/spotify.ts
 * ─────────────────────────────────────────────────────────────
 * Spotify OAuth 2.0 PKCE (Proof Key for Code Exchange) Client
 * Handles client-side authorization, token management, track search,
 * and playback coordination for Echo Party Mode ($0 server overhead).
 */

export const STORAGE_KEYS = {
  CLIENT_ID: "echo_custom_spotify_client_id",
  ACCESS_TOKEN: "echo_spotify_access_token",
  REFRESH_TOKEN: "echo_spotify_refresh_token",
  EXPIRES_AT: "echo_spotify_expires_at",
  CODE_VERIFIER: "echo_spotify_code_verifier",
  RETURN_URL: "echo_spotify_return_url",
};

export function getSpotifyClientId(): string {
  if (typeof window !== "undefined") {
    const custom = window.localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
    if (custom && custom.trim().length > 10) return custom.trim();
  }
  const envId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
  // Check if envId is not the old invalid placeholder
  if (envId && envId !== "e2bfb72a6a574a629b35048d0cf48bb8") {
    return envId;
  }
  return "";
}

export function setCustomSpotifyClientId(clientId: string) {
  if (typeof window !== "undefined") {
    if (clientId.trim()) {
      window.localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
    }
  }
}

export function isSpotifyConfigured(): boolean {
  return !!getSpotifyClientId();
}

export function getSpotifyRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/rooms`;
  }
  return "https://echo-aura.vercel.app/rooms";
}

const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
].join(" ");

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
export async function initiateSpotifyLogin(returnUrl?: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") return { success: false, error: "Window unavailable" };

  const clientId = getSpotifyClientId();
  if (!clientId) {
    return { success: false, error: "MISSING_CLIENT_ID" };
  }

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  window.localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  if (returnUrl) {
    window.localStorage.setItem(STORAGE_KEYS.RETURN_URL, returnUrl);
  }

  const redirectUri = getSpotifyRedirectUri();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return { success: true };
}

// ── Step 2: Handle OAuth Callback & Exchange Code ──────────────────────────
export async function handleSpotifyCallback(code: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const clientId = getSpotifyClientId();
  const codeVerifier = window.localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!clientId || !codeVerifier) return false;

  const redirectUri = getSpotifyRedirectUri();

  try {
    const payload = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });

    if (!response.ok) {
      console.error("[Spotify Token Exchange Failed]:", await response.text());
      return false;
    }

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
    // Token expired - attempt refresh if available
    refreshSpotifyToken();
    return null;
  }

  return token;
}

export async function refreshSpotifyToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const clientId = getSpotifyClientId();
  const refreshToken = window.localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!clientId || !refreshToken) return null;

  try {
    const payload = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const expiresAt = Date.now() + data.expires_in * 1000;

    window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    if (data.refresh_token) {
      window.localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    window.localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));

    return data.access_token;
  } catch {
    return null;
  }
}

export function disconnectSpotify(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  window.localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
}

// ── Search Spotify Tracks ──────────────────────────────────────────────────
export async function searchSpotifyTracks(query: string): Promise<any[]> {
  const token = getSpotifyToken();
  if (!token || !query.trim()) return [];

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.tracks?.items || [];
  } catch (error) {
    console.error("[Spotify Search Error]:", error);
    return [];
  }
}

// ── Spotify Web API Playback Controls ──────────────────────────────────────
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
        position_ms: positionMs,
      }),
    });

    return res.status === 204;
  } catch (error) {
    console.error("[Spotify Playback Error]:", error);
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

    return res.status === 204;
  } catch {
    return false;
  }
}

export async function seekSpotifyPlayback(positionMs: number): Promise<boolean> {
  const token = getSpotifyToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return res.status === 204;
  } catch {
    return false;
  }
}
