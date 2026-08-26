export type RoomInteractionEvent =
  | { type: 'POKE'; zone: 'visor' | 'antenna' | 'chest'; senderId: string; senderName: string }
  | { type: 'SNEEZE'; senderId: string; senderName: string }
  | { type: 'EMOTION_SHIFT'; emotion: 'happy' | 'dizzy' | 'savage' | 'poetic'; senderId: string }
  | { type: 'AI_SPEECH_START'; text: string; senderId: string }
  | { type: 'AI_SPEECH_END' }
  | { type: 'INTERRUPT'; senderId: string };

export interface RoomPeer {
  id: string;
  name: string;
  isHost: boolean;
  volts: number;
}
