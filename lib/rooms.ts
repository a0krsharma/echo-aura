/**
 * lib/rooms.ts
 * ─────────────────────────────────────────────────────
 * Room Management System for Echo Stage
 * Handles room creation, joining, listing, and real-time updates
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export interface Room {
  id: string;
  name: string;
  description: string;
  hostUid: string;
  hostHandle: string;
  participantCount: number;
  maxParticipants: number;
  isPublic: boolean;
  category: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  agoraChannel: string;
}

export interface RoomParticipant {
  uid: string;
  handle: string;
  joinedAt: Timestamp;
  isSpeaker: boolean;
  raisedHand?: boolean;
  raisedHandAt?: Timestamp;
  isMuted?: boolean;
}

const ROOMS_COLLECTION = "rooms";
const PARTICIPANTS_COLLECTION = "room_participants";

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
}): Promise<string> {
  const db = getFirebaseDb();
  const roomRef = doc(collection(db, ROOMS_COLLECTION));
  const roomId = roomRef.id;
  
  // Generate Agora channel name from room ID
  const agoraChannel = `echo_room_${roomId}`;

  const newRoom: Room = {
    id: roomId,
    name: roomData.name,
    description: roomData.description,
    hostUid: roomData.hostUid,
    hostHandle: roomData.hostHandle,
    participantCount: 1, // Host counts as first participant
    maxParticipants: roomData.maxParticipants,
    isPublic: roomData.isPublic,
    category: roomData.category,
    tags: roomData.tags,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    isActive: true,
    agoraChannel,
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

  return roomId;
}

// ── Add participant to room ─────────────────────────────────────────────
export async function addParticipant(roomId: string, participant: {
  uid: string;
  handle: string;
  isSpeaker?: boolean;
}): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${participant.uid}`
  );

  await setDoc(participantRef, {
    ...participant,
    joinedAt: serverTimestamp(),
    isSpeaker: participant.isSpeaker || false,
  });

  // Update room participant count
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    participantCount: increment(1),
    updatedAt: serverTimestamp(),
  });
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
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );

  await deleteDoc(participantRef);

  // Update room participant count
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    participantCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
}

// ── Delete room ────────────────────────────────────────────────────────
export async function deleteRoom(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  
  // Delete the room
  await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
  
  // Delete all participants
  const participantsQuery = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where("roomId", "==", roomId)
  );
  const participantsSnap = await getDocs(participantsQuery);
  for (const doc of participantsSnap.docs) {
    await deleteDoc(doc.ref);
  }
  
  // Delete all chat messages
  const messagesQuery = query(
    collection(db, "room_messages"),
    where("roomId", "==", roomId)
  );
  const messagesSnap = await getDocs(messagesQuery);
  for (const doc of messagesSnap.docs) {
    await deleteDoc(doc.ref);
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

// ── Promote participant to speaker ────────────────────────────────────────
export async function promoteToSpeaker(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  await updateDoc(participantRef, {
    isSpeaker: true,
    raisedHand: false,
    raisedHandAt: null,
  });
}

// ── Demote speaker to listener ────────────────────────────────────────────
export async function demoteFromSpeaker(roomId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const participantRef = doc(
    collection(db, PARTICIPANTS_COLLECTION),
    `${roomId}_${uid}`
  );
  await updateDoc(participantRef, {
    isSpeaker: false,
    isMuted: false,
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

// ── Get room by ID ─────────────────────────────────────────────────────
export async function getRoom(roomId: string): Promise<Room | null> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return null;

  return { id: roomSnap.id, ...roomSnap.data() } as Room;
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
  const roomsQuery = query(
    collection(db, ROOMS_COLLECTION),
    where("isPublic", "==", true),
    where("isActive", "==", true)
  );

  const unsubscribe = onSnapshot(roomsQuery, (querySnap) => {
    console.log("[subscribeToPublicRooms] Query snapshot received, docs count:", querySnap.docs.length);
    const rooms = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
    // Sort by participantCount on client side to avoid index requirement
    rooms.sort((a, b) => b.participantCount - a.participantCount);
    console.log("[subscribeToPublicRooms] Public rooms updated:", rooms);
    callback(rooms);
  }, (error) => {
    console.error("[subscribeToPublicRooms] Error subscribing to public rooms:", error);
  });

  return unsubscribe;
}

// ── Subscribe to room participants (real-time) ─────────────────────────
export function subscribeToRoomParticipants(roomId: string, callback: (participants: RoomParticipant[]) => void): () => void {
  const db = getFirebaseDb();
  const participantsQuery = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where("roomId", "==", roomId)
  );

  const unsubscribe = onSnapshot(participantsQuery, (querySnap) => {
    const participants = querySnap.docs.map(doc => doc.data() as RoomParticipant);
    callback(participants);
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

