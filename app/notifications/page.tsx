"use client";

import React, { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const [filter, setFilter] = useState("ALL");

  const filterTabs = ["ALL", "PULSES", "REVERBS", "ORBITERS", "STAGE"];

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white">Echo.</span>
        <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">NOTIFICATIONS</span>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest text-neutral-500">// NOTIFICATIONS</p>
          <button className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
            <CheckCheck className="w-3 h-3" /> MARK ALL AS READ
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-6 border-b border-neutral-900 pb-3 min-w-max font-mono text-xs tracking-widest">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`transition-colors cursor-pointer ${
                  filter === tab ? "text-white font-bold border-b border-white" : "text-neutral-600 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Real / Empty State */}
        <div className="py-20 text-center space-y-4 border border-neutral-900 p-8">
          <Bell className="w-8 h-8 text-neutral-700 mx-auto" />
          <div className="space-y-1">
            <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
              NO {filter} NOTIFICATIONS YET.
            </p>
            <p className="font-serif italic text-neutral-700 text-sm">
              Activity on your echoes and reverbs will appear here in real time.
            </p>
          </div>
        </div>

        <p className="font-mono text-[10px] text-neutral-800 text-center tracking-widest uppercase pt-6">
          NOTIFICATIONS ARE PURGED AFTER 30 DAYS
        </p>
      </main>
    </div>
  );
}
