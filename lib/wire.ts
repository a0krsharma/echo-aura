// lib/wire.ts
// Compatibility shim: re-export whispers module under 'wire' name so UI can move to /wire without changing backend.
import * as whispers from './whispers';

export type WireConversation = whispers.WhisperConversation;
export type WireMessage = whispers.WhisperMessage;

export const getConversationId = whispers['getConversationId'] as (a:string,b:string)=>string || ((a,b)=>[a,b].sort().join('__'));
export const startOrGetConversation = whispers.startOrGetConversation;
export const sendWhisper = whispers.sendWhisper; // keep name for now
export const subscribeToConversations = whispers.subscribeToConversations;
export const subscribeToMessages = whispers.subscribeToMessages;
export const markMessagesRead = whispers.markMessagesRead;
export const searchUsersByHandle = whispers.searchUsersByHandle;
export const addSignalingMessage = whispers.addSignalingMessage;
export const subscribeToSignaling = whispers.subscribeToSignaling;
export const deleteWhisperMessage = whispers.deleteWhisperMessage;
export const deleteWireMessage = whispers.deleteWireMessage;
export const updateThreadLastRead = whispers.updateThreadLastRead;
export const getTelemetryStatus = whispers.getTelemetryStatus;

// Re-export with 'wire' naming for clarity
export const startOrGetWire = startOrGetConversation;
export const sendWire = sendWhisper;
export const subscribeToWires = subscribeToConversations;
export const subscribeToWireMessages = subscribeToMessages;
export const addWireSignalingMessage = addSignalingMessage;
export const subscribeToWireSignaling = subscribeToSignaling;

export default {
  startOrGetWire,
  sendWire,
  subscribeToWires,
  subscribeToWireMessages,
  addWireSignalingMessage,
  subscribeToWireSignaling,
};