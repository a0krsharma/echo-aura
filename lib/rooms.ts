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

  await setDoc(roomRef, newRoom);

  // Add host as first participant (try-catch to handle permission issues)
  try {
    await addParticipant(roomId, {
      uid: roomData.hostUid,
      handle: roomData.hostHandle,
      isSpeaker: true,
    });
  } catch (error) {
    console.error("Error adding host as participant:", error);
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
  const roomsQuery = query(
    collection(db, ROOMS_COLLECTION),
    where("isPublic", "==", true),
    where("isActive", "==", true),
    orderBy("participantCount", "desc")
  );

  const unsubscribe = onSnapshot(roomsQuery, (querySnap) => {
    const rooms = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
    callback(rooms);
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

// ── Delete room ────────────────────────────────────────────────────────
export async function deleteRoom(roomId: string): Promise<void> {
  const db = getFirebaseDb();
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await deleteDoc(roomRef);

  // Delete all participants
  const participantsQuery = query(
    collection(db, PARTICIPANTS_COLLECTION),
    where("roomId", "==", roomId)
  );
  const participantsSnap = await getDocs(participantsQuery);
  
  for (const doc of participantsSnap.docs) {
    await deleteDoc(doc.ref);
  }
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

