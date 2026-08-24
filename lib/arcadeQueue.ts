import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createArcadeMatch } from "./arcade";

const ARCADE_QUEUE_COL = "arcadeQueue";

export interface QueueEntry {
  uid: string;
  handle: string;
  avatar: string;
  gameType: string;
  status: "searching" | "matched";
  matchId?: string;
  createdAt: any;
}

export async function findOrJoinQueue(
  uid: string,
  handle: string,
  avatar: string,
  gameType: string,
  onMatchFound: (matchId: string) => void
): Promise<() => void> {
  const db = getFirebaseDb();
  
  // 1. Try to find someone searching for the same game
  const q = query(
    collection(db, ARCADE_QUEUE_COL),
    where("gameType", "==", gameType),
    where("status", "==", "searching"),
    where("uid", "!=", uid),
    limit(1)
  );

  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    // Found someone! Try to claim them via transaction
    const opponentDoc = snapshot.docs[0];
    const opponentData = opponentDoc.data() as QueueEntry;
    
    try {
      const newMatchId = await runTransaction(db, async (tx) => {
        const freshOpponent = await tx.get(opponentDoc.ref);
        if (!freshOpponent.exists() || freshOpponent.data()?.status !== "searching") {
          throw new Error("Opponent already matched or cancelled");
        }

        // Create the match
        const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Update opponent's queue entry
        tx.update(opponentDoc.ref, {
          status: "matched",
          matchId: matchId
        });
        
        return matchId;
      });

      // Transaction succeeded, meaning WE claimed the opponent!
      // Now actually create the ArcadeMatch document
      await createArcadeMatch({
        id: newMatchId,
        gameType: gameType as any,
        title: `${gameType.toUpperCase()} // RANKED ARENA`,
        hostUid: opponentData.uid, // Opponent was waiting, let them host
        hostHandle: opponentData.handle,
        hostAvatar: opponentData.avatar,
        stakes: 25,
        maxPlayers: 2
      });

      // And join it immediately as the second player!
      const { joinArcadeMatch } = await import("./arcade");
      await joinArcadeMatch(newMatchId, {
        uid: uid,
        handle: handle,
        photoUrl: avatar
      } as any);

      // Call callback immediately for ourselves
      onMatchFound(newMatchId);
      return () => {}; // No cleanup needed, we didn't queue ourselves
    } catch (err) {
      console.warn("Failed to claim opponent, falling back to queueing ourselves", err);
      // Fall through to queueing ourselves
    }
  }

  // 2. Queue ourselves
  const myQueueRef = doc(collection(db, ARCADE_QUEUE_COL));
  await setDoc(myQueueRef, {
    uid,
    handle,
    avatar,
    gameType,
    status: "searching",
    createdAt: serverTimestamp()
  });

  // 3. Listen for changes (someone claims us)
  const unsubscribe = onSnapshot(myQueueRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as QueueEntry;
      if (data.status === "matched" && data.matchId) {
        onMatchFound(data.matchId);
        // Clean up our queue doc since we are matched
        deleteDoc(myQueueRef).catch(() => {});
      }
    }
  });

  // Return a cancellation function
  return () => {
    unsubscribe();
    deleteDoc(myQueueRef).catch(() => {});
  };
}
