# Echo Feature Implementation Plan
## Phased Rollout for Remaining Features

### Overview
This plan breaks down the 25+ unimplemented features from the renaming plan into 6 manageable phases, prioritized by user impact and technical complexity.

---

## Phase 1: Core Engagement (High Priority)
**Timeline:** Week 1-2
**Impact:** High - Daily user retention and engagement

### [ STREAK ] - Daily Activity Tracking
**Description:** Track consecutive days of voice interactions like a gaming streak
**Implementation:**
- Firestore: Add `streakCount`, `lastActiveDate` to user document
- Backend: Daily cron job to reset streaks for inactive users
- UI: Streak counter in profile and terminal
- Logic: Increment streak when user posts/pulses within 24h window
**Files to Create/Modify:**
- `lib/streaks.ts` - Streak management functions
- `app/components/StreakBadge.tsx` - UI component
- Update `app/profile/page.tsx` - Display streak
- Update `app/terminal/page.tsx` - Streak settings

### [ SPARK ] - 24h Ephemeral Stories
**Description:** 24-hour ephemeral audio stories
**Implementation:**
- Firestore: Create `sparks` collection with TTL
- UI: Spark creation in studio, spark viewer in feed
- Logic: Auto-delete after 24h, view count tracking
**Files to Create/Modify:**
- `lib/sparks.ts` - Spark CRUD operations
- `app/components/SparkViewer.tsx` - Spark carousel
- `app/components/SparkCreator.tsx` - Recording modal
- Update `app/page.tsx` - Show sparks in feed

### [ TOKENS ] - Credits System
**Description:** Native app currency for monetization
**Implementation:**
- Firestore: Add `tokenBalance` to user document, create `transactions` collection
- Backend: Token earning logic (posts, pulses, streaks)
- UI: Token balance display, token shop
**Files to Create/Modify:**
- `lib/tokens.ts` - Token management
- `app/components/TokenBalance.tsx` - Balance display
- `app/shop/page.tsx` - Token shop
- Update `lib/posts.ts` - Award tokens on engagement

---

## Phase 2: Discovery & Analytics (High Priority)
**Timeline:** Week 3-4
**Impact:** High - User discovery and platform insights

### [ FREQ_MAP ] - Topic Consumption Analytics
**Description:** Visual breakdown of audio topics user consumes
**Implementation:**
- Firestore: Track post categories in user analytics
- UI: Frequency map visualization in profile
- Logic: Aggregate post categories by user
**Files to Create/Modify:**
- `lib/analytics.ts` - Analytics aggregation
- `app/components/FreqMap.tsx` - Visualization component
- Update `app/profile/page.tsx` - Add freq map section

### [ TAGS ] - Domain Badge System
**Description:** Staking identity in specific niches
**Implementation:**
- Firestore: Add `tags` array to user document
- UI: Tag selection in onboarding, tag badges on profile
- Logic: Earn tags through activity in specific categories
**Files to Create/Modify:**
- `lib/tags.ts` - Tag management
- `app/components/TagSelector.tsx` - Tag picker
- `app/components/TagBadge.tsx` - Display component
- Update `app/onboarding/page.tsx` - Tag selection

### [ SIGNAL-OFF ] - Drop-off Analytics
**Description:** Analytics showing where people stopped listening
**Implementation:**
- Firestore: Track listen duration per post
- UI: Analytics dashboard for creators
- Logic: Calculate average drop-off point per post
**Files to Create/Modify:**
- `lib/analytics.ts` - Extend with drop-off tracking
- `app/components/SignalOffChart.tsx` - Visualization
- Update `app/admin/analytics/page.tsx` - Add signal-off metrics

### [ ANALYTICS ] - Audience Dashboard
**Description:** Live audience analytics for creators
**Implementation:**
- Firestore: Aggregate listener data
- UI: Analytics page with charts
- Logic: Real-time listener tracking
**Files to Create/Modify:**
- `lib/analytics.ts` - Core analytics functions
- `app/analytics/page.tsx` - Creator analytics dashboard
- Update `app/admin/analytics/page.tsx` - Admin analytics

