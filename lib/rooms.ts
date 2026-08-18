/**
 * lib/rooms.ts
 * ─────────────────────────────────────────────────────
 * Room Management System for Echo Stage
 * Handles room creation, joining, listing, and real-time updates
 */

import {
  collection,
  addDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";

export interface Room {
  id: string;
  name: string;
  description: string;
  hostUid: string;
  hostHandle: string;
  participantCount: number;
  speakerCount: number;
  maxParticipants: number;
  isPublic: boolean;
  category: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp | null;
  isActive: boolean;
  agoraChannel: string;
  scheduledFor: Timestamp | null;
  openMic: boolean;
  // [ TRANSMIT ] - Live broadcasting metadata
  transmitEnabled?: boolean;
  transmitUrl?: string;
}

export interface RoomParticipant {
  id?: string; // Document ID for unique React keys
  uid: string;
  handle: string;
  joinedAt: Timestamp;
  isSpeaker: boolean;
  raisedHand?: boolean;
  raisedHandAt?: Timestamp;
  isMuted?: boolean;
  isModerator?: boolean;
  isBanned?: boolean;
  bannedAt?: Timestamp;
  bannedBy?: string;
  bannedReason?: string;
  breakoutRoomId?: string; // ID of breakout room if assigned
}

export interface BreakoutRoom {
  id: string;
  name: string;
  roomId: string;
  participantCount: number;
  createdAt: Timestamp;
}

const ROOMS_COLLECTION = "rooms";
const PARTICIPANTS_COLLECTION = "room_participants";
const BREAKOUT_ROOMS_COLLECTION = "breakout_rooms";

// ── Create a new room ────────────────────────────────────────────────
export async function createRoom(roomData: {
  name: string;
  description: string;
  hostUid: string;
  hostHandle: string;
  maxParticipants: number;
  isPublic: boolean;
  category: string;
  tags: string[];
  scheduledFor?: Timestamp | null;
  openMic?: boolean;
}): Promise<string> {
  try {
    const db = getFirebaseDb();
    const roomRef = doc(collection(db, ROOMS_COLLECTION));
    const roomId = roomRef.id;
    
    // Generate Agora channel name from room ID
    const agoraChannel = `echo_room_${roomId}`;

    // TTL: 4-hour max lifespan for live rooms, 8 hours after start for scheduled rooms (Saves tech costs & Agora minutes)
    const nowMs = Date.now();
    let expiresMs = nowMs + 4 * 60 * 60 * 1000;
    if (roomData.scheduledFor) {
      try {
        const s = roomData.scheduledFor as any;
        const schedMs = typeof s?.toDate === "function" ? s.toDate().getTime() : s?.seconds ? s.seconds * 1000 : new Date(s).getTime();
        if (schedMs && !isNaN(schedMs)) {
          expiresMs = schedMs + 8 * 60 * 60 * 1000;
        }
      } catch {}
    }

    const newRoom: Room = {
      id: roomId,
      name: roomData.name,
      description: roomData.description,
      hostUid: roomData.hostUid,
      hostHandle: roomData.hostHandle,
      participantCount: 1, // Host counts as first participant
      speakerCount: 1, // Host is first speaker
      maxParticipants: roomData.maxParticipants,
      isPublic: roomData.isPublic,
      category: roomData.category,
      tags: roomData.tags,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      expiresAt: Timestamp.fromDate(new Date(expiresMs)),
      isActive: !roomData.scheduledFor, // Inactive if scheduled for future
      agoraChannel,
      scheduledFor: roomData.scheduledFor || null,
      openMic: roomData.openMic || false, // Default to raise hand mode
    };

    console.log("[createRoom] Attempting to save room to Firestore:", newRoom);
    await setDoc(roomRef, newRoom);
    console.log("[createRoom] Room saved successfully to Firestore with ID:", roomId);

    // Verify the room was saved
    const roomCheck = await getDoc(roomRef);
    console.log("[createRoom] Room verification check:", roomCheck.exists() ? "EXISTS" : "DOES NOT EXIST");
    if (roomCheck.exists()) {
      console.log("[createRoom] Room data:", roomCheck.data());
    }

    // Add host as first participant (try-catch to handle permission issues)
    try {
      await addParticipant(roomId, {
        uid: roomData.hostUid,
        handle: roomData.hostHandle,
        isSpeaker: true,
      });
      console.log("[createRoom] Host added as participant");
    } catch (error) {
      console.error("[createRoom] Error adding host as participant:", error);
      // Continue anyway - room was created successfully
    }

    // Notify followers that host started a stage/room (best-effort, non-blocking)
    (async () => {
      try {
        const followsRef = collection(getFirebaseDb(), "follows");
        const q = query(followsRef, where("followingUid", "==", roomData.hostUid));
        const snap = await getDocs(q);
        const { createNotification } = await import("@/lib/notifications");
        for (const f of snap.docs) {
          const data: any = f.data();
          const followerUid = data.followerUid;
          // Create a stage notification for each follower
          await createNotification(followerUid, {
            type: "stage",
            fromUid: roomData.hostUid,
            fromHandle: roomData.hostHandle,
            roomId,
            roomName: roomData.name,
            text: `${roomData.hostHandle} started a stage: \"${roomData.name}\"`,
          });
        }
      } catch (err) {
        console.error("[createRoom] notify followers failed:", err);
      }
    })();

    return roomId;
  } catch (error) {
    console.error("[createRoom] Error creating room:", error);
    throw error;
  }
}

// ── Add participant to room ───────────────────────────────────────────────
export async function addParticipant(roomId: string, participant: Omit<RoomParticipant, "joinedAt">, isHost: boolean = false): Promise<void> {
  try {
    const db = getFirebaseDb();
    const participantRef = doc(collection(db, PARTICIPANTS_COLLECTION), `${roomId}_${participant.uid}`);
    
    // Check if participant already exists
    const existingSnap = await getDoc(participantRef);
    const isRejoining = existingSnap.exists();
  
    const newParticipant: RoomParticipant = {
      ...participant,
      isSpeaker: isHost, // Host automatically becomes speaker
      joinedAt: serverTimestamp() as Timestamp,
    };
    
    await setDoc(participantRef, {
      ...newParticipant,
      roomId,
    });
    
    // Get room info for notification
    const roomSnap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
    const roomData = roomSnap.data();
    
    // Send notification to host when user joins (not rejoining)
    if (!isHost && !isRejoining && roomData) {
      createNotification(roomData.hostUid, {
        type: "room_join",
        fromUid: participant.uid,
        fromHandle: participant.handle,
        roomId: roomId,
        roomName: roomData.name,
        text: `${participant.handle} joined your room "${roomData.name}"`,
      });
    }
    
    // Update room participant count using atomic operations
    // Don't increment for host (already counted in room creation) or rejoining users
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const updates: any = {
      updatedAt: serverTimestamp(),
    };
    
    if (!isHost && !isRejoining) {
      updates.participantCount = increment(1);
    }
    
    // Speaker count is already set to 1 in room creation for host
    // Only increment for non-host speakers who are not rejoining
    if (!isHost && participant.isSpeaker && !isRejoining) {
      updates.speakerCount = increment(1);
    }
    
    if (Object.keys(updates).length > 1) { // Only update if there are changes beyond updatedAt
      await updateDoc(roomRef, updates);
    }
    
    // Trigger reconciliation after participant add to ensure counts stay in sync
    // This runs asynchronously and doesn't block the join operation
    reconcileParticipantCounts(roomId).catch(err => {
      console.error("[addParticipant] Reconciliation failed:", err);
    });
  } catch (error) {
    console.error("[addParticipant] Error adding participant:", error);
    throw error;
  }
}

// ── Reconcile participant counts ───────────────────────────────────────────
// Ensures room participant counts match actual participant documents
export async function reconcileParticipantCounts(roomId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Count actual participants
    const participantsSnap = await getDocs(query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId)
    ));
    
    const actualParticipantCount = participantsSnap.size;
    const actualSpeakerCount = participantsSnap.docs
      .map(doc => doc.data() as RoomParticipant)
      .filter(p => p.isSpeaker).length;
    
    // Get current room counts
    const roomSnap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
    if (!roomSnap.exists()) return;
    
    const roomData = roomSnap.data() as Room;
    const storedParticipantCount = roomData.participantCount || 0;
    const storedSpeakerCount = roomData.speakerCount || 0;
    
    // Update if counts are out of sync
    if (actualParticipantCount !== storedParticipantCount || actualSpeakerCount !== storedSpeakerCount) {
      console.log(`[reconcileParticipantCounts] Syncing room ${roomId}: stored ${storedParticipantCount}/${storedSpeakerCount} -> actual ${actualParticipantCount}/${actualSpeakerCount}`);
      
      await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
        participantCount: actualParticipantCount,
        speakerCount: actualSpeakerCount,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("[reconcileParticipantCounts] Error:", error);
    // Don't throw - this is a background maintenance operation
  }
}

