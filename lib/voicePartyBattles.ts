/**
 * lib/voicePartyBattles.ts
 * ─────────────────────────────────────────────────────────────
 * World-Class Voice Party & Team Duel Catalog.
 * 10 Iconic Desi & Pop-Culture Voice Modes:
 * 1. Tone-Shift Dialogue Battle
 * 2. The Name Pun Matrix ("Band-Riya" Riddles)
 * 3. The Laughing Trap (Mic Gate)
 * 4. Nursery Rhyme x Ghazal Hijack
 * 5. Literal English Song Decoder
 * 6. The Fake Customer Care Call
 * 7. Hum & Whistle Melody Cipher
 * 8. 9 PM News Anchor Interrogation
 * 9. 60-Second Roast Ring (Cypher)
 * 10. One-Breath Hook Challenge (Dum Laga Ke)
 */

export interface VoiceBattleGame {
  id: string;
  title: string;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  voiceDynamic: string;
}

export const VOICE_BATTLE_MODES: VoiceBattleGame[] = [
  {
    id: "tone_shift",
    title: "Tone-Shift Dialogue Battle",
    category: "Desi Acting / Roleplay",
    icon: "🎭",
    tagline: "Iconic dialogues in contradictory emotional styles",
    description: "Deliver classic dialogues under conflicting emotions (e.g., Mogambo while weeping hysterically, Pushpa in polite customer service).",
    voiceDynamic: "Room votes [ OSCAR ACTING 🏆 ] vs [ OVERACTING 50 RS CUT 📉 ]",
  },
  {
    id: "pun_matrix",
    title: "The Name Pun Matrix (Band-Riya)",
    category: "Rapid Buzzer Riddles",
    icon: "🧩",
    tagline: "Rapid dad-joke riddles with microsecond buzzers",
    description: "Host drops the pun setup; first connected node to buzz in gets 5 seconds to deliver the dad-joke punchline on mic.",
    voiceDynamic: "Microsecond buzzer lockout with 5s exclusive mic answer window",
  },
  {
    id: "laughing_trap",
    title: "The Laughing Trap (Mic Gate)",
    category: "Audio Signal Physics",
    icon: "🤫",
    tagline: "Tell jokes while mic gate detects giggles & snorts",
    description: "One joker tells one-liners while Web Audio tracks energy spikes. Chuckling above the noise floor triggers instant elimination!",
    voiceDynamic: "Real-time client-side AnalyserNode chuckle detection",
  },
  {
    id: "nursery_ghazal",
    title: "Nursery Rhyme x Ghazal Hijack",
    category: "Twisted Classical Singing",
    icon: "🎵",
    tagline: "Childhood rhymes sung as emotional Jagjit Singh Ghazals",
    description: "Sing innocent rhymes (Machli Jal Ki Rani, Twinkle Twinkle) with deep, dramatic classical ghazal vibrato over harmonium.",
    voiceDynamic: "Harmonium/Sarangi loop with vocal expression voting",
  },
  {
    id: "english_decoder",
    title: "Literal English Song Decoder",
    category: "Audio Decryption",
    icon: "🔤",
    tagline: "Decode dry English translations into Bollywood hits",
    description: "Hear word-for-word formal English translations of Hindi hits; buzz in and sing the actual Hindi melody to score.",
    voiceDynamic: "Fast lyric translation and on-mic singing verification",
  },
  {
    id: "customer_care",
    title: "Fake Customer Care Call",
    category: "Live Voice Dare",
    icon: "📞",
    tagline: "Deadpan 60s absurd customer complaints on live audio",
    description: "Roleplay an absurd customer care complaint (e.g. 'Gulab Jamun has no Wi-Fi') while keeping a completely straight face.",
    voiceDynamic: "Audience rates deadpan seriousness and improv comedy",
  },
  {
    id: "hum_whistle",
    title: "Hum & Whistle Melody Cipher",
    category: "Casual Voice Guessing",
    icon: "🎶",
    tagline: "Hum or whistle tunes without lyrics; room races to buzz",
    description: "One player hums/whistles a hit tune on mic; listeners hit the buzzer to shout the song title and artist.",
    voiceDynamic: "Buzzer race with +100 VOLTS awarded to both hummer and guesser",
  },
  {
    id: "news_anchor",
    title: "9 PM News Anchor Interrogation",
    category: "Theatrical Roasting",
    icon: "📰",
    tagline: "Dramatic 45s screaming courtroom news debates",
    description: "Violently cross-examine a room member over trivial gossip ('Why did you leave the group on seen at 2:14 PM?!').",
    voiceDynamic: "Gavel soundboard hits and dramatic countdown heartbeat",
  },
  {
    id: "roast_ring",
    title: "60-Second Roast Ring (Cypher)",
    category: "1v1 Arena Battle",
    icon: "🔥",
    tagline: "Two creators, 30s turns over lo-fi background beats",
    description: "Improvise hilarious roasts or rhymes over a live background beat before a room audience vote crowns the winner.",
    voiceDynamic: "Lo-fi synth beat with live applause and diss reaction chips",
  },
  {
    id: "one_breath",
    title: "One-Breath Hook Challenge",
    category: "Vocal Endurance",
    icon: "🫁",
    tagline: "Sing a high-tempo chorus without taking a single breath",
    description: "Continuous singing endurance test; client-side audio tracks breath pauses >300ms to trip the buzzer.",
    voiceDynamic: "Real-time voice continuity DSP with automatic breath gate",
  },
];

