/**
 * lib/volts.ts
 * ─────────────────────────────────────────────────────────────
 * Volt Token Micro-Economy & Mining Engine
 * - 60s Session Mining
 * - 70/20/10 Reward Split (Creator / Host / Platform Burn)
 * - 1-Click Micro-Tipping
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  increment,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface VoltTransaction {
  id?: string;
  fromUid: string;
  fromHandle: string;
  toUid: string;
  toHandle: string;
  amount: number;
  type: "MINED_REWARD" | "DIRECT_TIP" | "PROTOCOL_BURN";
  roomId?: string;
  trackId?: string;
  createdAt: Timestamp;
}

/**
 * Mines Volts for a 60-second listen cycle in a Neural Radio Room
 * Distribution: 70% to Track Creator, 20% to Room Host, 10% Burned
 */
export async function mineVoltsForSession(params: {
  roomId: string;
  listenerUid: string;
  creatorUid?: string;
  creatorHandle?: string;
  hostUid: string;
  hostHandle: string;
  trackId?: string;
  trackTitle?: string;
}): Promise<{ creatorVolts: number; hostVolts: number; burnedVolts: number }> {
  const db = getFirebaseDb();
  const BASE_CYCLE_VOLTS = 0.1; // 0.1⚡ per 60s cycle

  const creatorShare = params.creatorUid ? Number((BASE_CYCLE_VOLTS * 0.70).toFixed(4)) : 0;
  const hostShare = Number((BASE_CYCLE_VOLTS * (params.creatorUid ? 0.20 : 0.90)).toFixed(4));
  const burnedShare = Number((BASE_CYCLE_VOLTS * 0.10).toFixed(4));

  try {
    // 1. Credit Track Creator (70%)
    if (params.creatorUid && creatorShare > 0) {
      const creatorRef = doc(db, "users", params.creatorUid);
      await updateDoc(creatorRef, {
        voltBalance: increment(creatorShare),
        totalVoltsEarned: increment(creatorShare),
      }).catch(async () => {
        await setDoc(creatorRef, { voltBalance: creatorShare, totalVoltsEarned: creatorShare }, { merge: true });
      });
    }

    // 2. Credit Room Host (20%)
    if (params.hostUid && hostShare > 0) {
      const hostRef = doc(db, "users", params.hostUid);
      await updateDoc(hostRef, {
        voltBalance: increment(hostShare),
        totalVoltsCurated: increment(hostShare),
      }).catch(async () => {
        await setDoc(hostRef, { voltBalance: hostShare, totalVoltsCurated: hostShare }, { merge: true });
      });
    }

    // 3. Log to Global Volt Ledger
    const ledgerRef = collection(db, "volt_ledger");
    await addDoc(ledgerRef, {
      type: "MINED_REWARD",
      roomId: params.roomId,
      listenerUid: params.listenerUid,
      creatorUid: params.creatorUid || null,
      creatorHandle: params.creatorHandle || null,
      hostUid: params.hostUid,
      hostHandle: params.hostHandle,
      trackId: params.trackId || null,
      trackTitle: params.trackTitle || null,
      creatorShare,
      hostShare,
      burnedShare,
      totalMined: BASE_CYCLE_VOLTS,
      createdAt: serverTimestamp(),
    });

    return {
      creatorVolts: creatorShare,
      hostVolts: hostShare,
      burnedVolts: burnedShare,
    };
  } catch (error) {
    console.error("[Volt Mining Error]:", error);
    return { creatorVolts: 0, hostVolts: 0, burnedVolts: 0 };
  }
}

/**
 * 1-Click Direct Tip to Track Creator or Room Host
 */
export async function tipVolts(params: {
  fromUid: string;
  fromHandle: string;
  toUid: string;
  toHandle: string;
  amount: number;
  roomId?: string;
  role: "CREATOR" | "HOST";
}): Promise<boolean> {
  const db = getFirebaseDb();
  if (params.amount <= 0 || params.fromUid === params.toUid) return false;

  try {
    // Check sender balance
    const senderRef = doc(db, "users", params.fromUid);
    const senderSnap = await getDoc(senderRef);
    const currentBalance = (senderSnap.exists() && senderSnap.data()?.voltBalance) || 0;

    if (currentBalance < params.amount) {
      throw new Error(`Insufficient Volts. Your balance: ${currentBalance.toFixed(2)}⚡`);
    }

    // Deduct from sender
    await updateDoc(senderRef, {
      voltBalance: increment(-params.amount),
    });

    // Credit recipient
    const recipientRef = doc(db, "users", params.toUid);
    await updateDoc(recipientRef, {
      voltBalance: increment(params.amount),
      totalTipsReceived: increment(params.amount),
    }).catch(async () => {
      await setDoc(recipientRef, { voltBalance: params.amount, totalTipsReceived: params.amount }, { merge: true });
    });

    // Record Tip Transaction
    await addDoc(collection(db, "volt_ledger"), {
      type: "DIRECT_TIP",
      fromUid: params.fromUid,
      fromHandle: params.fromHandle,
      toUid: params.toUid,
      toHandle: params.toHandle,
      amount: params.amount,
      role: params.role,
      roomId: params.roomId || null,
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error: any) {
    console.error("[Tip Volts Error]:", error);
    throw error;
  }
}

/**
 * Retrieve User Volt Balance
 */
export async function getUserVoltBalance(uid: string): Promise<number> {
  const db = getFirebaseDb();
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return Number(snap.data()?.voltBalance || 0);
    }
    return 0;
  } catch (e) {
    return 0;
  }
}