// ── Send chat message to room ───────────────────────────────────────────
export async function sendRoomChatMessage(roomId: string, message: {
  uid: string;
  handle: string;
  text: string;
}): Promise<void> {
  const db = getFirebaseDb();
  const messagesRef = collection(db, "room_messages");
  const messageRef = doc(messagesRef);
  
  await setDoc(messageRef, {
    roomId,
    uid: message.uid,
    handle: message.handle,
    text: message.text,
    timestamp: serverTimestamp(),
  });
  
  // TODO: Add mention detection and notifications
  // This requires a user lookup by handle function which doesn't exist yet
}

// ── Subscribe to room chat messages (real-time) ────────────────────────
export function subscribeToRoomChat(roomId: string, callback: (messages: Array<{uid: string; handle: string; text: string; time: string}>) => void): () => void {
  const db = getFirebaseDb();
  const messagesQuery = query(
    collection(db, "room_messages"),
    where("roomId", "==", roomId)
  );

  const unsubscribe = onSnapshot(messagesQuery, (querySnap) => {
    const messages = querySnap.docs.map(doc => {
      const data = doc.data();
      return {
        uid: data.uid,
        handle: data.handle,
        text: data.text,
        time: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
    // Sort by timestamp on client side
    messages.sort((a, b) => {
      const timeA = new Date(`1970-01-01T${a.time}`);
      const timeB = new Date(`1970-01-01T${b.time}`);
      return timeA.getTime() - timeB.getTime();
    });
    callback(messages);
  }, (error) => {
    console.error("[subscribeToRoomChat] Error:", error);
  });

  return unsubscribe;
}

// ── Remove participant from room ────────────────────────────────────────
export async function removeParticipant(roomId: string, uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const participantRef = doc(
      collection(db, PARTICIPANTS_COLLECTION),
      `${roomId}_${uid}`
    );

    // Check if participant was a speaker before removing
    const participantSnap = await getDoc(participantRef);
    const wasSpeaker = participantSnap.exists() && participantSnap.data().isSpeaker;
    const participantData = participantSnap.data();

    await deleteDoc(participantRef);

    // Get room info for notification
    const roomSnap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
    const roomData = roomSnap.data();

    // Send notification to host when user leaves
    if (participantData && roomData && uid !== roomData.hostUid) {
      createNotification(roomData.hostUid, {
        type: "room_leave",
        fromUid: uid,
        fromHandle: participantData.handle,
        roomId: roomId,
        roomName: roomData.name,
        text: `${participantData.handle} left your room "${roomData.name}"`,
      });
    }

    // Update room participant count using atomic operations
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const updates: any = {
          participantCount: increment(-1),
          updatedAt: serverTimestamp(),
        };
      
        // Also decrement speaker count if they were a speaker
        if (wasSpeaker) {
          updates.speakerCount = increment(-1);
        }
      
        await updateDoc(roomRef, updates);
        
        // Trigger reconciliation after participant removal to ensure counts stay in sync
        reconcileParticipantCounts(roomId).catch(err => {
          console.error("[removeParticipant] Reconciliation failed:", err);
        });
      }
    } catch (e) {
      console.warn("[removeParticipant] Room doc not found or already deleted:", e);
    }
  } catch (error) {
    console.error("[removeParticipant] Error removing participant:", error);
  }
}

