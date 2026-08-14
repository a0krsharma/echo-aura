FFmpeg Bridge (example)

Purpose
-------
A small example bridge to push audio to an RTMP ingest (CDN) using ffmpeg. It accepts either a file input or raw PCM on stdin and forwards it to the RTMP URL.

Requirements
------------
- ffmpeg installed and available on PATH
- Node.js (for the wrapper script)

Usage
-----
- Push an audio file to RTMP:
  node scripts/ffmpeg-bridge.js --rtmp rtmp://live.example.com/live/STREAMKEY --source ./audio.mp3

- Pipe raw PCM (s16le 48kHz stereo) into ffmpeg and push:
  cat audio.pcm | node scripts/ffmpeg-bridge.js --rtmp rtmp://live.example.com/live/STREAMKEY

- Use env var instead of CLI:
  CDN_RTMP_INGEST_URL=rtmp://... node scripts/ffmpeg-bridge.js --source ./audio.mp3

Notes
-----
This bridge is intentionally minimal: it's meant as a reference example, not a production-grade service. For production use implement reconnect logic, health checks, logging, and run as a managed service (systemd, docker-compose, k8s). The recommended pattern is to have a headless subscriber obtain audio from the Agora channel (or Cloud Recording) and pipe the PCM into this ffmpeg bridge.