// Tone Shift Prompts
export const TONE_SHIFT_PROMPTS = [
  { dialogue: "Mogambo khush hua!", original: "Mogambo (Mr. India)", targetTone: "Sobbing & Crying Hysterically 😭" },
  { dialogue: "Rishtey mein toh hum tumhare baap lagte hain, naam hai Shahenshah!", original: "Shahenshah", targetTone: "Whispering Ghost / ASMR Artist 👻" },
  { dialogue: "Pushpa, Pushparaj... jhukega nahi sala!", original: "Pushpa", targetTone: "Ultra-Polite 5-Star Customer Service 👔" },
  { dialogue: "Don ko pakadna mushkil hi nahi, namumkin hai!", original: "Don", targetTone: "Nervous First-Date Hesitation 🥺" },
  { dialogue: "Kitne aadmi the?! Sambha... bata kitne the!", original: "Gabbar Singh (Sholay)", targetTone: "Grandmother lovingly offering sweets 👵" },
  { dialogue: "Picture abhi baaki hai mere dost!", original: "Om Shanti Om", targetTone: "Sleepy 3 AM Yawning Voice 🥱" },
];

// Dad-Joke Pun Matrix
export const NAME_PUN_PROMPTS = [
  { question: "Riya ko kamre mein band karoge toh kya kahenge?", answer: "Band-Riya (Bandariya! 🐒)" },
  { question: "Kangana ko jail mein band kar diya toh kya banegi?", answer: "Hath-Kadi / Bandi-Kangana! ⛓️" },
  { question: "Agar computer ko bhookh lagegi toh wo kya khayega?", answer: "Micro-Chips & Megabytes! 💾" },
  { question: "Agar Amitabh Bachchan chalte-chalte gir jaye toh kya kahenge?", answer: "Gir-taab Bachchan! 💥" },
  { question: "Kaunsi sabzi hai jo hamesha travel karti rehti hai?", answer: "Bhin-D (Roaming) & Matar-Gasht! 🥦" },
  { question: "Kaunsa state hamesha sleep mode mein rehta hai?", answer: "Maha-rest (Maharashtra)! 😴" },
  { question: "Agar spiderman apna suit dho lega toh kya banega?", answer: "Saaf-derman! 🕷️" },
];

// Nursery Rhyme x Ghazal Hijack
export const NURSERY_GHAZAL_PROMPTS = [
  { rhyme: "Machli jal ki rani hai, jeevan uska paani hai...", style: "Dramatic Arijit Singh / Tum Hi Ho style" },
  { rhyme: "Twinkle twinkle little star, how I wonder what you are...", style: "Slow Melancholy Jagjit Singh Ghazal" },
  { rhyme: "Johny Johny yes papa, eating sugar no papa...", style: "Intense Mehdi Hassan Classical Thumri" },
  { rhyme: "Humpty Dumpty sat on a wall, Humpty Dumpty had a great fall...", style: "Heartbroken Urdu Shayari with Harmonium" },
  { rhyme: "Chanda mama door ke, puye pakaye boor ke...", style: "Soulful Nusrat Fateh Ali Khan Qawwali Hook" },
];

// Literal English Song Decoder
export const ENGLISH_SONG_PROMPTS = [
  { english: "Sometimes in my heart, a thought arrives...", hindi: "Kabhi Kabhie Mere Dil Mein" },
  { english: "Why this murder-mood, murder-mood, murderous rhythm?", hindi: "Why This Kolaveri Di" },
  { english: "In your eyes, there is a strange, wonderful sight...", hindi: "Aankhon Mein Teri Ajab Si" },
  { english: "Give me some sunshine, give me some rain, give me another chance...", hindi: "Give Me Some Sunshine (3 Idiots)" },
  { english: "Heart is a child, it does not understand...", hindi: "Dil Toh Baccha Hai Ji" },
  { english: "O my heart, do not cry, the world is like this...", hindi: "Ae Dil Hai Mushkil" },
];

// Fake Customer Care Scenarios
export const CUSTOMER_CARE_SCENARIOS = [
  "Maine Gulab Jamun order kiya tha, isme Wi-Fi signal nahi aa raha.",
  "Mere samosa ke andar aaloo offline dikha raha hai, OTP chahiye.",
  "Hostel ki chai mein caffeine ka update version install nahi hua.",
  "Mera alarm subah 6 baje baja nahi, usne snoozed resignation letter bhej diya.",
  "Maine pizza mangwaya tha, iska crust binary code mein bol raha hai.",
];

/**
 * Formats a dynamic 1-tap WhatsApp voice battle challenge invite.
 */
export function generateWhatsAppVoicePartyInvite(gameTitle: string, userHandle: string, taunt: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://echo-aura.vercel.app";
  const url = `${origin}/arcade`;

  const message = `🎙️ *${userHandle.toUpperCase()} CHALLENGED YOU TO A VOICE DUEL!*

🎮 *Battle Arena:* ${gameTitle}
🔥 *The Challenge:* "${taunt}"

⚡ *Accept Challenge & Battle on Live Mic:* ${url}

_No app download needed. Open link & tap mic to join._`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
