"use client";

/**
 * app/notifications/page.tsx
 * ─────────────────────────────────────────────────────
 * Real-time Firestore notifications for pulses, reverbs, orbiters, stage events.
 */

import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, ArrowUp, Repeat2, RefreshCw, Swords, Mic2, Loader2, Hand, Users, LogOut, Mic, MicOff, AtSign, Star } from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import {
  subscribeToNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type EchoNotification,
} from "@/lib/notifications";
import Link from "next/link";

// ─── Notification icon by type ────────────────────────────────────────────────
function NotifIcon({ type }: { type: EchoNotification["type"] }) {
  const cls = "w-3.5 h-3.5";
  if (type === "pulse")       return <ArrowUp    className={cls} />;
  if (type === "reverb")      return <Repeat2    className={cls} />;
  if (type === "orbiter")     return <RefreshCw  className={cls} />;
  if (type === "stage")       return <Swords     className={cls} />;
  if (type === "whisper" || type === "wire")     return <Mic2       className={cls} />;
  if (type === "raise_hand")  return <Hand       className={cls} />;
  if (type === "room_join")   return <Users      className={cls} />;
  if (type === "room_leave")  return <LogOut     className={cls} />;
  if (type === "room_promote")return <Mic        className={cls} />;
  if (type === "room_demote")return <MicOff     className={cls} />;
  if (type === "mention")     return <AtSign     className={cls} />;
  if (type === "bookmark")    return <Star       className={cls} />;
  return <Bell className={cls} />;
}

// ─── Label ───────────────────────────────────────────────────────────────────
function typeLabel(type: EchoNotification["type"]): string {
  if (type === "pulse")        return "[ PULSE ] YOUR ECHO";
  if (type === "reverb")       return "[ REPLY ] ON YOUR ECHO";
  if (type === "orbiter")      return "[ ORBIT ] YOUR ECHO";
  if (type === "stage")        return "CHALLENGED YOU TO [ STAGE ]";
  if (type === "whisper" || type === "wire")      return "SENT YOU A [ WIRE ]";
  if (type === "raise_hand")   return "RAISED HAND IN YOUR ROOM";
  if (type === "room_join")    return "JOINED YOUR ROOM";
  if (type === "room_leave")   return "LEFT YOUR ROOM";
  if (type === "room_promote") return "PROMOTED TO SPEAKER";
  if (type === "room_demote") return "DEMOTED FROM SPEAKER";
  if (type === "mention")      return "MENTIONED YOU";
  if (type === "bookmark")     return "BOOKMARKED YOUR ROOM";
  return "INTERACTED WITH YOU";
}

// ─── Time ────────────────────────────────────────────────────────────────────
function timeAgo(ts: any): string {
  if (!ts?.seconds) return "";
  const diff = Date.now() / 1000 - ts.seconds;
  if (diff < 60)    return "JUST NOW";
  if (diff < 3600)  return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

const TABS = ["ALL", "[ PULSE ]", "[ REPLIES ]", "[ ORBIT ]", "[ STAGE ]"] as const;
type Tab = typeof TABS[number];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [filter,   setFilter]   = useState<Tab>("ALL");
  const [notifs,   setNotifs]   = useState<EchoNotification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [marking,  setMarking]  = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const unsub = subscribeToNotifications(user.uid, (items) => {
      setNotifs(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleMarkAll = async () => {
    if (!user || marking) return;
    setMarking(true);
    await markAllNotificationsRead(user.uid);
    setMarking(false);
  };

  const handleMarkOne = async (notif: EchoNotification) => {
    if (!user || notif.read) return;
    await markNotificationRead(user.uid, notif.id);
  };

  // Filter by tab
  const filtered = notifs.filter((n) => {
    if (filter === "ALL")         return true;
    if (filter === "[ PULSE ]")   return n.type === "pulse";
    if (filter === "[ REPLIES ]") return n.type === "reverb";
    if (filter === "[ ORBIT ]")   return n.type === "orbiter";
    if (filter === "[ STAGE ]")   return n.type === "stage";
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-5 pt-10 pb-6 border-b border-neutral-900">
        <span className="font-serif text-xl font-bold text-white italic">Echo.</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest uppercase text-neutral-500">[ NOTIFS ]</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-black font-mono text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest text-neutral-700 uppercase">// [ NOTIFS ]</p>
            {unreadCount > 0 && (
              <p className="font-mono text-[10px] text-white tracking-widest mt-0.5">
                {unreadCount} UNREAD
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={marking}
              className="font-mono text-[10px] tracking-widest uppercase text-neutral-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-30"
            >
              {marking
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CheckCheck className="w-3 h-3" />
              }
              MARK ALL READ
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-0 border-b border-neutral-900 min-w-max font-mono text-xs tracking-widest">
            {TABS.map((tab) => {
              const count = tab === "ALL"
                ? notifs.length
                : notifs.filter((n) =>
                    tab === "[ PULSE ]"   ? n.type === "pulse"   :
                    tab === "[ REPLIES ]" ? n.type === "reverb"  :
                    tab === "[ ORBIT ]"   ? n.type === "orbiter" :
                    tab === "[ STAGE ]"   ? n.type === "stage"   : true
                  ).length;

              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`pb-3 px-4 uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    filter === tab
                      ? "border-b-2 border-white text-white font-bold"
                      : "text-neutral-600 hover:text-white"
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className="ml-1 text-neutral-700">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3 font-mono text-xs text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            LOADING NOTIFICATIONS...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4 border border-neutral-900 p-8">
            <Bell className="w-8 h-8 text-neutral-700 mx-auto" />
            <div className="space-y-1">
              <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase">
                NO {filter === "ALL" ? "" : filter + " "}NOTIFICATIONS YET.
              </p>
              <p className="font-serif italic text-neutral-700 text-sm">
                Activity on your echoes and reverbs will appear here in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-900 border border-neutral-900">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkOne(notif)}
                className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-neutral-950 ${
                  !notif.read ? "bg-neutral-950/50" : ""
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1 shrink-0 flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      !notif.read ? "bg-white" : "bg-transparent"
                    }`}
                  />
                  <div className="w-7 h-7 border border-neutral-800 flex items-center justify-center text-neutral-400">
                    <NotifIcon type={notif.type} />
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white tracking-widest">
                      {notif.fromHandle}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">
                      {typeLabel(notif.type)}
                    </span>
                  </div>

                  {notif.postCaption && (
                    <p className="font-mono text-neutral-500 text-sm leading-snug truncate">
                      "{notif.postCaption}"
                    </p>
                  )}

                  <p className="font-mono text-[10px] text-neutral-700 tracking-widest">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>

                {/* Action for whispers */}
                {(notif.type === "whisper" || notif.type === "wire") && (
                  <Link
                  href="/wire"
                    className="shrink-0 font-mono text-[10px] border border-neutral-800 px-2 py-1 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    REPLY
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {notifs.length > 0 && (
          <p className="font-mono text-[10px] text-neutral-800 text-center tracking-widest uppercase pt-2">
            NOTIFICATIONS ARE PURGED AFTER 30 DAYS
          </p>
        )}
      </main>
    </div>
  );
}
