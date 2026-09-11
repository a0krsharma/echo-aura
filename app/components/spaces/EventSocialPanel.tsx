"use client";

/**
 * app/components/spaces/EventSocialPanel.tsx
 * ─────────────────────────────────────────────────────
 * Interactive Event Side Panel (Remo / Gather Fidelity from Image 1):
 * - Q&A Tab with question upvoting (e.g. 65 votes, 23 votes)
 * - Polls Tab with real-time percentage progress bars & voting
 * - Chat Tab (Room chat + Table whisper chat)
 * - Participants Directory with table assignment badges
 */

import React, { useState } from "react";
import {
  MessageSquare,
  Users,
  HelpCircle,
  BarChart2,
  ThumbsUp,
  Send,
  X,
  Sparkles,
  Check,
  Plus,
  Radio,
  Lock,
  Mic,
  MicOff,
} from "lucide-react";
import { EventQAQuestion, EventPoll, SpatialAvatar } from "@/lib/spaces";
import { spacesSfx } from "@/lib/spacesSfx";

export type EventPanelTab = "chat" | "participants" | "qa" | "polls";

interface EventSocialPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: EventPanelTab;
  onTabChange: (tab: EventPanelTab) => void;
  localAvatar: SpatialAvatar;
  remoteAvatars: SpatialAvatar[];
  isHost: boolean;
  onSendChat: (text: string) => void;
}