// ── Delete room ────────────────────────────────────────────────────────
export async function deleteRoom(roomId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // 1. Delete the room doc
    await deleteDoc(doc(db, ROOMS_COLLECTION, roomId)).catch(() => {});
    
    // 2. Delete all participants
    try {
      const participantsQuery = query(
        collection(db, PARTICIPANTS_COLLECTION),
        where("roomId", "==", roomId)
      );
      const participantsSnap = await getDocs(participantsQuery);
      for (const d of participantsSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch {}
    
    // 3. Delete all chat messages
    try {
      const messagesQuery = query(
        collection(db, "room_messages"),
        where("roomId", "==", roomId)
      );
      const messagesSnap = await getDocs(messagesQuery);
      for (const d of messagesSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch {}

    // 4. Delete all reactions
    try {
      const reactionsQuery = query(
        collection(db, "room_reactions"),
        where("roomId", "==", roomId)
      );
      const reactionsSnap = await getDocs(reactionsQuery);
      for (const d of reactionsSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch {}
  } catch (error) {
    console.error("[deleteRoom] Error deleting room:", error);
  }
}

// ── Raise hand to request speaking ───────────────────────────────────────
export async function raiseHand(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  await updateDoc(participantRef, {
    raisedHand: true,
    raisedHandAt: serverTimestamp(),
  });
}

// ── Lower hand to cancel speaking request ─────────────────────────────────
export async function lowerHand(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  await updateDoc(participantRef, {
    raisedHand: false,
    raisedHandAt: null,
  });
}

// ── Promote listener to speaker ─────────────────────────────────────────────
export async function promoteToSpeaker(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  
  // Get participant data for notification
  const participantSnap = await getDoc(participantRef);
  const participantData = participantSnap.data();
  
  await updateDoc(participantRef, {
    isSpeaker: true,
    raisedHand: false,
    raisedHandAt: null,
  });
  
  // Get room info for notification
  const roomSnap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
  const roomData = roomSnap.data();
  
  // Send notification to promoted user
  if (participantData && roomData) {
    createNotification(uid, {
      type: "room_promote",
      fromUid: roomData.hostUid,
      fromHandle: roomData.hostHandle,
      roomId: roomId,
      roomName: roomData.name,
      text: `You were promoted to speaker in "${roomData.name}"`,
    });
  }
  
  // Update room speaker count
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    speakerCount: increment(1),
  });
}

// ── Demote speaker to listener ────────────────────────────────────────────
export async function demoteFromSpeaker(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  
  // Get participant data for notification
  const participantSnap = await getDoc(participantRef);
  const participantData = participantSnap.data();
  
  await updateDoc(participantRef, {
    isSpeaker: false,
    isMuted: false,
  });
  
  // Get room info for notification
  const roomSnap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
  const roomData = roomSnap.data();
  
  // Send notification to demoted user
  if (participantData && roomData) {
    createNotification(uid, {
      type: "room_demote",
      fromUid: roomData.hostUid,
      fromHandle: roomData.hostHandle,
      roomId: roomId,
      roomName: roomData.name,
      text: `You were demoted from speaker in "${roomData.name}"`,
    });
  }
  
  // Update room speaker count
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    speakerCount: increment(-1),
  });
}

// ── Mute speaker ─────────────────────────────────────────────────────────
export async function muteParticipant(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  await updateDoc(participantRef, {
    isMuted: true,
  });
}

// ── Unmute speaker ───────────────────────────────────────────────────────
export async function unmuteParticipant(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  await updateDoc(participantRef, {
    isMuted: false,
  });
}

// ── Send reaction to room ────────────────────────────────────────────────
export async function sendRoomReaction(roomId: string, reaction: {
  uid: string;
  handle: string;
  emoji: string;
}): Promise<void> {
  const db = getFirebaseDb();
  const reactionsRef = collection(db, "room_reactions");
  await addDoc(reactionsRef, {
    roomId,
    ...reaction,
    createdAt: Date.now(),
    timestamp: serverTimestamp(),
  });
}

// ── Subscribe to room reactions ───────────────────────────────────────────
export function subscribeToRoomReactions(
  roomId: string,
  onReaction: (reaction: { id: string; uid: string; handle: string; emoji: string }) => void
): () => void {
  const db = getFirebaseDb();
  const reactionsQuery = query(
    collection(db, "room_reactions"),
    where("roomId", "==", roomId),
    limit(40)
  );

  let initialLoad = true;
  const unsubscribe = onSnapshot(
    reactionsQuery,
    (querySnap) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      querySnap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.emoji && data.uid) {
            onReaction({
              id: change.doc.id,
              uid: data.uid,
              handle: data.handle || "@ANON",
              emoji: data.emoji,
            });
          }
        }
      });
    },
    (error) => {
      console.error("[subscribeToRoomReactions] Error:", error);
    }
  );

  return unsubscribe;
}

