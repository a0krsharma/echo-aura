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

I will proceed autonomously to implement the highest-impact items from this list (FFmpeg bridge example, TURN support already added client-side, secure Firestore rules guidance, and create admin UI + smoke test next). If any preference, respond with a short note; otherwise I'll continue and report progress.