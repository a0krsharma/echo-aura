#!/usr/bin/env node
/**
 * headless-bridge.js
 * Orchestrates starting the server-side stream (calls /api/stream/start) and
 * launching the ffmpeg bridge to push audio to an RTMP ingest URL (CDN).
 *
 * Usage: ROOM_ID=<roomId> RTMP_INGEST_URL=<rtmp://...> LOCAL_API_URL=http://localhost:3000 ADMIN_API_KEY=<key> node scripts/headless-bridge.js
 *
 * Notes:
 * - If the app server is configured with Agora cloud recording creds, calling
 *   /api/stream/start will instruct Agora to start pushing to the RTMP target.
 * - This script then starts the local ffmpeg bridge to source audio (if needed)
 *   and push to the RTMP ingest. The ffmpeg bridge supports pulling from an
 *   input stream (e.g., an Agora headless subscriber or a local file).
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');

const ROOM_ID = process.env.ROOM_ID;
const RTMP_INGEST_URL = process.env.RTMP_INGEST_URL;
const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const FFMPEG_BRIDGE_SCRIPT = 'scripts/ffmpeg-bridge.js';

if (!ROOM_ID || !RTMP_INGEST_URL) {
  console.error('\nERROR: ROOM_ID and RTMP_INGEST_URL environment variables are required.');
  console.error('Example: ROOM_ID=myroom RTMP_INGEST_URL=rtmp://live.cloudflare.com/live/abcd node scripts/headless-bridge.js\n');
  process.exit(1);
}

(async function main() {
  try {
    console.log('[headless-bridge] Calling app server to prepare/start stream...');
    const url = `${LOCAL_API_URL.replace(/\/$/, '')}/api/stream/start`;
    const payload = { roomId: ROOM_ID, rtmpUrl: RTMP_INGEST_URL };

    const headers = { 'Content-Type': 'application/json' };
    if (ADMIN_API_KEY) headers['x-admin-key'] = ADMIN_API_KEY;

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const body = await res.text();
    if (!res.ok) {
      console.error('[headless-bridge] server returned error:', res.status, body);
      process.exit(2);
    }

    let json;
    try { json = JSON.parse(body); } catch (e) { json = { raw: body }; }
    console.log('[headless-bridge] server response:', json);

    // Start ffmpeg bridge to push to RTMP ingest. The ffmpeg-bridge script accepts
    // an --output argument for the RTMP target. It can be configured to pull from
    // an input source (e.g., a local file, an RTMP source, or stdin).
    const ffArgs = ['--output', RTMP_INGEST_URL];
    if (process.env.FFMPEG_INPUT) {
      ffArgs.unshift('--input', process.env.FFMPEG_INPUT);
    }

    console.log('[headless-bridge] launching ffmpeg bridge with args:', ffArgs.join(' '));

    const node = process.execPath || 'node';
    const bridge = spawn(node, [FFMPEG_BRIDGE_SCRIPT, ...ffArgs], { stdio: 'inherit' });

    const cleanUp = async () => {
      console.log('[headless-bridge] shutting down...');
      bridge.kill('SIGINT');
      // Optionally call /api/stream/stop to stop cloud recording if server supports it
      try {
        const stopUrl = `${LOCAL_API_URL.replace(/\/$/, '')}/api/stream/stop`;
        const stopRes = await fetch(stopUrl, { method: 'POST', headers, body: JSON.stringify({ roomId: ROOM_ID }) });
        console.log('[headless-bridge] called /api/stream/stop, status', stopRes.status);
      } catch (e) {
        console.error('[headless-bridge] failed to call /api/stream/stop:', e.message);
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanUp);
    process.on('SIGTERM', cleanUp);

    bridge.on('exit', (code, signal) => {
      console.log(`[headless-bridge] ffmpeg bridge exited with code=${code} signal=${signal}`);
      process.exit(code || 0);
    });

  } catch (err) {
    console.error('[headless-bridge] unexpected error:', err);
    process.exit(3);
  }
})();
