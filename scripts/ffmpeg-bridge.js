#!/usr/bin/env node
// scripts/ffmpeg-bridge.js
// Lightweight FFmpeg bridge: reads from stdin (PCM s16le) or a file and pushes to RTMP ingest URL.
// Usage:
//   node scripts/ffmpeg-bridge.js --rtmp rtmp://live.example.com/live/STREAMKEY --source file.wav
//   cat audio.pcm | node scripts/ffmpeg-bridge.js --rtmp rtmp://...    (pipe raw s16le 48kHz stereo)

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node scripts/ffmpeg-bridge.js --rtmp <rtmp_url> [--source <file>|stdin]');
  process.exit(2);
}

const argv = require('minimist')(process.argv.slice(2));
const rtmp = argv.rtmp || process.env.CDN_RTMP_INGEST_URL || null;
const source = argv.source || null;

if (!rtmp) {
  console.error('Missing RTMP target. Provide --rtmp or set CDN_RTMP_INGEST_URL');
  usage();
}

// ffmpeg args for common cases: if source is file we let ffmpeg detect; if piping raw PCM, use s16le 48kHz stereo
let ffArgs;
if (source && source !== 'stdin') {
  ffArgs = ['-re', '-i', source, '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '48000', '-f', 'flv', rtmp];
} else {
  // stdin raw PCM
  ffArgs = ['-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '48000', '-f', 'flv', rtmp];
}

console.log('Starting ffmpeg with args:', ffArgs.join(' '));

const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

ff.on('exit', (code, sig) => {
  console.log('ffmpeg exited', code, sig);
  process.exit(code === null ? 1 : code);
});

ff.on('error', (err) => {
  console.error('Failed to start ffmpeg:', err);
  process.exit(1);
});

// If source is a file, nothing to pipe. If stdin, pipe process.stdin to ffmpeg
if (!source || source === 'stdin') {
  process.stdin.pipe(ff.stdin);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, killing ffmpeg');
  ff.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, killing ffmpeg');
  ff.kill('SIGTERM');
});
