import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { soundSynth } from "@/lib/soundSynthesizer";
import { awardAura } from "@/lib/userDoc";

export type TournamentSize = 4 | 8 | 16;
export type TournamentStatus = "REGISTRATION" | "IN_PROGRESS" | "FINISHED";

export interface TournamentPlayerSlot {
  slotIndex: number;
  uid?: string;
  handle?: string;
  avatar?: string;
  isBot?: boolean;
  registeredAt?: number;
}

export interface TournamentMatchNode {
  id: string;
  round: number; // 1: Round of 16, 2: Quarterfinals, 3: Semifinals, 4: Finals
  matchIndex: number;
  player1: { uid: string; handle: string; avatar?: string } | null;
  player2: { uid: string; handle: string; avatar?: string } | null;
  winnerUid?: string;
  winnerHandle?: string;
  activeMatchId?: string;
  status: "PENDING" | "LIVE" | "COMPLETED";
}

export interface ArcadeTournament {
  id: string;
  title: string;
  gameType: string;
  hostUid: string;
  hostHandle: string;
  hostAvatar?: string;
  size: TournamentSize;
  stakes: number; // Entry fee per player in Aura
  totalPot: number; // Total Aura Prize Pool
  status: TournamentStatus;
  registeredPlayers: { [uid: string]: TournamentPlayerSlot };
  slots: (TournamentPlayerSlot | null)[];
  nodes: TournamentMatchNode[];
  winnerUid?: string;
  winnerHandle?: string;
  createdAt: any;
  updatedAt: any;
}

const TOURNAMENT_COLLECTION = "arcade_tournaments";

/**
 * Generate standard single-elimination bracket nodes
 */
export function generateInitialNodes(size: TournamentSize): TournamentMatchNode[] {
  const nodes: TournamentMatchNode[] = [];

  if (size === 16) {
    // Round of 16 (8 matches)
    for (let i = 0; i < 8; i++) {
      nodes.push({
        id: `r16_${i + 1}`,
        round: 1,
        matchIndex: i + 1,
        player1: null,
        player2: null,
        status: "PENDING",
      });
    }
  }

  if (size >= 8) {
    // Quarterfinals (4 matches)
    for (let i = 0; i < 4; i++) {
      nodes.push({
        id: `qf_${i + 1}`,
        round: 2,
        matchIndex: i + 1,
        player1: null,
        player2: null,
        status: "PENDING",
      });
    }
  }

  // Semifinals (2 matches)
  for (let i = 0; i < 2; i++) {
    nodes.push({
      id: `sf_${i + 1}`,
      round: 3,
      matchIndex: i + 1,
      player1: null,
      player2: null,
      status: "PENDING",
    });
  }

  // Grand Final (1 match)
  nodes.push({
    id: `final_1`,
    round: 4,
    matchIndex: 1,
    player1: null,
    player2: null,
    status: "PENDING",
  });

  return nodes;
}

/**
 * Create a new user-created Campus Tournament
 */
export async function createArcadeTournament(params: {
  title: string;
  gameType: string;
  hostUid: string;
  hostHandle: string;
  hostAvatar?: string;
  size: TournamentSize;
  stakes?: number;
}): Promise<string> {
  const db = getFirebaseDb();
  const tourRef = doc(collection(db, TOURNAMENT_COLLECTION));
  const tournamentId = tourRef.id;

  const size = params.size || 8;
  const stakes = params.stakes || 50;
  const totalPot = stakes * size;

  // Initialize slots
  const slots: (TournamentPlayerSlot | null)[] = Array(size).fill(null);
  // Host claims slot 0
  slots[0] = {
    slotIndex: 0,
    uid: params.hostUid,
    handle: params.hostHandle,
    avatar: params.hostAvatar || "",
    registeredAt: Date.now(),
  };

  const registeredPlayers: { [uid: string]: TournamentPlayerSlot } = {
    [params.hostUid]: slots[0],
  };

  const initialNodes = generateInitialNodes(size);

  // Populate first round match 1 with host
  if (size === 16) {
    initialNodes[0].player1 = {
      uid: params.hostUid,
      handle: params.hostHandle,
      avatar: params.hostAvatar,
    };
  } else if (size === 8) {
    initialNodes[0].player1 = {
      uid: params.hostUid,
      handle: params.hostHandle,
      avatar: params.hostAvatar,
    };
  } else if (size === 4) {
    initialNodes[0].player1 = {
      uid: params.hostUid,
      handle: params.hostHandle,
      avatar: params.hostAvatar,
    };
  }

  const tournamentData: ArcadeTournament = {
    id: tournamentId,
    title: params.title || "CAMPUS NIGHT BATTLES // TOURNAMENT",
    gameType: params.gameType,
    hostUid: params.hostUid,
    hostHandle: params.hostHandle,
    hostAvatar: params.hostAvatar || "",
    size,
    stakes,
    totalPot,
    status: "REGISTRATION",
    registeredPlayers,
    slots,
    nodes: initialNodes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(tourRef, tournamentData);
  return tournamentId;
}

/**
 * Real-time subscription to a tournament
 */
export function subscribeArcadeTournament(
  tournamentId: string,
  callback: (tournament: ArcadeTournament | null) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const tourRef = doc(db, TOURNAMENT_COLLECTION, tournamentId);

  return onSnapshot(
    tourRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() } as ArcadeTournament);
    },
    (err) => {
      console.warn("[Tournament] subscribe error:", err.message);
      callback(null);
    }
  );
}

