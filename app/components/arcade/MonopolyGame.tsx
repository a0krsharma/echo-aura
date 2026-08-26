"use client";

import React, { useState, useEffect, useMemo } from "react";
import { soundSynth } from "@/lib/soundSynthesizer";
import {
  rollMonopolyDice,
  buyMonopolyProperty,
  buildMonopolyHouse,
  mortgageMonopolyProperty,
  payJailFine,
  endMonopolyTurn,
  MONOPOLY_TILES,
  type ArcadeMatch,
  type MonopolyPropertyState,
} from "@/lib/arcade";
import { executeMonopolyBotTurn } from "@/lib/arcadeBots";
import ArcadeInviteModal from "./ArcadeInviteModal";
import ArcadeSocialDeck from "./ArcadeSocialDeck";
import {
  Trophy,
  Share2,
  Sparkles,
  Dices,
  HelpCircle,
  Users,
  Building2,
  Hotel,
  Home,
  DollarSign,
  ShieldAlert,
  Flame,
  Crown,
  RotateCcw,
  BadgeAlert,
  Train,
  Zap,
} from "lucide-react";

interface MonopolyGameProps {
  match: ArcadeMatch;
  currentUid: string;
  isHost: boolean;
  onRematch?: () => void;
}

const COLOR_GROUP_THEMES: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  BROWN: { bg: "bg-amber-900", border: "border-amber-700", badge: "#78350f", text: "text-amber-200" },
  LIGHT_BLUE: { bg: "bg-sky-500", border: "border-sky-400", badge: "#0284c7", text: "text-sky-100" },
  PINK: { bg: "bg-pink-600", border: "border-pink-400", badge: "#db2777", text: "text-pink-100" },
  ORANGE: { bg: "bg-orange-500", border: "border-orange-400", badge: "#ea580c", text: "text-orange-100" },
  RED: { bg: "bg-red-600", border: "border-red-400", badge: "#dc2626", text: "text-red-100" },
  YELLOW: { bg: "bg-yellow-400", border: "border-yellow-300", badge: "#ca8a04", text: "text-yellow-950" },
  GREEN: { bg: "bg-emerald-600", border: "border-emerald-400", badge: "#059669", text: "text-emerald-100" },
  DARK_BLUE: { bg: "bg-blue-700", border: "border-blue-500", badge: "#1d4ed8", text: "text-blue-100" },
  RAILROAD: { bg: "bg-neutral-800", border: "border-neutral-600", badge: "#404040", text: "text-neutral-200" },
  UTILITY: { bg: "bg-zinc-700", border: "border-zinc-500", badge: "#52525b", text: "text-zinc-200" },
  SPECIAL: { bg: "bg-neutral-900", border: "border-neutral-700", badge: "#171717", text: "text-neutral-400" },
};

const PLAYER_TOKENS = ["🎩", "🏎️", "🐕", "🚢", "👢", "🐱"];

