'use client';

import { useState, useEffect, useCallback } from 'react';
import { CosmeticItem, EquippedCosmetics, COSMETIC_CATALOG } from '../types/cosmetics';

const STORAGE_KEYS = {
  volts:    'echo_volts',
  unlocked: 'echo_unlocked_cosmetics',
  equipped: 'echo_equipped_cosmetics',
};

const DEFAULT_EQUIPPED: EquippedCosmetics = { skin: 'skin_default', headwear: null, ears: null };

export function useCosmeticStore() {
  const [volts,       setVolts]       = useState<number>(850);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(['skin_default']);
  const [equipped,    setEquipped]    = useState<EquippedCosmetics>(DEFAULT_EQUIPPED);
  const [notification, setNotification] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const sv = localStorage.getItem(STORAGE_KEYS.volts);
      const su = localStorage.getItem(STORAGE_KEYS.unlocked);
      const se = localStorage.getItem(STORAGE_KEYS.equipped);
      if (sv) setVolts(parseInt(sv, 10));
      if (su) setUnlockedIds(JSON.parse(su));
      if (se) setEquipped(JSON.parse(se));
    } catch {}
  }, []);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  const persist = (v: number, u: string[], e: EquippedCosmetics) => {
    try {
      localStorage.setItem(STORAGE_KEYS.volts,    v.toString());
      localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(u));
      localStorage.setItem(STORAGE_KEYS.equipped, JSON.stringify(e));
    } catch {}
  };

  /** Purchase an item. Returns true on success. */
  const buyItem = useCallback((item: CosmeticItem): boolean => {
    if (volts < item.cost) {
      setNotification(`⚠️ Need ${item.cost - volts} more VOLTS to unlock ${item.name}!`);
      return false;
    }
    const nextVolts    = volts - item.cost;
    const nextUnlocked = [...unlockedIds, item.id];
    setVolts(nextVolts);
    setUnlockedIds(nextUnlocked);
    persist(nextVolts, nextUnlocked, equipped);
    setNotification(`⚡ Unlocked "${item.name}" for ${item.cost} VOLTS!`);
    return true;
  }, [volts, unlockedIds, equipped]);

  /** Toggle equip / unequip an already-unlocked item. */
  const toggleEquip = useCallback((item: CosmeticItem) => {
    setEquipped(prev => {
      let next: EquippedCosmetics;
      if (item.slot === 'skin') {
        next = { ...prev, skin: item.id };
      } else if (item.slot === 'headwear') {
        next = { ...prev, headwear: prev.headwear === item.id ? null : item.id };
      } else {
        next = { ...prev, ears: prev.ears === item.id ? null : item.id };
      }
      persist(volts, unlockedIds, next);
      return next;
    });
    setNotification(
      equipped.skin === item.id || equipped.headwear === item.id || equipped.ears === item.id
        ? `Removed "${item.name}"`
        : `Equipped "${item.name}" ✓`
    );
  }, [volts, unlockedIds, equipped]);

  /** Add volts (for testing or reward systems) */
  const addVolts = useCallback((amount: number) => {
    setVolts(v => {
      const next = v + amount;
      persist(next, unlockedIds, equipped);
      return next;
    });
  }, [unlockedIds, equipped]);

  return {
    volts, unlockedIds, equipped, notification,
    catalog: COSMETIC_CATALOG,
    buyItem, toggleEquip, addVolts,
  };
}