// ── Get room by ID ─────────────────────────────────────────────────────
export async function getRoom(roomId: string): Promise<Room | null> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return null;

  return { id: roomSnap.id, ...roomSnap.data() } as Room;
}

// ── Get trending rooms (sorted by participant count) ─────────────────────
export async function getTrendingRooms(limit: number = 10): Promise<Room[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where("isActive", "==", true),
    where("isPublic", "==", true)
  );
  
  const snap = await getDocs(q);
  const rooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  
  // Sort by participant count (descending)
  return rooms.sort((a, b) => b.participantCount - a.participantCount).slice(0, limit);
}

// ── Get rooms by category ────────────────────────────────────────────────
export async function getRoomsByCategory(category: string, limit: number = 10): Promise<Room[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, ROOMS_COLLECTION),
    where("isActive", "==", true),
    where("isPublic", "==", true),
    where("category", "==", category)
  );
  
  const snap = await getDocs(q);
  const rooms = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  
  // Sort by participant count (descending)
  return rooms.sort((a, b) => b.participantCount - a.participantCount).slice(0, limit);
}

// ── Bookmark room for user ───────────────────────────────────────────────
export async function bookmarkRoom(userId: string, roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const bookmarkRef = doc(db, "user_bookmarks", `${userId}_${roomId}`);
  
  // Get room info for notification
  const roomSnap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
  const roomData = roomSnap.data();
  
  await setDoc(bookmarkRef, {
    userId,
    roomId,
    bookmarkedAt: serverTimestamp(),
  });
  
  // Send notification to room host when someone bookmarks their room
  if (roomData && userId !== roomData.hostUid) {
    // Get user handle for the bookmarking user
    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.data();
    
    if (userData) {
      createNotification(roomData.hostUid, {
        type: "bookmark",
        fromUid: userId,
        fromHandle: userData.handle,
        roomId: roomId,
        roomName: roomData.name,
        text: `${userData.handle} bookmarked your room "${roomData.name}"`,
      });
    }
  }
}

// ── Remove room bookmark ───────────────────────────────────────────────
export async function removeRoomBookmark(userId: string, roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const bookmarkRef = doc(db, "user_bookmarks", `${userId}_${roomId}`);
  await deleteDoc(bookmarkRef);
}

// ── Get user's bookmarked rooms ───────────────────────────────────────────
export async function getUserBookmarkedRooms(userId: string): Promise<Room[]> {
  const db = getFirebaseDb();
  const bookmarksQuery = query(
    collection(db, "user_bookmarks"),
    where("userId", "==", userId)
  );
  
  const bookmarksSnap = await getDocs(bookmarksQuery);
  const roomIds = bookmarksSnap.docs.map(doc => doc.data().roomId);
  
  if (roomIds.length === 0) return [];
  
  // Get room details
  const roomsQuery = query(
    collection(db, ROOMS_COLLECTION),
    where("__name__", "in", roomIds.slice(0, 10)) // Firestore limit for 'in' queries
  );
  
  const roomsSnap = await getDocs(roomsQuery);
  return roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
}

// ── Update room open mic mode ───────────────────────────────────────────
export async function updateRoomOpenMic(roomId: string, openMic: boolean): Promise<void> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    openMic,
    updatedAt: serverTimestamp(),
  });
}

