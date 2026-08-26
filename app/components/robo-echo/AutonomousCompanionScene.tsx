'use client';

import React, { useState, useEffect } from 'react';
import { useEchoCompanionBrain } from '@/app/hooks/useEchoCompanionBrain';
import { memoryDB, MemoryNode } from '@/app/utils/episodicMemoryDB';
import { Mic, MicOff, Brain, Sparkles, Trash2, Send, Heart, Target, Smile, AlertCircle } from 'lucide-react';

export default function AutonomousCompanionScene() {
  const [inputText, setInputText] = useState('');
  const [allMemories, setAllMemories] = useState<MemoryNode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    isAwake,
    isWakeWordActive,
    retrievedMemories,
    activeCaption,
    startWakeWordListener,
    stopWakeWordListener,
    processUserSpeech,
    setIsAwake,
  } = useEchoCompanionBrain((text) => {
    refreshMemories();
  });

  const refreshMemories = async () => {
    try {
      setIsRefreshing(true);
      const mems = await memoryDB.getAllMemories();
      mems.sort((a, b) => b.timestamp - a.timestamp);
      setAllMemories(mems);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshMemories();
  }, [retrievedMemories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsAwake(true);
    processUserSpeech(inputText);
    setInputText('');
  };

  const handleClearMemories = async () => {
    if (confirm('Clear all stored episodic memories for Robo-Echo?')) {
      await memoryDB.clearAllMemories();
      await refreshMemories();
    }
  };

  const getCategoryIcon = (category: MemoryNode['category']) => {
    switch (category) {
      case 'preference': return <Heart className="w-3 h-3 text-pink-400" />;
      case 'emotion': return <Smile className="w-3 h-3 text-amber-400" />;
      case 'goal': return <Target className="w-3 h-3 text-emerald-400" />;
      case 'relationship': return <Sparkles className="w-3 h-3 text-cyan-400" />;
      default: return <Brain className="w-3 h-3 text-purple-400" />;
    }
  };

  const getValenceBadge = (valence: MemoryNode['valence']) => {
    switch (valence) {
      case 'vulnerable':
        return 'border-amber-500/50 bg-amber-950/60 text-amber-300';
      case 'positive':
        return 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300';
      default:
        return 'border-neutral-700 bg-neutral-900 text-neutral-400';
    }
  };

  return (
    <div className="w-full bg-black border border-neutral-800 rounded-2xl overflow-hidden font-mono text-neutral-100 shadow-2xl flex flex-col">
      {/* Top HUD */}
      <div className="p-4 border-b border-neutral-900 bg-neutral-950 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black tracking-wider text-neutral-200 uppercase">
                EPISODIC VECTOR MEMORY & WAKE WORD ENGINE
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-400 font-bold uppercase">
                RAG // INDEXEDDB
              </span>
            </div>
            <p className="text-[10px] text-neutral-500">Persistent Long-Term Memory • "Hey Echo" Spectral Formant Detection</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isWakeWordActive ? (
            <button
              onClick={stopWakeWordListener}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500 text-red-300 text-xs font-bold uppercase rounded-xl transition"
            >
              <MicOff className="w-3.5 h-3.5" />
              Stop Wake Word
            </button>
          ) : (
            <button
              onClick={startWakeWordListener}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              <Mic className="w-3.5 h-3.5" />
              Enable "Hey Echo" 🎙️
            </button>
          )}

          <button
            onClick={() => setIsAwake(!isAwake)}
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-xl border transition ${
              isAwake
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isAwake ? '⚡ AWAKE' : '💤 ASLEEP'}
          </button>
        </div>
      </div>

      {/* Main Grid: Live Subtitles + Memory Explorer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Left: Live Conversation & Input */}
        <div className="md:col-span-7 p-4 border-b md:border-b-0 md:border-r border-neutral-900 flex flex-col justify-between gap-4 bg-neutral-950/40">
          <div>
            <div className="text-[10px] text-neutral-500 font-bold mb-2 flex items-center justify-between">
              <span>// ACTIVE CONVERSATIONAL CAPTION</span>
              <span className={isWakeWordActive ? "text-emerald-400 animate-pulse" : "text-neutral-600"}>
                {isWakeWordActive ? "● FORMANT SCANNING ACTIVE" : "○ WAKE WORD OFF"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black border border-neutral-800/80 min-h-[70px] flex items-center">
              <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                {activeCaption}
              </p>
            </div>
          </div>

          {/* Context Injection Highlight */}
          {retrievedMemories.length > 0 && (
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400">
                <Sparkles className="w-3 h-3" />
                <span>MEMORIES INJECTED INTO SYSTEM PROMPT:</span>
              </div>
              <div className="space-y-1">
                {retrievedMemories.map((m) => (
                  <div key={m.id} className="text-[11px] text-neutral-300 flex items-center gap-2">
                    <span className="text-purple-400 font-bold">↳</span>
                    <span className="truncate">"{m.fact}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Chat Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tell Echo: 'I like cold coffee', 'I am stressed about exams'..."
              className="flex-1 bg-black border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 placeholder-neutral-600"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Store
            </button>
          </form>
        </div>

        {/* Right: Episodic Memory Graph Explorer */}
        <div className="md:col-span-5 p-4 flex flex-col gap-3 bg-neutral-950">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>SAVED MEMORY GRAPH ({allMemories.length})</span>
            </span>
            {allMemories.length > 0 && (
              <button
                onClick={handleClearMemories}
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[220px] space-y-2 pr-1 no-scrollbar">
            {allMemories.length === 0 ? (
              <div className="p-4 rounded-xl border border-neutral-900 bg-neutral-900/30 text-center text-xs text-neutral-600">
                No episodic memories stored yet. Mention your preferences, feelings, or friends to build Echo's memory!
              </div>
            ) : (
              allMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="p-2.5 rounded-xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition space-y-1"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="flex items-center gap-1 font-bold uppercase text-neutral-300">
                      {getCategoryIcon(mem.category)}
                      {mem.category}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase ${getValenceBadge(mem.valence)}`}>
                      {mem.valence}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-200 leading-snug">"{mem.fact}"</p>
                  <div className="text-[9px] text-neutral-500">
                    {new Date(mem.timestamp).toLocaleDateString()} at {new Date(mem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
