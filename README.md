# Echo — Unfiltered Audio

> Pure voice. Zero filters. A monochrome stage for every thought worth saying out loud.

**Echo** is an audio-first social platform where people record and share short voice posts ("Echoes"), respond with audio replies ("Reverbs"), and debate live in real-time 1v1 audio rooms ("The Stage").

---

## Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Framework   | Next.js 16.3 (App Router, TypeScript)   |
| Auth        | Firebase Authentication (Google + Email) |
| Database    | Cloud Firestore (real-time)             |
| Audio CDN   | Cloudinary (auto/upload, f_mp3 transform)|
| Live Audio  | Agora RTC (`agora-rtc-react`)           |
| Styling     | Tailwind CSS v4 + Custom CSS Design System |
| Deployment  | Vercel (Mumbai `bom1` region)            |
| Mobile      | Capacitor (Android APK)                 |

---

## Features

- **The Frequency** — Real-time Firestore audio feed with custom text-based player
- **The Studio** — Record up to 60s voice posts, upload to Cloudinary, post to feed
- **The Stage** — Live 1v1 audio debates powered by Agora RTC with tug-of-war voting
- **Echo Rooms** — Group live audio listening sessions
- **Reverbs** — Voice replies to other echoes
- **The Radar** — Discover trending voices and topics
- **The Terminal** — Settings as a command center (monospace only)
- **Notifications** — PULSE / REVERB / ORBITER / STAGE notifications
- **Search** — Search echoes, voices, and trending topics
- **User Profiles** — Voice bios, aura scores, streak tracking

---

## Design Philosophy — Utilitarian Canvas

- Pure **black** backgrounds, pure **white** text
- **Monospace** (code) + **Serif** (content) typography only
- **1px borders** — no drop shadows, no rounded corners
- No HTML `<audio controls>` — all players are custom-built in text UI
- Every interaction has a bracket notation: `[ ▶ PLAY ]` / `[ ⏸ PAUSE ]` / `[ ✕ ]`

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/echo.git
cd echo
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your own keys:

```bash
cp .env.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

NEXT_PUBLIC_AGORA_APP_ID=
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/echo)

### Manual Deploy

1. Push to GitHub (see below)
2. Connect repo in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add all `.env.local` variables to Vercel → Settings → Environment Variables
4. Add your Vercel URL to Firebase Console → Authentication → Authorized Domains

---

## Firebase Security Rules

Deploy rules from `firestore.rules`:

```bash
# Install Firebase CLI first
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## Project Structure

```
echo/
├── app/
│   ├── components/        # AuthProvider, BottomNav, LeftSidebar, LiveArenaClient
│   ├── [handle]/          # Dynamic user profiles (Firestore-backed)
│   ├── clash/             # The Stage — debate lobby
│   ├── login/             # Firebase Auth UI
│   ├── notifications/     # Activity feed
│   ├── profile/           # Own profile & voice bio
│   ├── radar/             # Discovery feed
│   ├── rooms/             # Live group audio
│   ├── search/            # Global search
│   ├── stage/[clashId]/   # Live 1v1 debate room (Agora RTC)
│   ├── studio/            # Audio recording studio
│   ├── terminal/          # Settings
│   ├── wire/              # DM inbox ("Wire")
│   ├── globals.css        # Design system
│   ├── layout.tsx         # Root layout + metadata
│   └── page.tsx           # The Frequency (home feed)
├── lib/
│   ├── agora.ts           # Agora RTC config
│   ├── clashes.ts         # Firestore stage service
│   ├── cloudinary.ts      # Audio/image upload helpers
│   ├── echoes.ts          # Firestore echoes service
│   ├── firebase.ts        # Lazy Firebase singleton
│   ├── posts.ts           # Firestore posts service
│   ├── stageChat.ts       # Live chat real-time messages
│   └── userDoc.ts         # User profile creation/fetch
├── firestore.rules        # Production security rules
├── firebase.json          # Firebase CLI config
├── vercel.json            # Vercel deployment config
└── next.config.ts         # Next.js + security headers
```

---

## License

MIT — built with voice, code, and zero sleep.