export default function MonopolyGame({ match, currentUid, isHost, onRematch }: MonopolyGameProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const ms = match.monopolyState;

  // Bot Automation in VS_COMPUTER or with Bot Players
  useEffect(() => {
    if (!ms || match.status !== "PLAYING") return;
    const currentTurn = ms.currentTurnUid;
    const activePlayer = match.players?.[currentTurn];
    if (activePlayer && (activePlayer.isBot || currentTurn.startsWith("bot_"))) {
      const timer = setTimeout(() => {
        executeMonopolyBotTurn(match, currentTurn).catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [match, ms?.currentTurnUid, ms?.hasRolledThisTurn]);

  if (!ms) {
    return <div className="text-white font-mono p-4">Loading Monopoly Arena...</div>;
  }

  const positions: Record<string, number> = JSON.parse(ms.positionsStr || "{}");
  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const properties: Record<number, MonopolyPropertyState> = JSON.parse(ms.propertiesStr || "{}");
  const inJailTurns: Record<string, number> = JSON.parse(ms.inJailTurnsStr || "{}");
  const bankrupt: Record<string, boolean> = JSON.parse(ms.isBankruptStr || "{}");

  const playerUids = Object.keys(match.players || {});
  const isMyTurn = ms.currentTurnUid === currentUid && match.status !== "FINISHED";
  const myPos = positions[currentUid] ?? 0;
  const myCash = cash[currentUid] ?? 1500;
  const inJail = (inJailTurns[currentUid] || 0) > 0;

  // Selected tile info
  const inspectIndex = selectedTileIndex !== null ? selectedTileIndex : myPos;
  const inspectedTile = MONOPOLY_TILES[inspectIndex] || MONOPOLY_TILES[0];
  const inspectedPropState = properties[inspectIndex];

  // Total houses locked
  const totalHousesBuilt = Object.values(properties).reduce(
    (acc, p) => acc + (p.houses < 5 ? p.houses : 0),
    0
  );
  const totalHotelsBuilt = Object.values(properties).reduce(
    (acc, p) => acc + (p.houses === 5 ? 1 : 0),
    0
  );

  // Compute VaR_0.95 and Expected Hazard Loss
  const myHazard = useMemo(() => {
    let expectedLoss = 0;
    const outcomes: { cost: number; prob: number }[] = [];
    const probs: Record<number, number> = {
      2: 1 / 36, 3: 2 / 36, 4: 3 / 36, 5: 4 / 36, 6: 5 / 36, 7: 6 / 36,
      8: 5 / 36, 9: 4 / 36, 10: 3 / 36, 11: 2 / 36, 12: 1 / 36,
    };

    for (let d = 2; d <= 12; d++) {
      const targetTileIdx = (myPos + d) % 40;
      const tile = MONOPOLY_TILES[targetTileIdx];
      const prob = probs[d] || 1 / 36;
      let cost = 0;

      if (tile.group === "SPECIAL") {
        if (tile.name === "Income Tax") cost = 200;
        else if (tile.name === "Luxury Tax") cost = 100;
      } else {
        const prop = properties[targetTileIdx];
        if (prop && prop.ownerUid && prop.ownerUid !== currentUid && !prop.isMortgaged) {
          if (tile.group === "RAILROAD") {
            const count = Object.entries(properties).filter(
              ([id, p]) => p.ownerUid === prop.ownerUid && MONOPOLY_TILES[Number(id)]?.group === "RAILROAD"
            ).length;
            cost = 25 * Math.pow(2, Math.max(0, count - 1));
          } else if (tile.group === "UTILITY") {
            const count = Object.entries(properties).filter(
              ([id, p]) => p.ownerUid === prop.ownerUid && MONOPOLY_TILES[Number(id)]?.group === "UTILITY"
            ).length;
            cost = count === 2 ? d * 10 : d * 4;
          } else {
            cost = prop.houses > 0 ? (tile.rent[prop.houses] || tile.rent[0]) : tile.rent[0];
          }
        }
      }

      expectedLoss += cost * prob;
      outcomes.push({ cost, prob });
    }

    outcomes.sort((a, b) => b.cost - a.cost);
    let cumProb = 0;
    let var95 = 0;
    for (const o of outcomes) {
      cumProb += o.prob;
      if (cumProb >= 0.05) {
        var95 = o.cost;
        break;
      }
    }
    return { var95: Math.round(var95), expectedLoss: Math.round(expectedLoss) };
  }, [myPos, currentUid, properties]);

  const getPlayerNAV = (uid: string) => {
    let nav = cash[uid] || 0;
    for (const [idStr, prop] of Object.entries(properties)) {
      if (prop.ownerUid === uid) {
        const tile = MONOPOLY_TILES[Number(idStr)];
        if (!tile) continue;
        nav += prop.isMortgaged ? Math.round(tile.price * 0.5) : tile.price;
        if (prop.houses > 0 && tile.houseCost > 0) {
          nav += prop.houses * tile.houseCost;
        }
      }
    }
    return nav;
  };

  const handleRoll = async () => {
    if (!isMyTurn || ms.hasRolledThisTurn || isRolling) return;
    setIsRolling(true);
    soundSynth.playDrumroll(0.4);
    try {
      await rollMonopolyDice(match.id, currentUid);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRolling(false);
    }
  };

  const handleBuy = async (propId: number) => {
    if (!isMyTurn) return;
    soundSynth.playFanfare();
    try {
      await buyMonopolyProperty(match.id, currentUid, propId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuild = async (propId: number) => {
    if (!isMyTurn) return;
    soundSynth.playGong();
    try {
      await buildMonopolyHouse(match.id, currentUid, propId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMortgage = async (propId: number) => {
    if (!isMyTurn) return;
    soundSynth.playSubtlePop();
    try {
      await mortgageMonopolyProperty(match.id, currentUid, propId);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayBail = async () => {
    if (!isMyTurn || !inJail || ms.hasRolledThisTurn) return;
    soundSynth.playBuzzer();
    try {
      await payJailFine(match.id, currentUid);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndTurn = async () => {
    if (!isMyTurn || !ms.hasRolledThisTurn) return;
    soundSynth.playSubtlePop();
    try {
      await endMonopolyTurn(match.id, currentUid);
    } catch (e) {
      console.error(e);
    }
  };

  // 11x11 Grid Coordinate Mapping for the 40 Tiles
  const getGridPosition = (index: number) => {
    if (index >= 0 && index <= 10) {
      return { row: 11, col: 11 - index };
    } else if (index >= 11 && index <= 20) {
      return { row: 11 - (index - 10), col: 1 };
    } else if (index >= 21 && index <= 30) {
      return { row: 1, col: 1 + (index - 20) };
    } else {
      return { row: 1 + (index - 30), col: 11 };
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full p-2 sm:p-4 text-white">
      {/* ── Top Dashboard: Players, NAV & Global Housing Inventory ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {playerUids.map((uid, idx) => {
          const p = match.players[uid];
          const isTurn = ms.currentTurnUid === uid && match.status !== "FINISHED";
          const pCash = cash[uid] ?? 1500;
          const pNAV = getPlayerNAV(uid);
          const pBankrupt = bankrupt[uid];
          const pInJail = (inJailTurns[uid] || 0) > 0;
          const pProps = Object.values(properties).filter((pr) => pr.ownerUid === uid).length;
          const token = PLAYER_TOKENS[idx % PLAYER_TOKENS.length];

          return (
            <div
              key={uid}
              className={`p-3 rounded-xl border transition-all ${
                pBankrupt
                  ? "bg-red-950/40 border-red-900 opacity-60"
                  : isTurn
                  ? "bg-gradient-to-br from-amber-950/80 via-black to-neutral-900 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse"
                  : "bg-neutral-900/80 border-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-base">{token}</span>
                <span className="font-bold text-xs uppercase truncate">
                  {p?.handle || `@PLAYER_${idx + 1}`}
                </span>
                {isTurn && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-black">TURN</span>}
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-black text-emerald-400">${pCash} <span className="text-[10px] text-neutral-500">CASH</span></span>
                <span className="font-bold text-amber-300">${pNAV} <span className="text-[10px] text-neutral-500">NAV</span></span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                {pProps} Deeds
              </div>
              {pInJail && (
                <div className="mt-1 text-[10px] text-red-400 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>IN JAIL ({inJailTurns[uid]}/3)</span>
                </div>
              )}
              {pBankrupt && (
                <div className="mt-1 text-[10px] text-red-500 font-black">BANKRUPT 💥</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Global Supply Inventory Indicator ── */}
      <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span className="text-neutral-400">GLOBAL HOUSES:</span>
          <span className="text-emerald-300 font-black">{totalHousesBuilt} / 32 HOARDED</span>
          {totalHousesBuilt >= 32 && (
            <span className="px-1.5 py-0.5 bg-red-900/80 text-red-300 rounded font-black text-[10px]">
              🔒 32-HOUSE LOCKOUT ACTIVE!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Hotel className="w-4 h-4 text-red-400" />
          <span className="text-neutral-400">HOTELS:</span>
          <span className="text-red-300 font-black">{totalHotelsBuilt} / 12</span>
        </div>
      </div>

      {/* ── Main 40-Tile Board Grid & Control Hub ── */}
      <div className="relative border-4 border-amber-500/60 rounded-3xl bg-neutral-950 p-2 sm:p-4 shadow-2xl overflow-hidden">
        {/* 11x11 Isometric Circuit Grid */}
        <div className="grid grid-cols-11 grid-rows-11 gap-1 aspect-square max-w-[620px] mx-auto w-full">
          {MONOPOLY_TILES.map((tile) => {
            const gridPos = getGridPosition(tile.id);
            const prop = properties[tile.id];
            const isCorner = tile.id === 0 || tile.id === 10 || tile.id === 20 || tile.id === 30;
            const theme = COLOR_GROUP_THEMES[tile.group] || COLOR_GROUP_THEMES.SPECIAL;
            const isSelected = inspectIndex === tile.id;

            // Players on this tile
            const playersHere = playerUids.filter((uid) => (positions[uid] ?? 0) === tile.id);

            return (
              <div
                key={tile.id}
                onClick={() => setSelectedTileIndex(tile.id)}
                style={{ gridRow: gridPos.row, gridColumn: gridPos.col }}
                className={`relative flex flex-col items-center justify-between p-0.5 sm:p-1 rounded-md border text-[9px] sm:text-[10px] cursor-pointer transition-all select-none overflow-hidden ${
                  isSelected
                    ? "ring-2 ring-amber-300 shadow-[0_0_15px_#f59e0b] scale-105 z-20"
                    : "hover:scale-102"
                } ${
                  isCorner
                    ? "bg-neutral-900 border-neutral-700 font-black"
                    : "bg-neutral-950 border-neutral-800"
                }`}
              >
                {/* Colored Header Stripe for Properties */}
                {!isCorner && tile.group !== "SPECIAL" && (
                  <div
                    className="w-full h-1.5 sm:h-2 rounded-t-sm mb-0.5"
                    style={{ backgroundColor: theme.badge }}
                  />
                )}

                {/* Tile Name & Icon */}
                <div className="text-center font-bold truncate w-full leading-tight text-[8px] sm:text-[9px]">
                  {tile.name}
                </div>

                {/* Price or Action Label */}
                {tile.price > 0 && (
                  <div className="text-[8px] text-neutral-400 font-mono">
                    ${tile.price}
                  </div>
                )}

                {/* House/Hotel Badges */}
                {prop && prop.houses > 0 && (
                  <div className="absolute top-0.5 right-0.5 flex items-center">
                    {prop.houses === 5 ? (
                      <span className="text-[10px]">🏨</span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-400">
                        {prop.houses}🏠
                      </span>
                    )}
                  </div>
                )}

                {/* Ownership Dot */}
                {prop && prop.ownerUid && (
                  <div
                    className="w-2 h-2 rounded-full border border-white mt-0.5"
                    style={{
                      backgroundColor:
                        prop.ownerUid === match.hostUid ? "#3b82f6" : "#10b981",
                    }}
                    title={`Owned by ${match.players[prop.ownerUid]?.handle || "Player"}`}
                  />
                )}

                {/* Players Position Tokens */}
                {playersHere.length > 0 && (
                  <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center gap-0.5 flex-wrap z-10 pointer-events-none rounded">
                    {playersHere.map((pUid) => {
                      const pIdx = playerUids.indexOf(pUid);
                      return (
                        <span key={pUid} className="text-xs drop-shadow-md animate-bounce">
                          {PLAYER_TOKENS[pIdx % PLAYER_TOKENS.length]}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Central Hub (Area in center of 11x11 ring) ── */}
          <div
            style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}
            className="flex flex-col items-center justify-between p-3 sm:p-5 bg-gradient-to-b from-neutral-900/90 via-black/95 to-neutral-950/90 rounded-2xl border border-neutral-800 text-center shadow-inner overflow-y-auto"
          >
            {/* Title & Active Turn Banner */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-amber-300">
                  MONOPOLY TYCOON ARENA
                </h2>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                {isMyTurn
                  ? !ms.hasRolledThisTurn
                    ? "YOUR TURN: ROLL 2D6 TO ADVANCE"
                    : "EXECUTE PROPERTY DEALS OR PASS TURN"
                  : `WAITING FOR ${match.players[ms.currentTurnUid]?.handle || "OPPONENT"}...`}
              </p>
            </div>

            {/* Value at Risk (VaR_0.95) Hazard Meter */}
            <div className="flex items-center justify-between w-full max-w-md bg-neutral-950/80 border border-neutral-800 px-3 py-1.5 rounded-lg text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>NEXT-ROLL HAZARD (VaR 95%):</span>
                <span className={`font-black ${myHazard.var95 > 300 ? "text-red-400" : "text-emerald-400"}`}>
                  ${myHazard.var95}
                </span>
              </div>
              <div className="text-neutral-400">
                E[Loss]: <span className="text-amber-300 font-bold">${myHazard.expectedLoss}</span>
              </div>
            </div>

            {/* 3D Dice Display & Roll Button */}
            <div className="flex items-center gap-4 my-2">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br from-white via-amber-50 to-neutral-200 border-2 border-neutral-700 text-black flex items-center justify-center font-black text-xl shadow-lg transition-transform ${
                  isRolling ? "animate-spin scale-110" : ""
                }`}
              >
                {ms.lastDiceRoll ? ms.lastDiceRoll[0] : 1}
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br from-white via-amber-50 to-neutral-200 border-2 border-neutral-700 text-black flex items-center justify-center font-black text-xl shadow-lg transition-transform ${
                  isRolling ? "animate-spin scale-110" : ""
                }`}
              >
                {ms.lastDiceRoll ? ms.lastDiceRoll[1] : 2}
              </div>

              {isMyTurn && !ms.hasRolledThisTurn && (
                <button
                  type="button"
                  disabled={isRolling}
                  onClick={handleRoll}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Dices className="w-4 h-4" />
                  <span>[ 🎲 ROLL 2D6 ]</span>
                </button>
              )}
            </div>

            {/* Inspected Deed Details & Actions */}
            <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-700 rounded-xl p-3 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        COLOR_GROUP_THEMES[inspectedTile.group]?.badge || "#737373",
                    }}
                  />
                  <span className="font-black text-sm uppercase text-white truncate">
                    {inspectedTile.name}
                  </span>
                </div>
                {inspectedTile.price > 0 && (
                  <span className="font-mono font-black text-emerald-400">
                    ${inspectedTile.price}
                  </span>
                )}
              </div>

              {/* Deed Stats or Special Description */}
              {inspectedTile.group !== "SPECIAL" ? (
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-300 font-mono">
                  <div>Base Rent: ${inspectedTile.rent[0]}</div>
                  <div>House Cost: ${inspectedTile.houseCost}</div>
                  <div>1 House: ${inspectedTile.rent[1] || 0}</div>
                  <div>3 Houses: ${inspectedTile.rent[3] || 0}</div>
                  <div>Hotel Rent: ${inspectedTile.rent[5] || 0}</div>
                  <div className="text-amber-300">
                    Owner:{" "}
                    {inspectedPropState?.ownerUid
                      ? match.players[inspectedPropState.ownerUid]?.handle || "Owner"
                      : "Unowned"}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400 font-mono">
                  Special Tile: {inspectedTile.name}. Provides card draws, taxes, or jail state.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* Buy Property */}
                {isMyTurn &&
                  myPos === inspectedTile.id &&
                  inspectedTile.price > 0 &&
                  !inspectedPropState?.ownerUid &&
                  myCash >= inspectedTile.price && (
                    <button
                      type="button"
                      onClick={() => handleBuy(inspectedTile.id)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase rounded-lg shadow cursor-pointer active:scale-95"
                    >
                      [ 🎩 BUY FOR ${inspectedTile.price} ]
                    </button>
                  )}

                {/* Build House */}
                {isMyTurn &&
                  inspectedPropState?.ownerUid === currentUid &&
                  inspectedTile.houseCost > 0 &&
                  inspectedPropState.houses < 5 &&
                  myCash >= inspectedTile.houseCost && (
                    <button
                      type="button"
                      onClick={() => handleBuild(inspectedTile.id)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] uppercase rounded-lg shadow cursor-pointer active:scale-95 flex items-center gap-1"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>BUILD (${inspectedTile.houseCost})</span>
                    </button>
                  )}

                {/* Mortgage / Unmortgage */}
                {isMyTurn &&
                  inspectedPropState?.ownerUid === currentUid &&
                  inspectedPropState.houses === 0 && (
                    <button
                      type="button"
                      onClick={() => handleMortgage(inspectedTile.id)}
                      className="px-3 py-1.5 bg-neutral-800 hover:border-white border border-neutral-600 text-neutral-200 font-bold text-[11px] uppercase rounded-lg cursor-pointer"
                    >
                      {inspectedPropState.isMortgaged
                        ? `UNMORTGAGE ($${Math.round(inspectedTile.price * 0.55)})`
                        : `MORTGAGE (+$${Math.round(inspectedTile.price * 0.5)})`}
                    </button>
                  )}

                {/* Pay Jail Fine */}
                {isMyTurn && inJail && !ms.hasRolledThisTurn && myCash >= 50 && (
                  <button
                    type="button"
                    onClick={handlePayBail}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[11px] uppercase rounded-lg cursor-pointer"
                  >
                    [ 🔓 PAY $50 BAIL ]
                  </button>
                )}

                {/* Pass / End Turn */}
                {isMyTurn && ms.hasRolledThisTurn && (
                  <button
                    type="button"
                    onClick={handleEndTurn}
                    className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black font-black text-[11px] uppercase rounded-lg shadow cursor-pointer ml-auto active:scale-95"
                  >
                    [ PASS TURN ➔ ]
                  </button>
                )}
              </div>
            </div>

            {/* Action Log Message */}
            {ms.lastActionLog && (
              <div className="text-[11px] text-amber-200 font-mono bg-neutral-900/60 border border-neutral-800 px-3 py-1 rounded-lg w-full truncate">
                📢 {ms.lastActionLog}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Victory Celebration Overlay ── */}
      {match.status === "FINISHED" && (
        <div className="border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 via-black to-black p-6 rounded-2xl text-center space-y-3 shadow-[0_0_60px_rgba(245,158,11,0.6)] animate-in fade-in zoom-in-95">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce drop-shadow-[0_0_20px_#f59e0b]" />
          <h2 className="text-xl font-black text-amber-300 uppercase tracking-widest">
            🏆 MONOPOLY TYCOON CHAMPION!
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            {match.winnerUid === currentUid
              ? `VICTORY! You bankrupted the competition and claimed the board +${match.stakes * 2} Aura!`
              : `Match concluded! Winner: ${match.winnerHandle || "@PLAYER"}`}
          </p>
          {onRematch && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRematch}
                className="px-6 py-2.5 border-2 border-amber-400 bg-amber-400 text-black hover:bg-amber-300 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 mx-auto rounded-xl shadow-lg active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>[ 🔄 PLAY REMATCH ]</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom-Right [ ❓ RULES ] Button for In-Game Help */}

      <ArcadeInviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} match={match} />
      <ArcadeSocialDeck match={match} currentUid={currentUid} />
    </div>
  );
}