export function EventSocialPanel({
  isOpen,
  onClose,
  currentTab,
  onTabChange,
  localAvatar,
  remoteAvatars,
  isHost,
  onSendChat,
}: EventSocialPanelProps) {
  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatScope, setChatScope] = useState<"room" | "table">("room");
  const [messages, setMessages] = useState<{
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    scope: "room" | "table";
  }[]>([
    {
      id: "m_1",
      sender: "Sophia Gilbert",
      text: "Welcome everyone to Igniting Creativity! Feel free to post your questions in the Q&A tab.",
      timestamp: Date.now() - 1000 * 60 * 8,
      scope: "room",
    },
    {
      id: "m_2",
      sender: "Samuel Lee",
      text: "Great to see everyone seated at the tables. We will begin the keynote in 2 minutes!",
      timestamp: Date.now() - 1000 * 60 * 3,
      scope: "room",
    },
  ]);

  // Q&A State (Matches Image 1 exactly!)
  const [qaQuestions, setQaQuestions] = useState<EventQAQuestion[]>([
    {
      id: "qa_1",
      authorName: "Alex Rivera",
      text: "How do I find potential collaborators in my creative field?",
      upvotes: 65,
      hasUpvoted: false,
      timestamp: Date.now() - 1000 * 60 * 15,
      isAnswered: false,
    },
    {
      id: "qa_2",
      authorName: "Maya Patel",
      text: "What are some strategies to overcome creative burnout?",
      upvotes: 23,
      hasUpvoted: false,
      timestamp: Date.now() - 1000 * 60 * 11,
      isAnswered: true,
    },
    {
      id: "qa_3",
      authorName: "Devon Clark",
      text: "How can I effectively pitch my creative ideas to potential investors?",
      upvotes: 22,
      hasUpvoted: false,
      timestamp: Date.now() - 1000 * 60 * 9,
      isAnswered: false,
    },
    {
      id: "qa_4",
      authorName: "Samantha Chen",
      text: "Can I leverage social media to enhance my creative brand? And how?",
      upvotes: 17,
      hasUpvoted: false,
      timestamp: Date.now() - 1000 * 60 * 6,
      isAnswered: false,
    },
    {
      id: "qa_5",
      authorName: "Jordan Hayes",
      text: "Can you provide tips for pricing creative services or products?",
      upvotes: 5,
      hasUpvoted: false,
      timestamp: Date.now() - 1000 * 60 * 2,
      isAnswered: false,
    },
  ]);
  const [questionInput, setQuestionInput] = useState("");

  // Polls State (Image 1 Fidelity)
  const [activePoll, setActivePoll] = useState<EventPoll>({
    id: "poll_1",
    question: "Which creative stage do you find most challenging?",
    totalVotes: 86,
    options: [
      { id: "opt_1", text: "Ideation & Concept Generation", votes: 18 },
      { id: "opt_2", text: "Execution & Prototyping", votes: 42 },
      { id: "opt_3", text: "Overcoming Burnout / Slumps", votes: 21 },
      { id: "opt_4", text: "Pricing & Client Pitching", votes: 5 },
    ],
  });
  const [userVotedOpt, setUserVotedOpt] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    spacesSfx.playKeyNote(1);
    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: localAvatar.handle,
      text: chatInput.trim(),
      timestamp: Date.now(),
      scope: chatScope,
    };
    setMessages((prev) => [...prev, newMsg]);
    onSendChat(chatInput.trim());
    setChatInput("");
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    spacesSfx.playKeyNote(4);
    const newQ: EventQAQuestion = {
      id: `q_${Date.now()}`,
      authorName: localAvatar.handle,
      text: questionInput.trim(),
      upvotes: 1,
      hasUpvoted: true,
      timestamp: Date.now(),
      isAnswered: false,
    };
    setQaQuestions((prev) => [newQ, ...prev]);
    setQuestionInput("");
  };

  const handleUpvoteQuestion = (qId: string) => {
    spacesSfx.playFocusBell();
    setQaQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const nextUp = q.hasUpvoted ? q.upvotes - 1 : q.upvotes + 1;
          return { ...q, upvotes: nextUp, hasUpvoted: !q.hasUpvoted };
        }
        return q;
      })
    );
  };

  const handleVotePoll = (optId: string) => {
    if (userVotedOpt) return;
    spacesSfx.playKeyNote(5);
    setUserVotedOpt(optId);
    setActivePoll((prev) => ({
      ...prev,
      totalVotes: prev.totalVotes + 1,
      options: prev.options.map((opt) =>
        opt.id === optId ? { ...opt, votes: opt.votes + 1 } : opt
      ),
    }));
  };

  // Participant list combining local + remote
  const allAttendees = [localAvatar, ...remoteAvatars];

  return (
    <div className="fixed top-14 right-0 bottom-0 z-40 w-80 sm:w-96 bg-neutral-950/95 border-l border-neutral-800 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Tab Navigation Header (Image 1 top right: Chat, Participants, Q&A, Polls) */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 shrink-0">
        <div className="flex items-center gap-1">
          {[
            { id: "chat" as EventPanelTab, label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: "participants" as EventPanelTab, label: "People", count: allAttendees.length, icon: <Users className="w-3.5 h-3.5" /> },
            { id: "qa" as EventPanelTab, label: "Q&A", count: qaQuestions.length, icon: <HelpCircle className="w-3.5 h-3.5" /> },
            { id: "polls" as EventPanelTab, label: "Polls", icon: <BarChart2 className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  spacesSfx.playKeyNote(2);
                  onTabChange(tab.id);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isSelected ? "bg-black/20 text-black font-black" : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 1. Q&A TAB CONTENT (Image 1 Fidelity) ── */}
      {currentTab === "qa" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Ask Question Form */}
          <form onSubmit={handleAskQuestion} className="p-3 border-b border-neutral-800/80 bg-neutral-900/30">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Ask the speakers a question..."
                className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>Ask</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[10px] font-mono text-neutral-500 mt-1.5 px-1">
              💡 Upvote questions you want answered live on stage!
            </div>
          </form>

          {/* Question List sorted by upvotes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {[...qaQuestions]
              .sort((a, b) => b.upvotes - a.upvotes)
              .map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-start gap-3"
                >
                  {/* Upvote Pill Button */}
                  <button
                    onClick={() => handleUpvoteQuestion(q.id)}
                    className={`flex flex-col items-center justify-center w-11 py-1.5 rounded-xl border font-mono transition-all cursor-pointer shrink-0 ${
                      q.hasUpvoted
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                        : "bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600"
                    }`}
                    title="Upvote this question"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${q.hasUpvoted ? "text-cyan-400 fill-cyan-400/30" : ""}`} />
                    <span className="text-xs font-black">{q.upvotes}</span>
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-neutral-400 font-semibold">{q.authorName}</span>
                      {q.isAnswered ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold">
                          ✓ Answered Live
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-neutral-500">Open</span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-white leading-relaxed">{q.text}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 2. POLLS TAB CONTENT ── */}
      {currentTab === "polls" && (
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="p-4 rounded-3xl bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                Active Live Poll
              </span>
              <span className="text-[11px] font-mono text-neutral-400">{activePoll.totalVotes} votes</span>
            </div>

            <h4 className="text-sm font-bold font-mono text-white leading-snug">{activePoll.question}</h4>

            {/* Poll Options */}
            <div className="space-y-2 pt-1">
              {activePoll.options.map((opt) => {
                const percent = Math.round((opt.votes / Math.max(1, activePoll.totalVotes)) * 100);
                const isSelected = userVotedOpt === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVotePoll(opt.id)}
                    className={`relative w-full p-3 rounded-2xl border text-left font-mono transition-all overflow-hidden cursor-pointer ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/30"
                        : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                    }`}
                  >
                    {/* Background fill percentage bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-cyan-500/15 transition-all duration-500 pointer-events-none"
                      style={{ width: `${percent}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{opt.text}</span>
                      <span className="text-xs font-black text-cyan-300 ml-2">{percent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CHAT TAB CONTENT ── */}
      {currentTab === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Room vs Table Scope Selector */}
          <div className="p-2 border-b border-neutral-800/80 flex items-center gap-1.5 bg-neutral-900/40">
            <button
              onClick={() => setChatScope("room")}
              className={`flex-1 py-1 rounded-xl text-center font-mono text-[11px] font-bold transition cursor-pointer ${
                chatScope === "room"
                  ? "bg-neutral-800 text-cyan-300 border border-neutral-700"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              🌐 Entire Room
            </button>
            <button
              onClick={() => setChatScope("table")}
              className={`flex-1 py-1 rounded-xl text-center font-mono text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                chatScope === "table"
                  ? "bg-neutral-800 text-amber-300 border border-neutral-700"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              <span>My Table Only</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages
              .filter((m) => chatScope === "room" || m.scope === "table")
              .map((msg) => (
                <div key={msg.id} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-cyan-400">{msg.sender}</span>
                    <span className="text-[9px] font-mono text-neutral-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-neutral-200 leading-relaxed bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/60">
                    {msg.text}
                  </p>
                </div>
              ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 bg-neutral-900/40 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={chatScope === "room" ? "Send to entire room..." : "Whisper to my table..."}
              className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── 4. PARTICIPANTS DIRECTORY TAB CONTENT ── */}
      {currentTab === "participants" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase text-neutral-400 px-2 py-1">
            Seated & Active In Room ({allAttendees.length})
          </div>

          {allAttendees.map((att, idx) => {
            const tableNum = (idx % 6) + 1;
            return (
              <div
                key={att.uid || idx}
                className="p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {/* Circular Avatar with glowing halo (Image Fidelity) */}
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-400/80 shadow-md shadow-emerald-400/20 bg-neutral-800 flex items-center justify-center text-xs font-bold text-white">
                    {att.avatarUrl ? (
                      <img src={att.avatarUrl} alt={att.handle} className="w-full h-full object-cover" />
                    ) : (
                      <span>{att.handle.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-white leading-tight">{att.handle}</div>
                    <div className="text-[10px] font-mono text-neutral-400 leading-tight">
                      Seated at Table {tableNum}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-mono text-cyan-300 border border-neutral-700">
                    Table #{tableNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
