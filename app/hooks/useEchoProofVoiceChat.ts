'use client';

import { useState, useRef, useCallback } from 'react';
import { useAECMicrophone } from './useAECMicrophone';

export type ChatState = 'idle' | 'listening' | 'thinking' | 'talking' | 'interrupted';

/** Returns true if user transcript is the bot's own voice leaking back */
function isSelfEcho(userTranscript: string, botSpokenText: string): boolean {
  if (!botSpokenText || !userTranscript) return false;
  const cleanUser = userTranscript.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const cleanBot  = botSpokenText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  if (cleanBot.includes(cleanUser) && cleanUser.length > 3) return true;
  const userWords = cleanUser.split(/\s+/);
  const botWords  = new Set(cleanBot.split(/\s+/));
  const matched   = userWords.filter(w => botWords.has(w));
  return matched.length / userWords.length > 0.65;
}

export function useEchoProofVoiceChat(onStateChange: (s: ChatState) => void) {
  const [isActive, setIsActive] = useState(false);
  const [caption, setCaption]   = useState('SYSTEM READY');

  const { startAECSession, stopAECSession } = useAECMicrophone();

  const recognitionRef           = useRef<any>(null);
  const abortControllerRef       = useRef<AbortController | null>(null);
  const currentBotUtteranceRef   = useRef('');
  const isSpeakingRef            = useRef(false);
  const speechQueueRef           = useRef<string[]>([]);
  const lastInterruptionTimeRef  = useRef(0);
  const conversationHistory      = useRef<{ role: string; content: string }[]>([]);
  const oscRef                   = useRef<OscillatorNode | null>(null);
  const audioCtxRef              = useRef<AudioContext | null>(null);

  // 1. Hard Cancel ─────────────────────────────────────────────────────────
  const interrupt = useCallback(() => {
    if (!isSpeakingRef.current && !abortControllerRef.current) return;
    const now = Date.now();
    if (now - lastInterruptionTimeRef.current < 300) return;
    lastInterruptionTimeRef.current = now;

    isSpeakingRef.current = false;
    currentBotUtteranceRef.current = '';
    speechQueueRef.current = [];

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();

    if (oscRef.current) {
      try { oscRef.current.stop(); oscRef.current.disconnect(); } catch {}
      oscRef.current = null;
    }

    onStateChange('interrupted');
    setCaption('// INTERRUPTED // Listening...');
    setTimeout(() => onStateChange('listening'), 350);
  }, [onStateChange]);

  // 2. Sequential Sentence Player ─────────────────────────────────────────
  const playNextSentence = useCallback(() => {
    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      currentBotUtteranceRef.current = '';
      onStateChange('listening');
      return;
    }

    isSpeakingRef.current = true;
    onStateChange('talking');
    const sentence = speechQueueRef.current.shift()!;
    currentBotUtteranceRef.current = sentence;
    setCaption(`Echo: "${sentence}"`);

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc     = ctx.createOscillator();
    const gain    = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.3;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    osc.connect(gain); gain.connect(analyser); analyser.connect(ctx.destination);
    oscRef.current = osc;

    const utt = new SpeechSynthesisUtterance(sentence);
    utt.pitch = 1.25; utt.rate = 1.1;
    utt.onstart  = () => { try { osc.start(); } catch {} };
    utt.onend    = () => { try { osc.stop(); } catch {} oscRef.current = null; currentBotUtteranceRef.current = ''; playNextSentence(); };
    utt.onerror  = () => { try { osc.stop(); } catch {} oscRef.current = null; playNextSentence(); };
    window.speechSynthesis.speak(utt);
  }, [onStateChange]);

  const enqueueSentence = useCallback((sentence: string) => {
    const clean = sentence.trim();
    if (!clean) return;
    speechQueueRef.current.push(clean);
    if (!isSpeakingRef.current) playNextSentence();
  }, [playNextSentence]);

  // 3. LLM Stream Fetch ────────────────────────────────────────────────────
  const sendPromptToLLM = useCallback(async (prompt: string) => {
    onStateChange('thinking');
    setCaption(`You: "${prompt}"`);
    conversationHistory.current.push({ role: 'user', content: prompt });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory.current }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullReply = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        buffer += token; fullReply += token;
        const match = buffer.match(/^([\s\S]*?[.?!।\n]+)([\s\S]*)$/);
        if (match) { enqueueSentence(match[1]); buffer = match[2]; }
      }
      if (buffer.trim()) enqueueSentence(buffer);
      conversationHistory.current.push({ role: 'model', content: fullReply });
    } catch (err: any) {
      if (err.name !== 'AbortError') enqueueSentence('Network glitch. Could you say that again?');
    } finally {
      abortControllerRef.current = null;
    }
  }, [enqueueSentence, onStateChange]);

  // 4. Speech Recognition Loop with 3-layer Echo Guard ───────────────────
  const startSession = useCallback(async () => {
    if (typeof window === 'undefined') return;
    await startAECSession();

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) { alert('Use Chrome or Safari for Web Speech support.'); return; }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.onstart = () => onStateChange('listening');

    rec.onresult = (e: any) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      const raw = (interim || final).trim();
      if (!raw) return;

      // Layer 2: Software echo gate
      if (isSpeakingRef.current) {
        if (isSelfEcho(raw, currentBotUtteranceRef.current)) {
          console.log('🔇 ECHO FILTERED:', raw);
          return;
        }
        // Layer 3: Require ≥2 words or final result
        if (raw.split(/\s+/).length >= 2 || final.length > 0) {
          console.log('⚡ BARGE-IN:', raw);
          interrupt();
        }
      }

      if (final.trim() && !isSpeakingRef.current) sendPromptToLLM(final.trim());
    };

    rec.onerror = (e: any) => { if (e.error !== 'no-speech') console.warn('[EchoProof]', e.error); };
    rec.onend   = () => { if (recognitionRef.current) try { recognitionRef.current.start(); } catch {} };

    recognitionRef.current = rec;
    setIsActive(true);
    rec.start();
  }, [startAECSession, interrupt, onStateChange, sendPromptToLLM]);

  const stopSession = useCallback(() => {
    setIsActive(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    stopAECSession();
    interrupt();
    onStateChange('idle');
  }, [stopAECSession, interrupt, onStateChange]);

  return { isActive, caption, startSession, stopSession, interrupt, sendPromptToLLM };
}
