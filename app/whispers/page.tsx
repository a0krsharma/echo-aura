"use client";

import { useState } from "react";
import { Mic2, Lock, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";

export default function WhispersPage() {
  const { user } = useAuth();
  const [showNewWhisper, setShowNewWhisper] = useState(false);
  const [searchHandle, setSearchHandle] = useState("");

  return (
    <div className="bg-black min-h-screen pb-24 md:pb-0 flex flex-col relative">
      {/* Top bar */}
      <header className="px-5 md:px-6 pt-10 pb-6 border-b border-neutral-900 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl italic text-white font-bold">Echo.</h1>
          <p className="font-mono text-xs tracking-widest text-neutral-500 uppercase mt-0.5">
            WHISPERS · PRIVATE FREQUENCY
          </p>
        </div>
        <button
          onClick={() => setShowNewWhisper(true)}
          className="font-mono text-xs tracking-widest uppercase border border-neutral-800 px-3 py-1.5 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> NEW WHISPER
        </button>
      </header>

      {/* Main Inbox Container */}
      <main className="max-w-xl mx-auto w-full px-5 md:px-6 pt-8 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 border border-neutral-900 p-8">
          <Lock className="w-8 h-8 text-neutral-700 mx-auto" />
          <div className="space-y-1">
            <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
              NO PRIVATE WHISPERS YET.
            </p>
            <p className="font-serif italic text-neutral-700 text-sm">
              Start an encrypted 1-on-1 audio frequency with any voice on the network.
            </p>
          </div>
          <button
            onClick={() => setShowNewWhisper(true)}
            className="px-5 py-2.5 border border-white text-white font-mono text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
          >
            [ + START A WHISPER ]
          </button>
        </div>
      </main>

      {/* New Whisper Modal */}
      {showNewWhisper && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-neutral-800 bg-black p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
                // START PRIVATE WHISPER
              </span>
              <button onClick={() => setShowNewWhisper(false)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-neutral-800 py-2">
              <Search className="w-4 h-4 text-neutral-600" />
              <input
                type="text"
                value={searchHandle}
                onChange={(e) => setSearchHandle(e.target.value)}
                placeholder="TYPE @HANDLE..."
                className="w-full bg-transparent border-none outline-none font-mono text-xs text-white placeholder-neutral-700 tracking-widest"
              />
            </div>

            <p className="font-mono text-[10px] text-neutral-700 tracking-widest uppercase py-4 text-center">
              ENTER AN AUTHENTICATED HANDLE TO INITIATE A PRIVATE FREQUENCY
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
