"use client";

import React, { useState, useEffect } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import { claimDotsLine, type ArcadeMatch } from "@/lib/arcade";
import { executeDotsAndBoxesBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import { Trophy, Share2, Sparkles, Network, HelpCircle } from "lucide-react";

interface DotsAndBoxesGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
}

export default function DotsAndBoxesGame({ match, currentUid }: DotsAndBoxesGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const ds = match.dotsAndBoxesState;

  // Trigger AI Bot Turn in VS_COMPUTER mode
  useEffect(() => {
    if (!ds || match.status !== "PLAYING" || match.mode !== "VS_COMPUTER") return;
    const botPlayer = Object.values(match.players || {}).find(
      (p) => p.uid === ds.currentTurnUid && p.isBot
    );
    if (botPlayer) {
      executeDotsAndBoxesBotTurn(match);
    }
  }, [match, ds?.currentTurnUid]);
  if (!ds) return <div className="text-white font-mono p-4">Loading Dots and Boxes...</div>;

  const lines: Record<string, string> = JSON.parse(ds.linesStr || "{}");
  const boxes: Record<string, string> = JSON.parse(ds.boxesStr || "{}");
  const isMyTurn = ds.currentTurnUid === currentUid && match.status === "PLAYING";

  const handleLineClick = async (lineKey: string) => {
    if (!isMyTurn || lines[lineKey] || match.status === "FINISHED") return;
    soundSynth.playSnare();

    try {
      const result = await claimDotsLine(match.id, currentUid, lineKey);
      if (result.won) {
        soundSynth.playFanfare();
      } else if (result.extraTurn) {
        soundSynth.playAirhorn();
      }
    } catch (e) {
      soundSynth.playBuzzer();
    }
  };

  const oppPlayer = Object.values(match.players || {}).find((p) => p.uid !== match.hostUid);
  const p1Handle = match.hostHandle;
  const p2Handle = oppPlayer?.handle || "OPPONENT";

  const getLineStyle = (lineKey: string) => {
    const claimer = lines[lineKey];
    if (!claimer) return "bg-neutral-800 hover:bg-neutral-600";
    if (claimer === match.hostUid) {
      return "bg-[#00f2fe] shadow-[0_0_12px_#00f2fe,0_0_20px_#00c6ff]";
    }
    return "bg-[#ff007a] shadow-[0_0_12px_#ff007a,0_0_20px_#f43f5e]";
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black border-2 border-white p-4 font-mono text-white space-y-4 select-none shadow-[0_0_40px_rgba(255,255,255,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-white pb-2.5 text-xs gap-2 flex-wrap sm:flex-nowrap">
        <span className="font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5 truncate">
          <Network className="w-4 h-4 text-[#00f2fe] shrink-0" />
          <span>DOTS & BOXES</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-2.5 py-1 border border-white hover:bg-white hover:text-black font-extrabold text-[10px] uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap rounded"
          >
            <Share2 className="w-3 h-3" />
            <span>INVITE 🎙️</span>
          </button>
          <span
            className={`px-2.5 py-1 border font-extrabold text-[10px] whitespace-nowrap rounded ${
              isMyTurn
                ? currentUid === match.hostUid
                  ? "border-[#00f2fe] bg-[#00f2fe] text-black animate-pulse shadow-[0_0_15px_rgba(0,242,254,0.6)]"
                  : "border-[#ff007a] bg-[#ff007a] text-white animate-pulse shadow-[0_0_15px_rgba(255,0,122,0.6)]"
                : "border-white bg-white text-black"
            }`}
          >
            {isMyTurn ? "● YOUR TURN" : "OPPONENT'S TURN"}
          </span>
        </div>
      </div>

      {/* 2-Color Player Score Tracker */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-2.5 border border-neutral-800 rounded-lg">
        <div className="flex items-center justify-between gap-1 border-r border-neutral-800 pr-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f2fe] shadow-[0_0_8px_#00f2fe] shrink-0" />
            <span className="text-[#00f2fe] font-bold truncate">{p1Handle}:</span>
          </div>
          <span className="text-white font-extrabold shrink-0">{ds.p1Score} BOXES</span>
        </div>

        <div className="flex items-center justify-between gap-1 pl-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff007a] shadow-[0_0_8px_#ff007a] shrink-0" />
            <span className="text-[#ff007a] font-bold truncate">{p2Handle}:</span>
          </div>
          <span className="text-white font-extrabold shrink-0">{ds.p2Score} BOXES</span>
        </div>
      </div>

      {/* 4x4 Dots / 3x3 Boxes Grid */}
      <div className="relative aspect-square max-w-[340px] mx-auto border-4 border-white bg-neutral-950 p-6 flex flex-col justify-between rounded-xl shadow-2xl">
        {Array.from({ length: 4 }).map((_, r) => (
          <React.Fragment key={r}>
            {/* Row of Dots and Horizontal Lines */}
            <div className="flex items-center justify-between">
              {Array.from({ length: 4 }).map((_, c) => {
                const hLineKey = `h_${r}_${c}`;
                const isClaimedH = !!lines[hLineKey];

                return (
                  <React.Fragment key={c}>
                    {/* Dot */}
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_#fff] ring-2 ring-white/30" />

                    {/* Horizontal Line between dots */}
                    {c < 3 && (
                      <button
                        type="button"
                        disabled={!isMyTurn || isClaimedH || match.status === "FINISHED"}
                        onClick={() => handleLineClick(hLineKey)}
                        className={`flex-1 h-3 -my-1 transition-all flex items-center justify-center cursor-pointer rounded-full ${getLineStyle(
                          hLineKey
                        )}`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Row of Vertical Lines and Box Centers */}
            {r < 3 && (
              <div className="flex items-center justify-between flex-1 my-1">
                {Array.from({ length: 4 }).map((_, c) => {
                  const vLineKey = `v_${r}_${c}`;
                  const isClaimedV = !!lines[vLineKey];
                  const boxKey = `b_${r}_${c}`;
                  const claimedBoxUid = boxes[boxKey];
                  const isP1Box = claimedBoxUid === match.hostUid;

                  return (
                    <React.Fragment key={c}>
                      {/* Vertical Line */}
                      <button
                        type="button"
                        disabled={!isMyTurn || isClaimedV || match.status === "FINISHED"}
                        onClick={() => handleLineClick(vLineKey)}
                        className={`w-3 h-full -mx-1 transition-all cursor-pointer rounded-full ${getLineStyle(
                          vLineKey
                        )}`}
                      />

                      {/* Box Center */}
                      {c < 3 && (
                        <div className="flex-1 h-full flex items-center justify-center font-extrabold text-xs">
                          {claimedBoxUid && (
                            <div
                              className={`px-2 py-1 rounded-md flex items-center gap-1 animate-bounce ${
                                isP1Box
                                  ? "bg-[#00f2fe]/20 border border-[#00f2fe] text-[#00f2fe] shadow-[0_0_12px_rgba(0,242,254,0.3)]"
                                  : "bg-[#ff007a]/20 border border-[#ff007a] text-[#ff007a] shadow-[0_0_12px_rgba(255,0,122,0.3)]"
                              }`}
                            >
                              <span>{isP1Box ? "■" : "■"}</span>
                              <span className="text-[10px] uppercase font-black font-mono">
                                {isP1Box ? "P1" : "P2"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Action Log */}
      {ds.lastActionLog && (
        <div className="border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-white flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="truncate uppercase font-bold">{ds.lastActionLog}</span>
        </div>
      )}

      {/* Victory Declaration */}
      {match.status === "FINISHED" && (
        <div className="border-4 border-white bg-black p-5 text-center space-y-2 animate-bounce">
          <Trophy className="w-8 h-8 text-white mx-auto" />
          <h2 className="font-extrabold text-base uppercase tracking-widest text-white">
            🏆 {match.winnerHandle} CAPTURED THE MOST BOXES!
          </h2>
          <p className="text-xs text-neutral-400 uppercase font-bold">
            AWARDED +{match.stakes * 2} AURA POINTS
          </p>
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