---

## Phase 3: Live Room Features (Medium Priority)
**Timeline:** Week 5-6
**Impact:** Medium - Live engagement enhancement

### [ TRANSMIT ] - Broadcast Hours Logging
**Description:** Total broadcast hours logged
**Implementation:**
- Firestore: Track total broadcast time per user
- UI: Transmit counter in profile
- Logic: Accumulate time while user is speaking in rooms
**Files to Create/Modify:**
- `lib/rooms.ts` - Add transmit tracking
- Update `app/room/[roomId]/RoomClient.tsx` - Track speaking time
- Update `app/profile/page.tsx` - Display transmit hours

### [ SPIKE ] - Tipping Frenzy Mode
**Description:** 3-minute fee-free tipping frenzy when chat goes crazy
**Implementation:**
- Firestore: Track chat activity, trigger spike mode
- UI: Spike indicator in rooms, special effects
- Logic: Activate when chat rate exceeds threshold
**Files to Create/Modify:**
- `lib/rooms.ts` - Chat rate monitoring
- `app/components/SpikeIndicator.tsx` - Spike mode UI
- Update `app/room/[roomId]/RoomClient.tsx` - Spike activation

### [ HOST_OVERRIDE ] - Tipper Controls
**Description:** Top tipper controls room sound effects
**Implementation:**
- Firestore: Track top tipper per session
- UI: Override controls for top tipper
- Logic: Grant temporary admin rights to highest tipper
**Files to Create/Modify:**
- `lib/rooms.ts` - Tipper tracking
- `app/components/HostOverridePanel.tsx` - Control panel
- Update `app/room/[roomId]/RoomClient.tsx` - Override logic

### [ SKIP ] - Queue Jumping
**Description:** Jump mic queue with tokens
**Implementation:**
- Firestore: Token deduction, queue repositioning
- UI: Skip button in room queue
- Logic: Move user to front of queue on payment
**Files to Create/Modify:**
- `lib/rooms.ts` - Queue management
- `lib/tokens.ts` - Token deduction
- Update `app/room/[roomId]/RoomClient.tsx` - Skip button

---

## Phase 4: Social Features (Medium Priority)
**Timeline:** Week 7-8
**Impact:** Medium - Social connectivity

### [ PHASE ] - Vibe-Check Percentage
**Description:** Live real-time vibe-check percentage
**Implementation:**
- Firestore: Track mutual engagement metrics
- UI: Phase indicator on profiles
- Logic: Calculate compatibility score based on interactions
**Files to Create/Modify:**
- `lib/phase.ts` - Phase calculation
- `app/components/PhaseIndicator.tsx` - UI component
- Update `app/[handle]/ClientPage.tsx` - Show phase score

### [ BLIND_SYNC ] - Anonymous Matching
**Description:** Anonymous voice matching based on domains
**Implementation:**
- Firestore: Match queue, compatibility scoring
- UI: Blind sync modal, matching animation
- Logic: Match users with similar tags/interests
**Files to Create/Modify:**
- `lib/blindSync.ts` - Matching algorithm
- `app/components/BlindSyncModal.tsx` - Matching UI
- `app/blind-sync/page.tsx` - Dedicated page

### [ STITCH ] - DM to Post Merging
**Description:** Merge private DMs into public post
**Implementation:**
- Firestore: Convert wire message to post
- UI: Stitch button in wire conversations
- Logic: Copy audio/content to posts collection
**Files to Create/Modify:**
- `lib/wire.ts` - Add stitch function
- `app/components/StitchButton.tsx` - Stitch action
- Update `app/wire/page.tsx` - Add stitch option

### [ PROXIMITY ] - BLE/GPS Detection
**Description:** BLE/GPS proximity detection for nearby users
**Implementation:**
- Native: Web Bluetooth API integration
- Firestore: Store user location (optional)
- UI: Proximity radar, nearby users list
- Logic: Match users within physical range
**Files to Create/Modify:**
- `lib/proximity.ts` - Location services
- `app/components/ProximityRadar.tsx` - Nearby users
- Update `app/radar/page.tsx` - Add proximity tab

