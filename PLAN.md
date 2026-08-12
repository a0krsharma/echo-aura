Progress & Next Actions — Decouple Speakers & Listeners

Date: 2026-08-12T22:02:13.839+05:30

Summary of work completed (high-level):
- Implemented HLS listener route and HlsPlayer component.
- Added /api/stream/start and /api/stream/stop with dev-friendly behavior.
- Room client updated: only speakers join Agora; added START/STOP broadcast and HLS flag toggles.
- Inactivity auto-disconnect for listeners.
- P2P wire (1v1 P2P) implemented; now enhanced with optional TURN support (NEXT_PUBLIC_TURN_* env vars).
- Stream endpoints hardened to verify caller is room host when ADMIN_API_KEY is not set.
- .env.example and HLS-RTMP-setup.md updated with TURN and FFmpeg guidance.

Prioritized next steps (recommended order):
1. FFmpeg bridge example + admin UI for hosts to start/stop broadcasts (improves reliability when Cloud Recording not available).
2. Provision and configure TURN servers; wire creds into NEXT_PUBLIC_TURN_*; roll into client fallback.
3. Firestore security: tighten signaling subcollection rules so only participants may read/write.
4. Auto-route listeners to HLS when a room's hlsEnabled flag is set (UX: prompt and optionally force switch).
5. Integration smoke tests: add an end-to-end check covering start->push->hls playback and stop.
6. Add monitoring/observability for broadcast sessions (resourceId, sid, start/stop events).

Work completed since last update:
- Added scripts/headless-bridge.js and documented usage in scripts/FFMPEG-BRIDGE-README.md.
- Implemented notification on wire send; followers now get a stage/room notification when a host creates a room.
- Added migration script scripts/migrate-whispers-to-wire.js (requires Firebase service account) to copy data from 'whispers' -> 'wire'.
- Swept UI strings and code to prefer 'Wire' while preserving 'whispers' backend (lib/wire.ts shim). Fixed TypeScript errors and completed a successful local build.
- Updated moderation and notification code to accept both 'whisper' and 'wire' content types during migration.
- firestore.rules updated with /wire alias rules; must be deployed via Firebase CLI.

Remaining operator actions required for full E2E:
- Provide Agora Cloud Recording credentials (AGORA_CLOUD_RECORDING_APP_ID, AGORA_CLOUD_RECORDING_CERT, AGORA_APP_ID) and RTMP_INGEST_URL so headless bridge can run end-to-end.
- Provide ADMIN_API_KEY or permit host-based /api/stream/start to verify via Firestore host check.
- Provide Firebase service account or Firebase CLI access to deploy firestore.rules and run the migration script in staging.
- (Optional) Provide TURN credentials or allow provisioning coturn and I will wire NEXT_PUBLIC_TURN_*.

Immediate next steps (autonomous):
- If Agora + RTMP creds are provided, run headless bridge end-to-end and validate HLS playback (mark success and collect resourceId/RTMP status). 
- If Firebase access provided, deploy firestore.rules and optionally run migration script in staging.
- Continue UI polish (Room/Stage feature parity) and implement auto-route to HLS when room.hlsEnabled=true.

If you want me to proceed now, provide the credentials securely or indicate which action to run next. I will continue and report back with verification logs and commits.