// ── Update room [ TRANSMIT ] flag and URL ─────────────────────────────────────────
export async function updateRoomTransmit(roomId: string, enabled: boolean, transmitUrl?: string): Promise<void> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const updateObj: any = { transmitEnabled: enabled, updatedAt: serverTimestamp() };
  if (transmitUrl !== undefined) updateObj.transmitUrl = transmitUrl;
  await updateDoc(roomRef, updateObj);

  // Best-effort notification: when enabling [ TRANSMIT ], tell followers the host is broadcasting
  if (enabled) {
    try {
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return;
      const roomData: any = roomSnap.data();

      const followsRef = collection(getFirebaseDb(), "follows");
      const q = query(followsRef, where("followingUid", "==", roomData.hostUid));
      const snap = await getDocs(q);
      for (const f of snap.docs) {
        const data: any = f.data();
        const followerUid = data.followerUid;
        // Fire-and-forget notification
        try {
          await createNotification(followerUid, {
            type: "stage",
            fromUid: roomData.hostUid,
            fromHandle: roomData.hostHandle,
            roomId,
            roomName: roomData.name,
            text: `${roomData.hostHandle} is now [ TRANSMIT ]ing "${roomData.name}"`,
          });
        } catch (e) {
          // best-effort per-follower
          console.warn("[updateRoomTransmit] notify follower failed for", followerUid, e);
        }
      }
    } catch (err) {
      console.warn("[updateRoomTransmit] notify followers failed:", err);
    }
  }
}

// ── Get all public rooms ────────────────────────────────────────────────
export async function getPublicRooms(): Promise<Room[]> {
  const db = getFirebaseDb();
  const roomsQuery = query(
    collection(db, ROOMS_COLLECTION),
    where("isPublic", "==", true),
    where("isActive", "==", true),
    orderBy("participantCount", "desc")
  );

  const roomsSnap = await getDocs(roomsQuery);
  return roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
}

// ── Subscribe to room updates (real-time) ───────────────────────────────
export function subscribeToRoom(roomId: string, callback: (room: Room | null) => void): () => void {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);

  const unsubscribe = onSnapshot(roomRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }
    callback({ id: docSnap.id, ...docSnap.data() } as Room);
  });

  return unsubscribe;
}

// ── Subscribe to public rooms (real-time) ──────────────────────────────
export function subscribeToPublicRooms(callback: (rooms: Room[]) => void): () => void {
  const db = getFirebaseDb();
  console.log("[subscribeToPublicRooms] Setting up query for public rooms");
  // Query single-field (createdAt desc) to eliminate any composite index requirement
  const roomsQuery = query(
    collection(db, ROOMS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(60)
  );

  const unsubscribe = onSnapshot(roomsQuery, (querySnap) => {
    const now = Date.now();
    const allDocs = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
    
    // Filter public & non-expired rooms client-side
    const validRooms = allDocs.filter(r => {
      if (r.isPublic === false) return false;
      if (r.expiresAt) {
        try {
          const s = r.expiresAt as any;
          const expMs = typeof s?.toDate === "function" ? s.toDate().getTime() : s?.seconds ? s.seconds * 1000 : new Date(s).getTime();
          if (expMs && expMs < now) {
            // Clean up expired room asynchronously
            deleteRoom(r.id).catch(() => {});
            return false;
          }
        } catch {}
      }
      return true;
    });

    // Secondary sort by participantCount on client side
    validRooms.sort((a, b) => (b.participantCount || 0) - (a.participantCount || 0));
    callback(validRooms);
  }, (error) => {
    console.warn("[subscribeToPublicRooms] Warning subscribing with order:", error);
    // Fallback: fetch without order
    const fallbackQuery = query(collection(db, ROOMS_COLLECTION), limit(60));
    onSnapshot(fallbackQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];
      callback(list.filter(r => r.isPublic !== false));
    }, () => callback([]));
  });

  return unsubscribe;
}

// ── Subscribe to room participants (real-time) ─────────────────────────
// NOTE: This query may require a Firestore composite index on:
// - roomId (equality)
// - joinedAt (descending)
export function subscribeToRoomParticipants(roomId: string, callback: (participants: RoomParticipant[]) => void): () => void {
  const db = getFirebaseDb();
  const participantsQuery = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where("roomId", "==", roomId)
  );

  const unsubscribe = onSnapshot(participantsQuery, (querySnap) => {
    const participants = querySnap.docs
      .filter(doc => doc.id.startsWith(`${roomId}_`)) // Only include documents with expected ID pattern
      .map(doc => ({
        ...doc.data() as RoomParticipant,
        id: doc.id, // Include document ID for unique React keys
      }));
    
    // Client-side sort by joinedAt descending to eliminate composite index requirement
    participants.sort((a, b) => {
      const tA = (a.joinedAt as any)?.toMillis?.() || (a.joinedAt as any)?.seconds * 1000 || 0;
      const tB = (b.joinedAt as any)?.toMillis?.() || (b.joinedAt as any)?.seconds * 1000 || 0;
      return tB - tA;
    });

    callback(participants);
  }, (error) => {
    console.error("[subscribeToRoomParticipants] Error:", error);
  });

  return unsubscribe;
}