---

## Phase 5: Premium Features (Medium Priority)
**Timeline:** Week 9-10
**Impact:** Medium - Monetization and customization

### [ GHOST ] - Invisibility Mode
**Description:** Invisibility on Radar and Stages
**Implementation:**
- Firestore: Add `ghostMode` flag to user
- UI: Ghost toggle in terminal
- Logic: Hide from radar, stage lists when active
**Files to Create/Modify:**
- `lib/ghost.ts` - Ghost mode management
- Update `app/terminal/page.tsx` - Ghost toggle
- Update `app/radar/page.tsx` - Filter ghosted users
- Update `app/clash/page.tsx` - Filter ghosted users

### [ ALERT ] - DND Bypass
**Description:** Bypass DND with custom chime
**Implementation:**
- Firestore: Store alert preferences
- UI: Alert settings in terminal
- Logic: Override DND for specific users
**Files to Create/Modify:**
- `lib/alerts.ts` - Alert management
- `app/components/AlertSettings.tsx` - Settings UI
- Update `app/terminal/page.tsx` - Alert configuration

### [ THEMES ] - Color Schemes
**Description:** Monochrome colorways (Green, Amber, OLED, Red)
**Implementation:**
- CSS: Theme variables and classes
- UI: Theme selector in terminal
- Logic: Apply theme via CSS classes
**Files to Create/Modify:**
- `app/globals.css` - Add theme variables
- `app/components/ThemeSelector.tsx` - Theme picker
- Update `app/terminal/page.tsx` - Theme selection

### [ VOICE_FX ] - Voice Masking Filters
**Description:** Real-time voice masking filters
**Implementation:**
- Audio: Web Audio API effects chain
- UI: FX selector in studio/rooms
- Logic: Apply effects to audio stream
**Files to Create/Modify:**
- `lib/audioManager.ts` - Add FX processing
- `app/components/VoiceFxSelector.tsx` - FX picker
- Update `app/studio/page.tsx` - FX options
- Update `app/room/[roomId]/RoomClient.tsx` - FX in rooms

### [ ENTRANCE ] - Custom Room Sounds
**Description:** Custom room entry sound effects
**Implementation:**
- Firestore: Store custom sound URLs
- UI: Sound selector in terminal
- Logic: Play sound on room entry
**Files to Create/Modify:**
- `lib/sounds.ts` - Sound management
- `app/components/EntranceSoundSelector.tsx` - Sound picker
- Update `app/terminal/page.tsx` - Sound selection
- Update `app/room/[roomId]/RoomClient.tsx` - Play entrance sound

### [ VIP_ROOM ] - Token-Gated Rooms
**Description:** Token-gated masterclass rooms
**Implementation:**
- Firestore: Add `tokenCost` to rooms, verify access
- UI: VIP room badge, token cost display
- Logic: Check token balance before entry
**Files to Create/Modify:**
- `lib/rooms.ts` - Add VIP room logic
- `lib/tokens.ts` - Token verification
- Update `app/rooms/page.tsx` - Show VIP rooms
- Update `app/room/[roomId]/RoomClient.tsx` - Access check

---

## Phase 6: Advanced Features (Low Priority)
**Timeline:** Week 11-12
**Impact:** Low - Advanced functionality

### [ VAULT ] - Locked Audio Drops
**Description:** Locked audio drops requiring group pulse count
**Implementation:**
- Firestore: Create `vaults` collection with unlock conditions
- UI: Vault creation, unlock progress
- Logic: Track group pulses, unlock when threshold reached
**Files to Create/Modify:**
- `lib/vaults.ts` - Vault management
- `app/components/VaultCreator.tsx` - Creation UI
- `app/components/VaultUnlocker.tsx` - Unlock UI
- `app/vaults/page.tsx` - Vaults page

