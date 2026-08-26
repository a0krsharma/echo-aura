'use client';

import { useState, useCallback } from 'react';
import { memoryDB, MemoryNode } from '../utils/episodicMemoryDB';
import { useWakeWordDetector } from './useWakeWordDetector';

export function useEchoCompanionBrain(onSpeechStart?: (text: string) => void) {
  const [isAwake, setIsAwake] = useState(false);
  const [retrievedMemories, setRetrievedMemories] = useState<MemoryNode[]>([]);
  const [activeCaption, setActiveCaption] = useState('STANDBY // Say "Hey Echo" or tap Wake.');

  // 1. Wake Event Handler
  const handleWake = useCallback(() => {
    setIsAwake(true);
    setActiveCaption('⚡ ECHO AWAKE: Listening for your voice...');

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const ping = new SpeechSynthesisUtterance('Haan bolo, main sun raha hoon!');
      ping.pitch = 1.3;
      ping.rate = 1.2;
      window.speechSynthesis.speak(ping);
    }
  }, []);

  const { isListening: isWakeWordActive, startWakeWordListener, stopWakeWordListener } = useWakeWordDetector(handleWake);

  // 2. Memory-Augmented Conversational Query
  const processUserSpeech = useCallback(
    async (userInput: string) => {
      const cleanInput = userInput.trim();
      if (!cleanInput) return;

      setActiveCaption(`You: "${cleanInput}"`);

      // 1. Retrieve top-3 relevant memories from IndexedDB
      const memories = await memoryDB.retrieveRelevantMemories(cleanInput, 3);
      setRetrievedMemories(memories);

      const memoryContext = memories.map((m) => `- ${m.fact} [Valence: ${m.valence}]`).join('\n');

      // 2. Call Edge LLM with Memory Augmentation
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `[EPISODIC MEMORIES OF USER]:\n${memoryContext || 'No previous memories yet.'}\n\n[USER SAYS]: ${cleanInput}`,
              },
            ],
          }),
        });

        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          fullReply += decoder.decode(value, { stream: true });
        }

        if (onSpeechStart) {
          onSpeechStart(fullReply);
        }
        setActiveCaption(`Echo: "${fullReply}"`);

        // Speak response out loud
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const utt = new SpeechSynthesisUtterance(fullReply);
          utt.pitch = 1.25;
          utt.rate = 1.1;
          window.speechSynthesis.speak(utt);
        }

        // 3. Extract and save new personal memories if significant
        const lower = cleanInput.toLowerCase();
        if (lower.includes('i like') || lower.includes('mujhe') || lower.includes('my favorite') || lower.includes('mera favorite')) {
          await memoryDB.addMemory(cleanInput, 'preference', 'positive');
        } else if (lower.includes('sad') || lower.includes('stressed') || lower.includes('anxious') || lower.includes('pareshan') || lower.includes('tension')) {
          await memoryDB.addMemory(cleanInput, 'emotion', 'vulnerable');
        } else if (lower.includes('my friend') || lower.includes('dost') || lower.includes('girlfriend') || lower.includes('boyfriend') || lower.includes('mom') || lower.includes('dad')) {
          await memoryDB.addMemory(cleanInput, 'relationship', 'neutral');
        } else if (lower.includes('i want to') || lower.includes('my goal') || lower.includes('karna hai') || lower.includes('banna hai')) {
          await memoryDB.addMemory(cleanInput, 'goal', 'positive');
        }
      } catch (err) {
        console.error('Brain processing failed:', err);
        setActiveCaption('Echo: Connection error. Try again!');
      }
    },
    [onSpeechStart]
  );

  return {
    isAwake,
    isWakeWordActive,
    retrievedMemories,
    activeCaption,
    startWakeWordListener,
    stopWakeWordListener,
    processUserSpeech,
    setIsAwake,
  };
}
