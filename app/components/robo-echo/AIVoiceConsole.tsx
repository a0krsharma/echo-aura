'use client';

import React, { useState } from 'react';
import { useEchoProofVoiceChat, ChatState } from '@/app/hooks/useEchoProofVoiceChat';
import { Mic, MicOff, Square, Zap, MessageSquare } from 'lucide-react';

const STATE_BADGE: Record<ChatState, { label: string; color: string }> = {
  idle:        { label: '○ READY',            color: 'border-neutral-800 bg-neutral-900 text-neutral-400' },
  listening:   { label: '● LISTENING',        color: 'border-emerald-500 bg-emerald-950/80 text-emerald-400' },
  thinking:    { label: '◐ GENERATING…',      color: 'border-amber-500 bg-amber-950/80 text-amber-400 animate-pulse' },
  talking:     { label: '● SPEAKING',         color: 'border-purple-500 bg-purple-950/80 text-purple-400 animate-pulse' },
  interrupted: { label: '⚠ BARGE-IN',        color: 'border-red-500 bg-red-950/80 text-red-400' },
};

/**
 * AIVoiceConsole
 * ──────────────
 * Hands-free echo-proof AI chat console with 3-layer echo suppression:
 * 1. Hardware AEC via getUserMedia
 * 2. Software transcript cross-match
 * 3. Sustained speech guard (≥2 words)
 *
 * Connects to /api/chat (Gemini 2.5 Flash Edge streaming).
 */
export default function AIVoiceConsole() {
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [textInput, setTextInput] = useState('');

  const {
    isActive, caption, startSession, stopSession, interrupt, sendPromptToLLM,
  } = useEchoProofVoiceChat(setChatState);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendPromptToLLM(textInput.trim());
    setTextInput('');
  };

  const badge = STATE_BADGE[chatState];

  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden font-mono text-neutral-100 shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-900 flex items-center justify-between bg-neutral-900/60">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold tracking-widest text-neutral-300">GEMINI 2.5 FLASH // LIVE VOICE</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Caption / Transcript */}
      <div className="px-4 py-3 min-h-[48px] flex items-center border-b border-neutral-900 bg-black/30">
        <span className="text-xs text-emerald-400 truncate leading-relaxed">{caption}</span>
      </div>

      {/* Text Input fallback */}
      <form onSubmit={handleTextSubmit} className="px-4 py-3 border-b border-neutral-900 flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          placeholder="Type a message to Robo-Echo…"
          disabled={isActive && chatState === 'listening'}
          className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-neutral-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || chatState === 'thinking'}
          className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-xs font-bold rounded-lg transition flex items-center gap-1"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask
        </button>
      </form>

      {/* Controls */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 bg-neutral-900/40">
        <div className="flex items-center gap-2">
          {/* Barge-in interrupt button shown while talking */}
          {chatState === 'talking' && (
            <button
              onClick={interrupt}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500 text-red-300 text-xs font-bold uppercase rounded-lg transition flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              Interrupt
            </button>
          )}
          <p className="text-[10px] text-neutral-500 leading-relaxed max-w-[200px]">
            {isActive
              ? 'Speak to interrupt Echo while it talks.'
              : 'Start hands-free or type a message.'}
          </p>
        </div>

        <button
          onClick={isActive ? stopSession : startSession}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-xs uppercase tracking-wide rounded-lg transition ${
            isActive
              ? 'bg-red-500 hover:bg-red-400 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          }`}
        >
          {isActive ? <><MicOff className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Start Voice</>}
        </button>
      </div>

      {/* Echo guard indicator */}
      <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-900 flex gap-4 text-[9px] text-neutral-600">
        <span>🔵 Layer 1: HW AEC</span>
        <span>🟢 Layer 2: Echo Gate</span>
        <span>🟡 Layer 3: Speech Guard</span>
      </div>
    </div>
  );
}