### [ DUET ] - Audio Branch-Offs
**Description:** One-tap audio branch-offs
**Implementation:**
- Firestore: Link duet to original post
- UI: Duet button on posts, duet viewer
- Logic: Copy audio, allow overlay recording
**Files to Create/Modify:**
- `lib/duets.ts` - Duet management
- `app/components/DuetButton.tsx` - Duet action
- `app/components/DuetViewer.tsx` - Duet playback
- Update `app/page.tsx` - Add duet option

### [ CLIPS ] - AI Viral Moments
**Description:** AI auto-generated viral moments
**Implementation:**
- AI: Analyze posts for viral potential
- Firestore: Store generated clips
- UI: Clips feed, clip sharing
- Logic: Auto-generate from high-engagement posts
**Files to Create/Modify:**
- `lib/clips.ts` - Clip generation
- `app/components/ClipFeed.tsx` - Clips display
- `app/clips/page.tsx` - Clips page
- Update `lib/posts.ts` - Clip generation trigger

### [ VIBE_READ ] - Mood/Tempo Tracking
**Description:** Real-time mood/tempo tracker
**Implementation:**
- Audio: Analyze audio characteristics
- UI: Vibe indicator on posts
- Logic: Classify as [ HYPE ], [ CHILL ], [ VOLATILE ]
**Files to Create/Modify:**
- `lib/audioManager.ts` - Add vibe analysis
- `app/components/VibeIndicator.tsx` - Vibe display
- Update `app/studio/page.tsx` - Show vibe after recording

### [ INSIGHT ] - DM Telemetry
**Description:** Hidden telemetry in DMs
**Implementation:**
- Firestore: Track DM engagement metrics
- UI: Insight dashboard for wire conversations
- Logic: Track response times, message patterns
**Files to Create/Modify:**
- `lib/insights.ts` - Insight aggregation
- `app/components/InsightDashboard.tsx` - Metrics display
- Update `app/wire/page.tsx` - Add insights button

### [ ALPHA ] - Invite-Only Mode
**Description:** Initial invite-only launch
**Implementation:**
- Firestore: Add `inviteCode` system
- UI: Invite code input, invite generation
- Logic: Validate codes, track invitations
**Files to Create/Modify:**
- `lib/invites.ts` - Invite management
- `app/components/InviteInput.tsx` - Code input
- Update `app/login/page.tsx` - Add invite field
- Update `app/terminal/page.tsx` - Invite generation

---

## Implementation Notes

### Database Schema Changes
- Add new collections: `sparks`, `transactions`, `vaults`, `clips`
- Add new user fields: `streakCount`, `lastActiveDate`, `tokenBalance`, `tags`, `ghostMode`, `transmitHours`
- Add new post fields: `vibe`, `dropOffPoint`, `duetOf`

### API Endpoints Needed
- `/api/streaks` - Streak management
- `/api/tokens` - Token operations
- `/api/sparks` - Spark CRUD
- `/api/analytics` - Analytics data
- `/api/blind-sync` - Matching
- `/api/vaults` - Vault operations
- `/api/duets` - Duet operations
- `/api/clips` - Clip generation
- `/api/invites` - Invite management

### Dependencies
- Web Audio API for [ VOICE_FX ], [ VIBE_READ ]
- Web Bluetooth API for [ PROXIMITY ]
- AI/ML service for [ CLIPS ] (consider OpenAI Whisper or similar)
- Cron job service for streak resets

### Testing Strategy
- Unit tests for all new lib functions
- Integration tests for Firestore operations
- E2E tests for critical user flows
- Load testing for analytics aggregation

### Rollout Plan
1. Deploy Phase 1 features
2. Monitor user engagement metrics
3. Iterate based on feedback
4. Deploy Phase 2 features
5. Continue phased rollout
6. Finalize all features by Week 12

---

## Success Metrics
- Daily Active Users (DAU) increase
- Session duration increase
- Feature adoption rates
- Token economy health
- User retention rates
