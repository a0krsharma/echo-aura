import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function extractSpotifyId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Direct Spotify URI: spotify:track:4cOdK2wGLETKBW3PvgPWqT
  const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]{15,30})/);
  if (uriMatch) return uriMatch[1];

  // 2. Full HTTP(S) URL (including /intl-xx/ and query parameters)
  const urlMatch = trimmed.match(/(?:track\/|track%2F)([a-zA-Z0-9]{15,30})/i);
  if (urlMatch) return urlMatch[1];

  // 3. Raw 22-character alphanumeric Spotify Base62 ID
  if (/^[a-zA-Z0-9]{20,25}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get("id");
  const rawUrl = searchParams.get("url");
  const query = searchParams.get("q");

  const trackId = extractSpotifyId(rawId || "") || extractSpotifyId(rawUrl || "");

  // 1. Resolve specific Spotify track ID / URL
  if (trackId) {
    try {
      // Primary method: fetch Spotify Embed page to extract rich __NEXT_DATA__
      const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
      const embedRes = await fetch(embedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        next: { revalidate: 3600 },
      });

      if (embedRes.ok) {
        const html = await embedRes.text();
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1]);
            const entity = data?.props?.pageProps?.state?.data?.entity;
            if (entity) {
              const title = entity.title || entity.name || "Spotify Track";
              const artistNames = Array.isArray(entity.artists)
                ? entity.artists.map((a: any) => a.name).join(", ")
                : "Spotify Artist";
              const coverArt =
                entity.visualIdentity?.image?.[0]?.url ||
                entity.album?.images?.[0]?.url ||
                `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
              const durationMs = entity.duration || 210000;

              return NextResponse.json({
                success: true,
                track: {
                  id: trackId,
                  title,
                  artist: artistNames,
                  coverArt,
                  uri: entity.uri || `spotify:track:${trackId}`,
                  durationMs,
                  album: entity.album?.name || "Single",
                },
              });
            }
          } catch {}
        }
      }

      // Secondary fallback: Spotify oEmbed endpoint ($0, public, no token required)
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
        { next: { revalidate: 3600 } }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return NextResponse.json({
          success: true,
          track: {
            id: trackId,
            title: oembedData.title || "Spotify Track",
            artist: "Spotify Live Selection",
            coverArt: oembedData.thumbnail_url || "🟢",
            uri: `spotify:track:${trackId}`,
            durationMs: 210000,
            album: "Spotify Live",
          },
        });
      }
    } catch (err) {
      console.error("[Spotify Resolve Error]:", err);
    }

    // If both fail, return clean sanitized default
    return NextResponse.json({
      success: true,
      track: {
        id: trackId,
        title: `Spotify Track (${trackId.slice(0, 6)})`,
        artist: "Spotify Live Selection",
        coverArt: "🟢",
        uri: `spotify:track:${trackId}`,
        durationMs: 210000,
        album: "Spotify Live",
      },
    });
  }

  // 2. Search catalog when user is not authenticated on Spotify
  if (query && query.trim().length > 1) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          query.trim()
        )}&entity=song&limit=10`,
        { next: { revalidate: 600 } }
      );

      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        const results = (itunesData.results || []).map((item: any) => ({
          id: `preview_${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || "Single",
          coverArt: item.artworkUrl100?.replace("100x100bb", "600x600bb") || item.artworkUrl100,
          previewUrl: item.previewUrl,
          durationMs: item.trackTimeMillis || 180000,
          isCatalogSearch: true,
        }));

        return NextResponse.json({ success: true, results });
      }
    } catch (err) {
      console.error("[Spotify Search Fallback Error]:", err);
    }
  }

  return NextResponse.json({
    success: false,
    error: "Missing or invalid Spotify track link/id or search query",
  });
}
