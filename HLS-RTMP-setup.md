HLS / RTMP Broadcast Split — Quick Setup Guide

Goal: Push Agora speaker audio to a CDN (HLS playback) so listeners use HLS while speakers stay on Agora RTC.

Overview:
1. Create a live input on your CDN (Cloudflare Stream, AWS IVS/CloudFront, etc.) and get an RTMP ingest URL + stream key and an HLS playback URL (m3u8).
2. Configure Agora to push an RTMP stream to that RTMP ingest URL. Two common approaches:
   - Agora Cloud Recording / Live Streaming repackaging (recommended): use Agora's cloud recording service to push RTC audio to an RTMP endpoint (the CDN ingest). This keeps speakers in the RTC channel but streams to CDN for listeners.
   - Server-side bridge: run an ephemeral headless client (or use media server) that subscribes to the RTC channel and republishes to RTMP using FFmpeg.

Cloudflare Stream (example):
- Create a Live Input in Cloudflare Stream UI → you will get an RTMP ingest URL (rtmp://live.cloudflare.com:1935/live) and a stream key.
- Playback (HLS): Cloudflare returns an HLS playback URL (https://iframe.videodelivery.net/<playback-id>/manifest/video.m3u8) — use an audio-only m3u8 or the provided playback URL.

Agora options (high-level):
- Cloud Recording (recommended):
  1. Acquire a recording resource (POST /v1/apps/:appId/cloud_recording/acquire).
  2. Start recording with streaming/rtmp target in the start call, providing the CDN RTMP URL and stream key. See Agora Cloud Recording docs for the exact request JSON fields.
  3. Stop the recording when the stage ends.

- Server bridge (FFmpeg):
  1. Create a headless client (server process) that joins the Agora channel as a subscriber to the speaker tracks.
  2. Pipe received audio into FFmpeg and push to RTMP: ffmpeg -f s16le -ar 48k -ac 2 -i - -c:a aac -b:a 96k -f flv rtmp://<cdn-ingest>/<stream-key>
  3. This is more hands-on but gives maximum control.

Client changes (listeners):
- Replace in-app RTC listener connections with a simple HLS audio player.
  - Web: <audio src="https://stream.yourdomain.com/live.m3u8" controls preload="metadata" />
  - Mobile: use platform native HLS playback.
- Keep only speakers connected to Agora RTC (hosts). Implement server-side logic to promote/demote roles.

Security & env vars:
- Do NOT commit RTMP keys or Agora App Secret into source. Use environment variables or secrets manager.
- Required env vars for automated start/stop endpoints (server):
  - NEXT_PUBLIC_AGORA_APP_ID (Agora App ID)
  - AGORA_APP_CERTIFICATE (Agora App certificate) — used by some server flows
  - AGORA_CLOUD_RECORDING_BASE (e.g. https://api.agora.io/v1/apps)
  - AGORA_CLOUD_RECORDING_CUSTOMER_ID
  - AGORA_CLOUD_RECORDING_CUSTOMER_SECRET
  - CDN_RTMP_INGEST_URL (rtmp://...)
  - CDN_STREAM_KEY
  - ADMIN_API_KEY (shared secret header x-admin-key to protect endpoints)
- Example client env vars (for listeners/front-end):
  - NEXT_PUBLIC_HLS_URL (playback URL for listeners)

Next steps (optional, offer to implement):
- Add server API endpoints to start/stop Agora → RTMP push using Cloud Recording. (This repo includes /api/stream/start and /api/stream/stop handlers — set ADMIN_API_KEY and Agora/CDN env vars to enable automated calls.)
- Add UI controls for hosts to start/stop live broadcast and for listeners to switch to HLS automatically.

TURN & FFmpeg bridge (recommended infra):
- TURN/TURN credentials: provision a TURN server (coturn or managed provider) and set the following env vars in .env.local to improve P2P reliability:
  - NEXT_PUBLIC_STUN_URL (optional override; defaults to Google STUN)
  - NEXT_PUBLIC_TURN_URL (comma-separated TURN URLs)
  - NEXT_PUBLIC_TURN_USERNAME
  - NEXT_PUBLIC_TURN_PASSWORD

- FFmpeg bridge (optional fallback to Agora Cloud Recording): run a small headless process that subscribes to the Agora channel (or reads Cloud Recording output) and pipes raw audio into ffmpeg to push to your CDN. Example ffmpeg command for piping PCM->RTMP:

  # Example: pipe 16-bit PCM audio from stdin to RTMP
  ffmpeg -f s16le -ar 48000 -ac 2 -i - -c:a aac -b:a 96k -ac 2 -ar 48000 -f flv rtmp://<cdn-ingest>/<stream-key>

  A simple Node bridge can spawn an Agora headless client (or receive WebSocket-subcribed audio) and pipe to ffmpeg's stdin. This gives you total control (reconnects, transforms, low-latency tweaks).

Sample usage (when ADMIN_API_KEY is set):

Start streaming (server will attempt acquire+start if Cloud Recording creds are present):

curl -X POST "http://localhost:3000/api/stream/start" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"channel":"room-123","uid":"1001"}'

Stop streaming (use resourceId and sid returned from start):

curl -X POST "http://localhost:3000/api/stream/stop" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"resourceId":"<resourceId>","sid":"<sid>"}'

If you want, I can add the admin UI (start/stop button for hosts), an example Node FFmpeg bridge script, and a smoke test to validate end-to-end flow. Reply with "Add UI and smoke test" or "Add FFmpeg bridge" to continue.