/**
 * Real-time subscription to active campus tournaments
 */
export function subscribeActiveTournaments(
  callback: (tournaments: ArcadeTournament[]) => void
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TOURNAMENT_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ArcadeTournament[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ArcadeTournament);
      });
      callback(list);
    },
    (err) => {
      console.warn("[Tournament] query fallback:", err.message);
      const fallbackQ = query(collection(db, TOURNAMENT_COLLECTION), limit(20));
      return onSnapshot(fallbackQ, (s) => {
        const list: ArcadeTournament[] = [];
        s.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ArcadeTournament);
        });
        callback(list);
      });
    }
  );
}

/**
 * Claim an open bracket registration slot
 */
export async function joinTournamentSlot(
  tournamentId: string,
  user: { uid: string; handle: string; avatar?: string },
  slotIndex?: number
): Promise<void> {
  const db = getFirebaseDb();
  const tourRef = doc(db, TOURNAMENT_COLLECTION, tournamentId);
  const snap = await getDoc(tourRef);
  if (!snap.exists()) throw new Error("Tournament not found");

  const tournament = snap.data() as ArcadeTournament;
  if (tournament.registeredPlayers[user.uid]) {
    return; // Already registered
  }

  const slots = [...tournament.slots];
  let targetIndex = slotIndex !== undefined ? slotIndex : slots.findIndex((s) => s === null);
  if (targetIndex === -1 || targetIndex >= tournament.size) {
    throw new Error("Tournament bracket is already full!");
  }

  const newSlot: TournamentPlayerSlot = {
    slotIndex: targetIndex,
    uid: user.uid,
    handle: user.handle,
    avatar: user.avatar || "",
    registeredAt: Date.now(),
  };

  slots[targetIndex] = newSlot;
  const registeredPlayers = {
    ...tournament.registeredPlayers,
    [user.uid]: newSlot,
  };

  // Assign to first round nodes
  const nodes = [...tournament.nodes];
  const matchIdx = Math.floor(targetIndex / 2);
  const isPlayer2 = targetIndex % 2 === 1;

  let firstRoundNodes = nodes.filter(
    (n) => n.round === (tournament.size === 16 ? 1 : tournament.size === 8 ? 2 : 3)
  );

  if (firstRoundNodes[matchIdx]) {
    const nodeTarget = nodes.find((n) => n.id === firstRoundNodes[matchIdx].id);
    if (nodeTarget) {
      if (isPlayer2) {
        nodeTarget.player2 = { uid: user.uid, handle: user.handle, avatar: user.avatar };
      } else {
        nodeTarget.player1 = { uid: user.uid, handle: user.handle, avatar: user.avatar };
      }
    }
  }

  // Check if all slots filled to auto-transition status
  const allFilled = slots.every((s) => s !== null);
  const status = allFilled ? "IN_PROGRESS" : tournament.status;

  await updateDoc(tourRef, {
    slots,
    registeredPlayers,
    nodes,
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Host advances match winner to next bracket node
 */
export async function advanceTournamentWinner(
  tournamentId: string,
  nodeId: string,
  winnerUid: string
): Promise<void> {
  const db = getFirebaseDb();
  const tourRef = doc(db, TOURNAMENT_COLLECTION, tournamentId);
  const snap = await getDoc(tourRef);
  if (!snap.exists()) throw new Error("Tournament not found");

  const tournament = snap.data() as ArcadeTournament;
  const nodes = [...tournament.nodes];
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (!currentNode) throw new Error("Node not found");

  const winnerObj =
    currentNode.player1?.uid === winnerUid
      ? currentNode.player1
      : currentNode.player2?.uid === winnerUid
      ? currentNode.player2
      : null;

  if (!winnerObj) throw new Error("Winner is not in this match node");

  currentNode.winnerUid = winnerUid;
  currentNode.winnerHandle = winnerObj.handle;
  currentNode.status = "COMPLETED";

  // If Grand Finals, crown the champion!
  if (currentNode.round === 4 || (tournament.size === 4 && currentNode.id === "final_1")) {
    await updateDoc(tourRef, {
      nodes,
      winnerUid,
      winnerHandle: winnerObj.handle,
      status: "FINISHED",
      updatedAt: serverTimestamp(),
    });

    // Award Championship Aura Prize Pool
    await awardAura(winnerUid, tournament.totalPot);
    soundSynth.playFanfare();
    return;
  }

  // Advance winner to next round node
  const nextRound = currentNode.round + 1;
  const nextMatchIdx = Math.ceil(currentNode.matchIndex / 2);
  const isPlayer2 = currentNode.matchIndex % 2 === 0;

  const nextNode = nodes.find(
    (n) => n.round === nextRound && n.matchIndex === nextMatchIdx
  );

  if (nextNode) {
    if (isPlayer2) {
      nextNode.player2 = winnerObj;
    } else {
      nextNode.player1 = winnerObj;
    }
  }

  await updateDoc(tourRef, {
    nodes,
    updatedAt: serverTimestamp(),
  });
}
