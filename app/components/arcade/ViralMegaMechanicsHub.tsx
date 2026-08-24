"use client";

import React, { useState, useEffect } from "react";
import {
  Moon,
  Flame,
  Swords,
  Users,
  Lock,
  Unlock,
  Share2,
  Clock,
  Sparkles,
  Zap,
  Radio,
  Skull,
  ShieldAlert,
  Building,
  Target,
  UserPlus,
  Play,
  Check,
} from "lucide-react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  INITIAL_BOUNTIES,
  MYSTERY_CONVERSATION_STARTERS,
  CAMPUS_TURF_STANDINGS,
  DEMO_LOCKED_CAPSULES,
  generateCapsuleWhatsAppInvite,
  type StreakBountyTarget,
  type CampusTurfNode,
  type LockedAudioCapsule,
} from "@/lib/viralMechanics";
import { getMidnightGhostStatus, GHOST_LOUNGES } from "@/lib/midnightGhost";

interface ViralMegaMechanicsHubProps {
  userHandle: string;
  onChallengeBounty?: (target: StreakBountyTarget) => void;
  onJoinGhostLounge?: (lounge: any) => void;
}

export default function ViralMegaMechanicsHub({
  userHandle = "@PLAYER",
  onChallengeBounty,
  onJoinGhostLounge,
}: ViralMegaMechanicsHubProps) {
  const [activeTab, setActiveTab] = useState<
    "GHOST" | "BOUNTIES" | "ROULETTE" | "TURF_WARS" | "CAPSULES"
  >("BOUNTIES");

  // 1. Midnight Ghost State
  const [ghostStatus, setGhostStatus] = useState(getMidnightGhostStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setGhostStatus(getMidnightGhostStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Streak Bounties State
  const [bounties, setBounties] = useState<StreakBountyTarget[]>(INITIAL_BOUNTIES);

  // 3. Mystery Node Roulette State
  const [isRouletteConnecting, setIsRouletteConnecting] = useState<boolean>(false);
  const [isRouletteMatched, setIsRouletteMatched] = useState<boolean>(false);
  const [rouletteTimer, setRouletteTimer] = useState<number>(90);
  const [roulettePrompt, setRoulettePrompt] = useState<string>(MYSTERY_CONVERSATION_STARTERS[0]);
  const [identityRevealed, setIdentityRevealed] = useState<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (isRouletteMatched && rouletteTimer > 0) {
      interval = setInterval(() => setRouletteTimer((t) => t - 1), 1000);
    } else if (rouletteTimer === 0 && isRouletteMatched) {
      soundSynth.playBuzzer();
      setIsRouletteMatched(false);
    }
    return () => clearInterval(interval);
  }, [isRouletteMatched, rouletteTimer]);

  const handleStartRoulette = () => {
    setIsRouletteConnecting(true);
    soundSynth.playSubtlePop();
    setTimeout(() => {
      setIsRouletteConnecting(false);
      setIsRouletteMatched(true);
      setRouletteTimer(90);
      setIdentityRevealed(false);
      setRoulettePrompt(
        MYSTERY_CONVERSATION_STARTERS[
          Math.floor(Math.random() * MYSTERY_CONVERSATION_STARTERS.length)
        ]
      );
      soundSynth.playFanfare();
    }, 2000);
  };

  // 4. Campus Turf Wars State
  const [turfStandings, setTurfStandings] = useState<CampusTurfNode[]>(CAMPUS_TURF_STANDINGS);
  const [selectedCampus, setSelectedCampus] = useState<string>("dtu");

  // 5. Locked Audio Capsules State
  const [capsules, setCapsules] = useState<LockedAudioCapsule[]>(DEMO_LOCKED_CAPSULES);

  const handleShareCapsule = (capsule: LockedAudioCapsule) => {
    soundSynth.playSnare();
    const waUrl = generateCapsuleWhatsAppInvite(capsule);
    window.open(waUrl, "_blank");
  };

  return (
    <div className="bg-black border border-neutral-800 p-4 sm:p-6 rounded-xl font-mono text-white space-y-6 shadow-2xl select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
            <Zap className="w-4 h-4 text-white" />
            <span>// VIRAL COMMUNITY CHALLENGES &amp; BOUNTIES</span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase text-white">
            Ghost Protocol, Streak Bounties, Mystery Roulette & Turf Wars
          </h2>
        </div>

        {/* Live Active Hit Bounty Indicator */}
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded text-xs font-bold text-white">
          <Target className="w-4 h-4 text-white animate-spin" />
          <span>{bounties.length} ACTIVE STREAK BOUNTIES</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {(
          [
            { id: "BOUNTIES", label: "STREAK BOUNTIES & HIT LIST", icon: Target },
            { id: "GHOST", label: "MIDNIGHT GHOST PROTOCOL", icon: Moon },
            { id: "ROULETTE", label: "MYSTERY NODE ROULETTE", icon: Radio },
            { id: "TURF_WARS", label: "CAMPUS & CITY TURF WARS", icon: Building },
            { id: "CAPSULES", label: "LOCKED AUDIO CAPSULES", icon: Lock },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 border rounded font-black uppercase whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "border-white bg-white text-black font-black"
                  : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 1. STREAK BOUNTIES & THE HIT LIST ── */}
      {activeTab === "BOUNTIES" && (
        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-white" />
                <span>SERVER-WIDE STREAK BOUNTIES (HIT LIST)</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Players with 5+ win streaks trigger server bounties. Defeat them to steal VOLTS & King Slayer badges!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {bounties.map((b) => (
              <div
                key={b.id}
                className="bg-black border-2 border-rose-500/80 p-4 rounded-xl space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-rose-950 border border-rose-600 text-rose-300 font-mono text-[9px] font-black uppercase rounded">
                      🔥 {b.winStreak}-WIN STREAK
                    </span>
                    <span className="text-yellow-400 font-black text-xs font-mono">
                      +{b.bountyVolts} VOLTS ⚡
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white">{b.targetHandle}</h4>
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">
                    ARENA: {b.gameType}
                  </div>
                  <div className="text-[9px] text-purple-300 font-bold">
                    REWARD: [ {b.rewardBadge} ]
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundSynth.playFanfare();
                    if (onChallengeBounty) onChallengeBounty(b);
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase rounded-lg transition-all shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>[ ⚔️ CHALLENGE BOUNTY ]</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. THE MIDNIGHT GHOST PROTOCOL ── */}
      {activeTab === "GHOST" && (
        <div className="bg-neutral-950 border-2 border-purple-500 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-purple-900 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-purple-400 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-purple-400" />
                <span>TIME-LOCKED GHOST PROTOCOL (11 PM - 4 AM)</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Lobbies, scores, and audio clips self-destruct and purge at sunrise (6:00 AM).
              </p>
            </div>

            <div className="text-right">
              <div className="text-[9px] text-purple-400 font-bold uppercase">
                {ghostStatus.isUnlocked ? "SUNRISE PURGE IN:" : "OPENS AT 11 PM IN:"}
              </div>
              <div className="text-lg font-black text-white font-mono tracking-widest">
                {ghostStatus.formattedCountdown}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GHOST_LOUNGES.map((l) => (
              <div
                key={l.id}
                className="bg-black border border-purple-800/80 p-4 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{l.icon}</span>
                  <span className="text-purple-400 text-xs font-black">+{l.auraStake} AURA</span>
                </div>
                <h4 className="text-xs font-black uppercase text-white">{l.title}</h4>
                <p className="text-[10px] text-neutral-400">{l.tagline}</p>
                <button
                  type="button"
                  onClick={() => {
                    soundSynth.playSubBoom();
                    if (onJoinGhostLounge) onJoinGhostLounge(l);
                  }}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-lg transition-all mt-2 cursor-pointer"
                >
                  [ 👻 ENTER GHOST TABLE ]
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. MYSTERY NODE ROULETTE (90S BLIND AUDIO DROP-IN) ── */}
      {activeTab === "ROULETTE" && (
        <div className="bg-neutral-950 border-2 border-cyan-400 p-5 rounded-xl space-y-4">
          <div className="space-y-0.5 border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-black uppercase text-cyan-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>MYSTERY NODE ROULETTE (90-SEC BLIND AUDIO DROP-IN)</span>
            </h3>
            <p className="text-[10px] text-neutral-400">
              1-Tap anonymous pairing (`[ NODE_ALPHA ]` vs `[ NODE_BETA ]`). At 10s mark, decide: Sync or Sever!
            </p>
          </div>

          {!isRouletteMatched ? (
            <div className="bg-black border border-neutral-800 p-6 rounded-xl text-center space-y-4">
              <Radio className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
              <p className="text-xs text-neutral-300 max-w-md mx-auto">
                Ready to drop into an anonymous 1v1 voice frequency with a stranger or student on another campus?
              </p>
              <button
                type="button"
                onClick={handleStartRoulette}
                disabled={isRouletteConnecting}
                className="py-3 px-8 bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs uppercase rounded-xl transition-all shadow-xl cursor-pointer active:scale-95"
              >
                {isRouletteConnecting ? "SEARCHING FREQUENCIES..." : "[ 🎙️ DROP INTO MYSTERY NODE ]"}
              </button>
            </div>
          ) : (
            <div className="bg-black border-2 border-cyan-400 p-5 rounded-xl space-y-4 text-center">
              <div className="flex items-center justify-between text-xs font-bold border-b border-neutral-800 pb-2">
                <span className="text-cyan-400">NODE_ALPHA ({userHandle})</span>
                <span className="text-rose-400 font-mono text-lg font-black">{rouletteTimer}S</span>
                <span className="text-purple-400">
                  {identityRevealed ? "@ROHIT_IIT_D" : "NODE_BETA [REDACTED]"}
                </span>
              </div>

              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                <div className="text-[10px] text-amber-400 font-bold uppercase">
                  CONVERSATION PROMPT / DEBATE:
                </div>
                <div className="text-sm font-black text-white italic">"{roulettePrompt}"</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentityRevealed(true);
                    soundSynth.playApplause();
                  }}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  [ 🤝 REVEAL IDENTITY (SYNC) ]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRouletteMatched(false);
                    soundSynth.playBuzzer();
                  }}
                  className="py-3 bg-rose-700 hover:bg-rose-600 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg"
                >
                  [ 🛑 DISCONNECT (SEVER) ]
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. CAMPUS & CITY TURF WARS ── */}
      {activeTab === "TURF_WARS" && (
        <div className="bg-neutral-950 border-2 border-yellow-400 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black uppercase text-yellow-400 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-yellow-400" />
                <span>CAMPUS & CITY TURF WARS (REGIONAL PRIDE)</span>
              </h3>
              <p className="text-[10px] text-neutral-400">
                Every win adds Grid Points to your college/city. Top region every Sunday unlocks custom flairs & soundboards!
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {turfStandings.map((c) => (
              <div
                key={c.id}
                className={`p-3 border rounded-xl flex items-center justify-between flex-wrap gap-2 ${
                  c.rank === 1
                    ? "border-yellow-400 bg-yellow-950/30"
                    : "border-neutral-800 bg-black"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm font-mono text-yellow-400">#{c.rank}</span>
                  <div>
                    <div className="text-xs font-black text-white">{c.name}</div>
                    <div className="text-[9px] text-neutral-400">{c.activePlayers} Active Players</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-white font-mono">{c.gridPoints} PTS</div>
                  <div className="text-[9px] text-yellow-400 font-bold">{c.flair}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. LOCKED AUDIO CAPSULES ── */}
      {activeTab === "CAPSULES" && (
        <div className="bg-neutral-950 border-2 border-emerald-400 p-5 rounded-xl space-y-4">
          <div className="space-y-0.5 border-b border-neutral-800 pb-2">
            <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>LOCKED AUDIO CAPSULES (4-FRIEND GROUP UNLOCK KEYS)</span>
            </h3>
            <p className="text-[10px] text-neutral-400">
              Spicy voice confessions encrypted until all 4 friends are simultaneously online inside the room!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {capsules.map((cap) => (
              <div
                key={cap.id}
                className="bg-black border-2 border-emerald-500/80 p-4 rounded-xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400">{cap.roomName}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono font-bold rounded">
                      {cap.currentOnlineCount}/{cap.requiredOnlineCount} ONLINE
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 italic">"{cap.topic}"</p>
                  <div className="text-[10px] text-neutral-500">
                    Dropped by: {cap.creatorHandle}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleShareCapsule(cap)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>[ 📲 SHARE ON WHATSAPP TO UNLOCK ]</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
