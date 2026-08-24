/**
 * lib/midnightGhost.ts
 * ─────────────────────────────────────────────────────────────
 * The Midnight Ghost Grid (FOMO Mechanics & Late-Night Mystery).
 * Time-Locked Lounges (11:00 PM – 4:00 AM) that activate exclusively late at night.
 * Self-Destructing State: Ghost lobbies, chats, and scores are purged at sunrise (6:00 AM).
 */

export interface MidnightStatus {
  isUnlocked: boolean;
  activeHoursText: string;
  nextUnlockTimestamp: number;
  purgeTimestamp: number;
  formattedCountdown: string;
}

export interface GhostLoungePreset {
  id: string;
  title: string;
  tagline: string;
  gameType: string;
  icon: string;
  vibe: string;
  auraStake: number;
}

export const GHOST_LOUNGES: GhostLoungePreset[] = [
  {
    id: "ghost_void_00",
    title: "👻 THE MIDNIGHT VOID #00",
    tagline: "Uncensored Late-Night Voice Chat & Free For All",
    gameType: "raja_mantri",
    icon: "💀",
    vibe: "Anonymous Voice Filter ON • Purged at Sunrise",
    auraStake: 500,
  },
  {
    id: "ghost_bluff_tp",
    title: "🌙 2 AM BLUFF SANCTUARY",
    tagline: "High Stakes Blind Teen Patti Showdown",
    gameType: "teen_patti",
    icon: "🔥",
    vibe: "No Limits • Double Aura Multiplier",
    auraStake: 1000,
  },
  {
    id: "ghost_hostel_cricket",
    title: "🏏 HOSTEL 3 AM CRICKET CUP",
    tagline: "1v1 Deathmatch Hand Cricket",
    gameType: "hand_cricket",
    icon: "⚡",
    vibe: "Instant Elimination • Mic Commentary",
    auraStake: 300,
  },
  {
    id: "ghost_speed_ludo",
    title: "🎲 MIDNIGHT SPEED LUDO",
    tagline: "4-Player Rapid Token Blitz",
    gameType: "ludo",
    icon: "👑",
    vibe: "Fast Dice • Live Soundboard Banter",
    auraStake: 400,
  },
];

/**
 * Evaluates whether the Midnight Ghost Grid is currently active (11:00 PM to 4:00 AM).
 */
export function getMidnightGhostStatus(): MidnightStatus {
  const now = new Date();
  const currentHour = now.getHours();

  // Active if hour is >= 23 (11 PM) or < 4 (4 AM)
  const isUnlocked = currentHour >= 23 || currentHour < 4;

  // Next unlock calculation
  const nextUnlock = new Date(now);
  if (currentHour >= 4 && currentHour < 23) {
    nextUnlock.setHours(23, 0, 0, 0);
  } else if (currentHour < 4) {
    nextUnlock.setHours(23, 0, 0, 0);
    nextUnlock.setDate(nextUnlock.getDate() - 1);
  }

  // Sunrise purge calculation (6:00 AM)
  const purgeTime = new Date(now);
  if (currentHour >= 23) {
    purgeTime.setDate(purgeTime.getDate() + 1);
    purgeTime.setHours(6, 0, 0, 0);
  } else {
    purgeTime.setHours(6, 0, 0, 0);
  }

  const diffMs = isUnlocked
    ? purgeTime.getTime() - now.getTime()
    : nextUnlock.getTime() - now.getTime();

  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const formattedCountdown = `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return {
    isUnlocked,
    activeHoursText: "11:00 PM – 4:00 AM",
    nextUnlockTimestamp: nextUnlock.getTime(),
    purgeTimestamp: purgeTime.getTime(),
    formattedCountdown,
  };
}