// ── Update room ────────────────────────────────────────────────────────
export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ── End room (mark as inactive) ────────────────────────────────────────
export async function endRoom(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

// ── [ HOST_OVERRIDE ] - Host Control Functions ─────────────────────────────────────────────

// ── Ban a user from a room ───────────────────────────────────────────────────────
export async function hostOverrideBan(
  roomId: string,
  targetUid: string,
  moderatorUid: string,
  reason?: string
): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get participant document
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("uid", "==", targetUid)
    );
    const participantSnap = await getDocs(participantQuery);
    
    if (participantSnap.empty) {
      throw new Error("Participant not found in room");
    }
    
    const participantDoc = participantSnap.docs[0];
    
    // Update participant with ban status
    await updateDoc(participantDoc.ref, {
      isBanned: true,
      bannedAt: serverTimestamp(),
      bannedBy: moderatorUid,
      bannedReason: reason || "Violation of community guidelines",
    });
    
    // Send notification to banned user
    await createNotification(targetUid, {
      type: "room_ban",
      fromUid: moderatorUid,
      fromHandle: "Moderator", // Will be updated with actual handle
      roomId,
      text: `You have been banned from a room${reason ? `: ${reason}` : ""}`,
    });
    
    // Remove participant from room (they will be kicked)
    await removeParticipant(roomId, targetUid);
  } catch (error) {
    console.error("[banUserFromRoom] Error:", error);
    throw error;
  }
}

// ── Unban a user from a room ─────────────────────────────────────────────────────
export async function hostOverrideUnban(roomId: string, targetUid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get participant document
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("uid", "==", targetUid)
    );
    const participantSnap = await getDocs(participantQuery);
    
    if (participantSnap.empty) {
      throw new Error("Participant not found in room");
    }
    
    const participantDoc = participantSnap.docs[0];
    
    // Remove ban status
    await updateDoc(participantDoc.ref, {
      isBanned: false,
      bannedAt: null,
      bannedBy: null,
      bannedReason: null,
    });
  } catch (error) {
    console.error("[unbanUserFromRoom] Error:", error);
    throw error;
  }
}

// ── Check if user is banned from room ─────────────────────────────────────────────
export async function hostOverrideIsBanned(roomId: string, uid: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("uid", "==", uid),
      where("isBanned", "==", true)
    );
    const participantSnap = await getDocs(participantQuery);
    
    return !participantSnap.empty;
  } catch (error) {
    console.error("[isUserBannedFromRoom] Error:", error);
    return false;
  }
}

// ── Promote user to moderator ─────────────────────────────────────────────────────
export async function hostOverridePromoteModerator(roomId: string, targetUid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get participant document
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("uid", "==", targetUid)
    );
    const participantSnap = await getDocs(participantQuery);
    
    if (participantSnap.empty) {
      throw new Error("Participant not found in room");
    }
    
    const participantDoc = participantSnap.docs[0];
    
    // Promote to moderator
    await updateDoc(participantDoc.ref, {
      isModerator: true,
    });
    
    // Send notification
    await createNotification(targetUid, {
      type: "moderator_promotion",
      fromUid: roomId, // Using roomId as placeholder for system notification
      fromHandle: "System",
      roomId,
      text: "You have been promoted to moderator in a room",
    });
  } catch (error) {
    console.error("[promoteToModerator] Error:", error);
    throw error;
  }
}

// ── Demote user from moderator ───────────────────────────────────────────────────
export async function hostOverrideDemoteModerator(roomId: string, targetUid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get participant document
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("uid", "==", targetUid)
    );
    const participantSnap = await getDocs(participantQuery);
    
    if (participantSnap.empty) {
      throw new Error("Participant not found in room");
    }
    
    const participantDoc = participantSnap.docs[0];
    
    // Demote from moderator
    await updateDoc(participantDoc.ref, {
      isModerator: false,
    });
  } catch (error) {
    console.error("[demoteFromModerator] Error:", error);
    throw error;
  }
}

// ── Enable slow mode for room ─────────────────────────────────────────────────────
export async function hostOverrideEnableSlowMode(roomId: string, intervalSeconds: number = 30): Promise<void> {
  try {
    const db = getFirebaseDb();
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    
    await updateDoc(roomRef, {
      slowModeEnabled: true,
      slowModeInterval: intervalSeconds,
    });
  } catch (error) {
    console.error("[enableSlowMode] Error:", error);
    throw error;
  }
}

// ── Disable slow mode for room ────────────────────────────────────────────────────
export async function hostOverrideDisableSlowMode(roomId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    
    await updateDoc(roomRef, {
      slowModeEnabled: false,
      slowModeInterval: null,
    });
  } catch (error) {
    console.error("[disableSlowMode] Error:", error);
    throw error;
  }
}

// ── Check if user can send message (slow mode check) ───────────────────────────────
export async function canUserSendMessage(roomId: string, uid: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const db = getFirebaseDb();
    
    // Get room settings
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      return { allowed: false, reason: "Room not found" };
    }
    
    const roomData = roomSnap.data();
    const slowModeEnabled = roomData.slowModeEnabled || false;
    
    if (!slowModeEnabled) {
      return { allowed: true };
    }
    
    // Check last message time for this user in this room
    // This would require a room_messages collection with timestamps
    // For now, we'll implement a basic check
    const slowModeInterval = roomData.slowModeInterval || 30;
    
    // TODO: Implement proper message timing check when room_messages collection exists
    // For now, allow messages in slow mode but with a warning
    return { allowed: true, reason: `Slow mode active: ${slowModeInterval}s interval` };
  } catch (error) {
    console.error("[canUserSendMessage] Error:", error);
    return { allowed: false, reason: "Error checking permissions" };
  }
}

