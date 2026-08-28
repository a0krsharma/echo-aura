'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCosmeticStore } from '../hooks/useCosmeticStore';
import { CosmeticSlot, CosmeticItem } from '../types/cosmetics';

const RARITY_BADGE: Record<string, string> = {
  legendary: 'border-amber-500/70 bg-amber-950/70 text-amber-400',
  rare:      'border-purple-500/70 bg-purple-950/70 text-purple-400',
  common:    'border-neutral-700 bg-neutral-900 text-neutral-400',
};

export default function WardrobePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
  const {
    volts, unlockedIds, equipped, notification,
    catalog, buyItem, toggleEquip, addVolts,
  } = useCosmeticStore();

  const [activeSlot, setActiveSlot] = useState<CosmeticSlot>('skin');
  const filteredItems = catalog.filter(i => i.slot === activeSlot);

  const isEquipped = (item: CosmeticItem) =>
    equipped.skin === item.id || equipped.headwear === item.id || equipped.ears === item.id;

  // Live skin preview swatches
  const activeSkin = catalog.find(i => i.id === equipped.skin);
  const activeHead = catalog.find(i => i.id === equipped.headwear);
  const activeEars = catalog.find(i => i.id === equipped.ears);

  return (
    <div className="min-h-screen bg-black text-neutral-100 font-mono p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-widest text-neutral-200">
            ⚙️ ROBO-ECHO <span className="text-emerald-400">ARMORY</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">// Cosmetics, Skins & Gear // Powered by VOLTS</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-400">⚡ {volts.toLocaleString()}</div>
          <div className="text-[10px] text-neutral-500">AVAILABLE VOLTS</div>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => addVolts(500)}
              className="mt-1 text-[10px] px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-400 hover:text-neutral-200"
            >
              +500 DEV
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Preview Panel */}
        <div className="lg:w-72 bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="text-xs text-neutral-500 text-center">// CURRENT LOADOUT</div>

          {/* Visual Bot Preview */}
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <div
              className="relative w-32 h-36 rounded-2xl border-2 flex flex-col items-center justify-center"
              style={{
                backgroundColor: activeSkin?.skinProps?.bodyColor ?? '#f8fafc',
                borderColor: activeSkin?.skinProps?.emissiveColor ?? '#334155',
                boxShadow: activeSkin?.skinProps?.emissiveColor
                  ? `0 0 24px ${activeSkin?.skinProps?.emissiveColor}66`
                  : undefined,
                outline: activeSkin?.skinProps?.wireframe ? '2px dashed #10b981' : undefined,
              }}
            >
              {/* Visor */}
              <div className="w-24 h-10 bg-black/90 rounded-lg flex items-center justify-center gap-3">
                <div className="w-5 h-3 bg-emerald-400 rounded-sm opacity-90" />
                <div className="w-5 h-3 bg-emerald-400 rounded-sm opacity-90" />
              </div>
              {/* Headwear indicator */}
              {activeHead && (
                <div className="absolute -top-4 text-base">{activeHead?.id === 'head_vr_halo' ? '👑' : activeHead?.id === 'head_cyber_shades' ? '🕶️' : '🎉'}</div>
              )}
              {/* Ears indicator */}
              {activeEars && (
                <div className="absolute text-base" style={{ top: '8px', right: '-20px' }}>
                  {activeEars?.id === 'ears_rgb_headphones' ? '🎧' : activeEars?.id === 'ears_gold_horns' ? '⚡' : '🐱'}
                </div>
              )}
            </div>
            <div className="absolute bottom-2 text-[10px] text-neutral-500">ROBO-ECHO // 01</div>
          </div>

          {/* Equipped pills */}
          <div className="space-y-2">
            {[
              { label: 'SKIN',    item: activeSkin },
              { label: 'HEAD',    item: activeHead },
              { label: 'EARS',    item: activeEars },
            ].map(({ label, item }) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="text-neutral-500">{label}</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  item ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'text-neutral-600'
                }`}>
                  {item ? item.name : 'None'}
                </span>
              </div>
            ))}
          </div>

          <a
            href="/echo-bot"
            className="mt-auto w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded text-center transition"
          >
            🤖 Try on Echo Bot →
          </a>
        </div>

        {/* RIGHT: Item Grid */}
        <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
          {/* Slot Tabs */}
          <div className="flex border-b border-neutral-900 bg-neutral-900/50 text-xs">
            {(['skin', 'headwear', 'ears'] as CosmeticSlot[]).map(slot => (
              <button
                key={slot}
                onClick={() => setActiveSlot(slot)}
                className={`flex-1 py-3 capitalize font-bold transition border-b-2 ${
                  activeSlot === slot
                    ? 'border-emerald-500 text-emerald-400 bg-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {slot === 'skin' ? '🎨 Skin' : slot === 'headwear' ? '🎩 Head' : '👂 Ears'}
              </button>
            ))}
          </div>

          {/* Item Cards */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto max-h-[480px]">
            {filteredItems.map(item => {
              const unlocked  = unlockedIds.includes(item.id);
              const equipped_ = isEquipped(item);
              const canAfford = volts >= item.cost;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition flex flex-col gap-2 ${
                    equipped_
                      ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
                      : unlocked
                      ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-600'
                      : 'bg-neutral-950 border-neutral-900 opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-neutral-200">{item.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${RARITY_BADGE[item.rarity]}`}>
                      {item.rarity}
                    </span>
                  </div>
                  {/* Skin preview swatch */}
                  {item.skinProps && (
                    <div
                      className="w-full h-8 rounded-md border border-neutral-800"
                      style={{
                        backgroundColor: item.skinProps.bodyColor,
                        outline: item.skinProps.wireframe ? '2px dashed #10b981' : undefined,
                        boxShadow: item.skinProps.emissiveColor ? `0 0 10px ${item.skinProps.emissiveColor}88` : undefined,
                      }}
                    />
                  )}
                  <p className="text-[11px] text-neutral-500 flex-1">{item.description}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs font-bold text-emerald-400">
                      {item.cost === 0 ? '🆓 FREE' : `⚡ ${item.cost.toLocaleString()}`}
                    </span>
                    {unlocked ? (
                      <button
                        onClick={() => toggleEquip(item)}
                        className={`px-3 py-1 rounded text-xs font-bold transition ${
                          equipped_
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        {equipped_ ? 'EQUIPPED ✓' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyItem(item)}
                        disabled={!canAfford}
                        className={`px-3 py-1 rounded text-xs font-bold transition ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-black'
                            : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'UNLOCK ⚡' : `Need ${item.cost - volts} more`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-neutral-900 border border-emerald-500/60 rounded-xl text-sm text-emerald-400 shadow-2xl backdrop-blur-sm font-bold animate-fade-in">
          {notification}
        </div>
      )}
    </div>
  );
}