// ── Get room bans ─────────────────────────────────────────────────────────────────
export async function getRoomBans(roomId: string): Promise<RoomParticipant[]> {
  try {
    const db = getFirebaseDb();
    
    const bansQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("isBanned", "==", true)
    );
    const bansSnap = await getDocs(bansQuery);
    
    return bansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RoomParticipant[];
  } catch (error) {
    console.error("[getRoomBans] Error:", error);
    return [];
  }
}

// ── Get room moderators ────────────────────────────────────────────────────────────
export async function getRoomModerators(roomId: string): Promise<RoomParticipant[]> {
  try {
    const db = getFirebaseDb();
    
    const moderatorsQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", roomId),
      where("isModerator", "==", true)
    );
    const moderatorsSnap = await getDocs(moderatorsQuery);
    
    return moderatorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RoomParticipant[];
  } catch (error) {
    console.error("[getRoomModerators] Error:", error);
    return [];
  }
}

// ── Breakout Room Functions ─────────────────────────────────────────────────────────

// ── Create a breakout room ─────────────────────────────────────────────────────────
export async function createBreakoutRoom(
  parentRoomId: string,
  name: string,
  maxParticipants: number = 10
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const breakoutRef = doc(collection(db, BREAKOUT_ROOMS_COLLECTION));
    const breakoutId = breakoutRef.id;
    
    // Generate Agora channel for breakout room
    const agoraChannel = `echo_breakout_${breakoutId}`;
    
    await setDoc(breakoutRef, {
      id: breakoutId,
      parentRoomId,
      name,
      maxParticipants,
      participantCount: 0,
      agoraChannel,
      createdAt: serverTimestamp(),
      isActive: true,
    });
    
    return breakoutId;
  } catch (error) {
    console.error("[createBreakoutRoom] Error:", error);
    throw error;
  }
}

// ── Get breakout rooms for a parent room ─────────────────────────────────────────────
export async function getBreakoutRooms(parentRoomId: string): Promise<BreakoutRoom[]> {
  try {
    const db = getFirebaseDb();
    
    const breakoutQuery = query(
      collection(db, BREAKOUT_ROOMS_COLLECTION),
      where("parentRoomId", "==", parentRoomId),
      where("isActive", "==", true)
    );
    const breakoutSnap = await getDocs(breakoutQuery);
    
    return breakoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BreakoutRoom[];
  } catch (error) {
    console.error("[getBreakoutRooms] Error:", error);
    return [];
  }
}

// ── Subscribe to breakout rooms (real-time) ─────────────────────────────────────────
export function subscribeToBreakoutRooms(
  parentRoomId: string,
  callback: (breakoutRooms: BreakoutRoom[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const breakoutQuery = query(
    collection(db, BREAKOUT_ROOMS_COLLECTION),
    where("parentRoomId", "==", parentRoomId),
    where("isActive", "==", true)
  );
  
  const unsubscribe = onSnapshot(breakoutQuery, (querySnap) => {
    const breakoutRooms = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BreakoutRoom[];
    callback(breakoutRooms);
  }, (error) => {
    console.error("[subscribeToBreakoutRooms] Error:", error);
  });
  
  return unsubscribe;
}

// ── Assign participant to breakout room ─────────────────────────────────────────────
export async function assignToBreakoutRoom(
  parentRoomId: string,
  participantUid: string,
  breakoutRoomId: string
): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get participant document
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", parentRoomId),
      where("uid", "==", participantUid)
    );
    const participantSnap = await getDocs(participantQuery);
    
    if (participantSnap.empty) {
      throw new Error("Participant not found in parent room");
    }
    
    const participantDoc = participantSnap.docs[0];
    
    // Update participant with breakout room assignment
    await updateDoc(participantDoc.ref, {
      breakoutRoomId,
    });
    
    // Increment breakout room participant count
    const breakoutRef = doc(db, BREAKOUT_ROOMS_COLLECTION, breakoutRoomId);
    await updateDoc(breakoutRef, {
      participantCount: increment(1),
    });
    
    // Send notification
    await createNotification(participantUid, {
      type: "room_promote",
      fromUid: parentRoomId,
      fromHandle: "System",
      roomId: breakoutRoomId,
      text: "You have been assigned to a breakout room",
    });
  } catch (error) {
    console.error("[assignToBreakoutRoom] Error:", error);
    throw error;
  }
}

// ── Remove participant from breakout room ───────────────────────────────────────────
export async function removeFromBreakoutRoom(
  parentRoomId: string,
  participantUid: string
): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get participant document
    const participantQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", parentRoomId),
      where("uid", "==", participantUid)
    );
    const participantSnap = await getDocs(participantQuery);
    
    if (participantSnap.empty) {
      throw new Error("Participant not found in parent room");
    }
    
    const participantDoc = participantSnap.docs[0];
    const participantData = participantDoc.data();
    const breakoutRoomId = participantData.breakoutRoomId;
    
    if (!breakoutRoomId) {
      return; // Not in a breakout room
    }
    
    // Remove breakout room assignment
    await updateDoc(participantDoc.ref, {
      breakoutRoomId: null,
    });
    
    // Decrement breakout room participant count
    const breakoutRef = doc(db, BREAKOUT_ROOMS_COLLECTION, breakoutRoomId);
    await updateDoc(breakoutRef, {
      participantCount: increment(-1),
    });
  } catch (error) {
    console.error("[removeFromBreakoutRoom] Error:", error);
    throw error;
  }
}

// ── Close breakout room ─────────────────────────────────────────────────────────────
export async function closeBreakoutRoom(breakoutRoomId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const breakoutRef = doc(db, BREAKOUT_ROOMS_COLLECTION, breakoutRoomId);
    
    // Mark as inactive
    await updateDoc(breakoutRef, {
      isActive: false,
    });
    
    // Remove all participants from this breakout room
    const participantsQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("breakoutRoomId", "==", breakoutRoomId)
    );
    const participantsSnap = await getDocs(participantsQuery);
    
    const batch = writeBatch(db);
    participantsSnap.docs.forEach(doc => {
      batch.update(doc.ref, { breakoutRoomId: null });
    });
    await batch.commit();
  } catch (error) {
    console.error("[closeBreakoutRoom] Error:", error);
    throw error;
  }
}

// ── Get participants in a breakout room ─────────────────────────────────────────────
export async function getBreakoutRoomParticipants(breakoutRoomId: string): Promise<RoomParticipant[]> {
  try {
    const db = getFirebaseDb();
    
    const participantsQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("breakoutRoomId", "==", breakoutRoomId)
    );
    const participantsSnap = await getDocs(participantsQuery);
    
    return participantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RoomParticipant[];
  } catch (error) {
    console.error("[getBreakoutRoomParticipants] Error:", error);
    return [];
  }
}

// ── Auto-assign participants to breakout rooms ───────────────────────────────────────
export async function autoAssignToBreakoutRooms(
  parentRoomId: string,
  breakoutRoomIds: string[]
): Promise<void> {
  try {
    const db = getFirebaseDb();
    
    // Get all participants in parent room who are not in breakout rooms
    const participantsQuery = query(
      collection(db, PARTICIPANTS_COLLECTION),
      where("roomId", "==", parentRoomId),
      where("breakoutRoomId", "==", null)
    );
    const participantsSnap = await getDocs(participantsQuery);
    
    const participants = participantsSnap.docs;
    const numBreakoutRooms = breakoutRoomIds.length;
    
    if (participants.length === 0 || numBreakoutRooms === 0) {
      return;
    }
    
    // Distribute participants evenly across breakout rooms
    participants.forEach((doc, index) => {
      const breakoutRoomId = breakoutRoomIds[index % numBreakoutRooms];
      assignToBreakoutRoom(parentRoomId, doc.data().uid, breakoutRoomId);
    });
  } catch (error) {
    console.error("[autoAssignToBreakoutRooms] Error:", error);
    throw error;
  }
}

// ── Firestore Index Requirements Documentation ──────────────────────────────
// 
// The following Firestore composite indexes are required for optimal performance:
// 
// 1. rooms collection:
//    - Fields: isPublic (ASC), isActive (ASC), createdAt (DESC)
//    - Used by: subscribeToPublicRooms()
//    - Purpose: Query active public rooms sorted by creation time
// 
// 2. room_participants collection:
//    - Fields: roomId (ASC), joinedAt (DESC)
//    - Used by: subscribeToRoomParticipants()
//    - Purpose: Query room participants sorted by join time
// 
// 3. posts collection (if using orderBy with where):
//    - Fields: authorUid (ASC), createdAt (DESC)
//    - Used by: subscribeToUserPosts()
//    - Purpose: Query user's posts sorted by creation time
// 
// To create these indexes:
// 1. Go to Firebase Console → Firestore → Indexes
// 2. Click "Add Index"
// 3. Select the collection and fields as specified above
// 4. Set the sort order (ASC for where clauses, DESC for orderBy)
// 5. Click "Create"
// 
// Alternatively, let Firestore create them automatically on first query error.

// ── Reconcile all room participant counts (maintenance function) ─────────────
// Can be called periodically or triggered by admin to fix all room counts
export async function reconcileAllRoomCounts(): Promise<{ processed: number; fixed: number; errors: number }> {
  try {
    const db = getFirebaseDb();
    const roomsSnap = await getDocs(query(collection(db, ROOMS_COLLECTION)));
    
    let processed = 0;
    let fixed = 0;
    let errors = 0;
    
    for (const roomDoc of roomsSnap.docs) {
      const roomId = roomDoc.id;
      processed++;
      
      try {
        await reconcileParticipantCounts(roomId);
        fixed++;
      } catch (err) {
        console.error(`[reconcileAllRoomCounts] Failed for room ${roomId}:`, err);
        errors++;
      }
    }
    
    console.log(`[reconcileAllRoomCounts] Processed ${processed} rooms, fixed ${fixed}, errors ${errors}`);
    return { processed, fixed, errors };
  } catch (error) {
    console.error("[reconcileAllRoomCounts] Error:", error);
    return { processed: 0, fixed: 0, errors: 1 };
  }
}

