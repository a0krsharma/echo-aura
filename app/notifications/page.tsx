"use client";

export const dynamic = "force-dynamic";

/**
 * app/notifications/page.tsx
 * ─────────────────────────────────────────────────────
 * Real-time Firestore notifications for pulses, reverbs, orbiters, stage events.
 */

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  ArrowUp,
  Repeat2,
  RefreshCw,
  Swords,
  Mic2,
  Loader2,
  Hand,
  Users,
  LogOut,
  Mic,
  MicOff,
  AtSign,
  Star,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { useRouter } from "next/navigation";
import {
  subscribeToNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  clearAllNotifications,
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
  if (type === "room_demote") return <MicOff     className={cls} />;
  if (type === "mention")     return <AtSign     className={cls} />;
  if (type === "bookmark")    return <Star       className={cls} />;
  return <Bell className={cls} />;
}

// ─── Label ───────────────────────────────────────────────────────────────────
function typeLabel(type: EchoNotification["type"]): string {
  if (type === "pulse")        return "[ PULSE ] YOUR ECHO";
  if (type === "reverb")       return "[ REPLY ] ON YOUR ECHO";
  if (type === "orbiter")      return "[ ORBIT ] STARTED ORBITING YOU";
  if (type === "stage")        return "CHALLENGED YOU TO [ STAGE ]";
  if (type === "whisper" || type === "wire")      return "SENT YOU A [ WIRE ]";
  if (type === "raise_hand")   return "RAISED HAND IN YOUR ROOM";
  if (type === "room_join")    return "JOINED YOUR ROOM";
  if (type === "room_leave")   return "LEFT YOUR ROOM";
  if (type === "room_promote") return "PROMOTED TO SPEAKER";
  if (type === "room_demote")  return "DEMOTED FROM SPEAKER";
  if (type === "mention")      return "MENTIONED YOU";
  if (type === "bookmark")     return "BOOKMARKED YOUR ROOM";
  return "INTERACTED WITH YOU";
}

// ─── Time ────────────────────────────────────────────────────────────────────
function timeAgo(ts: any): string {
  if (!ts?.seconds) return "JUST NOW";
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
  const router = useRouter();
  const [filter,   setFilter]   = useState<Tab>("ALL");
  const [notifs,   setNotifs]   = useState<EchoNotification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [marking,  setMarking]  = useState(false);
  const [clearing, setClearing] = useState(false);

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

  const handleClearAll = async () => {
    if (!user || clearing || notifs.length === 0) return;
    if (!confirm("Are you sure you want to delete all notifications?")) return;
    setClearing(true);
    await clearAllNotifications(user.uid);
    setClearing(false);
  };

  const handleMarkOne = async (notif: EchoNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user || notif.read) return;
    await markNotificationRead(user.uid, notif.id);
  };

  const handleDeleteOne = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await deleteNotification(user.uid, notifId);
  };

  const handleItemClick = (notif: EchoNotification) => {
    handleMarkOne(notif);
    if (notif.roomId) {
      router.push(`/room/${notif.roomId}`);
    } else if (notif.type === "wire" || notif.type === "whisper") {
      router.push("/wire");
    } else if (notif.type === "stage") {
      router.push(notif.clashId ? `/stage/${notif.clashId}` : "/clash");
    } else if (notif.postId) {
      router.push(`/#${notif.postId}`);
    } else if (notif.type === "orbiter") {
      router.push(`/${notif.fromHandle.replace("@", "")}`);
    }
  };

  // Filter by tab accurately
  const filtered = notifs.filter((n) => {
    if (filter === "ALL")         return true;
    if (filter === "[ PULSE ]")   return n.type === "pulse";
    if (filter === "[ REPLIES ]") return n.type === "reverb" || n.type === "mention";
    if (filter === "[ ORBIT ]")   return n.type === "orbiter";
    if (filter === "[ STAGE ]")   return n.type === "stage" || n.type === "raise_hand" || n.type === "room_join" || n.type === "room_leave" || n.type === "room_promote";
    return true;
  });

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-6 w-full">
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              NOTIFICATIONS
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-white text-black text-[10px] font-bold">
                {unreadCount} NEW
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={marking}
                className="text-[10px] tracking-wider uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-white px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-30"
                title="Mark all notifications as read"
              >
                {marking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                <span>MARK ALL READ</span>
              </button>
            )}

            {notifs.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="text-[10px] tracking-wider uppercase text-neutral-500 hover:text-red-400 border border-neutral-900 hover:border-red-900 px-2.5 py-1 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-30"
                title="Delete all notifications"
              >
                {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                <span>CLEAR ALL</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-0 border-b border-neutral-900 min-w-max font-mono text-xs tracking-widest">
            {TABS.map((tab) => {
              const count = tab === "ALL"
                ? notifs.length
                : notifs.filter((n) =>
                    tab === "[ PULSE ]"   ? n.type === "pulse"   :
                    tab === "[ REPLIES ]" ? (n.type === "reverb" || n.type === "mention") :
                    tab === "[ ORBIT ]"   ? n.type === "orbiter" :
                    tab === "[ STAGE ]"   ? (n.type === "stage" || n.type === "raise_hand" || n.type === "room_join" || n.type === "room_leave" || n.type === "room_promote") : true
                  ).length;

              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`pb-3 px-4 uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    filter === tab
                      ? "border-b-2 border-white text-white font-bold"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className="ml-1 text-neutral-600 font-bold">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3 font-mono text-xs text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            LOADING REALTIME FEED...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4 border border-neutral-900 p-8">
            <Bell className="w-8 h-8 text-neutral-800 mx-auto" />
            <div className="space-y-1">
              <p className="font-mono text-xs text-neutral-400 tracking-widest uppercase">
                NO {filter === "ALL" ? "" : filter + " "}NOTIFICATIONS LOGGED
              </p>
              <p className="text-neutral-600 text-xs">
                Real-time activity from user orbits, pulses, reverbs &amp; stage events will appear here instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-900 border border-neutral-900">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`flex items-start justify-between gap-3 p-4 cursor-pointer transition-colors hover:bg-neutral-950/80 group ${
                  !notif.read ? "bg-neutral-950 border-l-2 border-l-white" : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Unread dot */}
                  <div className="mt-1 shrink-0 flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        !notif.read ? "bg-white animate-pulse" : "bg-transparent"
                      }`}
                    />
                    <div className="w-7 h-7 border border-neutral-800 flex items-center justify-center text-neutral-400">
                      <NotifIcon type={notif.type} />
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/${notif.fromHandle.replace("@", "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs text-white hover:underline tracking-widest font-bold"
                      >
                        {notif.fromHandle}
                      </Link>
                      <span className="font-mono text-[10px] text-neutral-500 uppercase">
                        {typeLabel(notif.type)}
                      </span>
                    </div>

                    {notif.text ? (
                      <p className="font-mono text-neutral-300 text-xs leading-snug">
                        {notif.text}
                      </p>
                    ) : notif.postCaption ? (
                      <p className="font-mono text-neutral-400 text-xs leading-snug truncate">
                        "{notif.postCaption}"
                      </p>
                    ) : null}

                    <p className="font-mono text-[9px] text-neutral-600 tracking-widest uppercase">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Mark as read single button */}
                  {!notif.read && (
                    <button
                      onClick={(e) => handleMarkOne(notif, e)}
                      className="p-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <Check size={12} />
                    </button>
                  )}

                  {/* 1-Click Action Redirects */}
                  {notif.postId && (
                    <Link
                      href={`/#${notif.postId}`}
                      className="font-mono text-[9px] border border-neutral-700 bg-white text-black font-bold px-2 py-1 uppercase tracking-wider hover:bg-neutral-200 transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMarkOne(notif); }}
                    >
                      [ 🎙 REPLY ]
                    </Link>
                  )}

                  {notif.roomId && !notif.postId && (
                    <Link
                      href={`/room/${notif.roomId}`}
                      className="font-mono text-[9px] border border-neutral-700 bg-white text-black font-bold px-2 py-1 uppercase tracking-wider hover:bg-neutral-200 transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMarkOne(notif); }}
                    >
                      [ 📻 ROOM ]
                    </Link>
                  )}

                  {notif.type === "stage" && (
                    <Link
                      href={notif.clashId ? `/stage/${notif.clashId}` : "/clash"}
                      className="font-mono text-[9px] border border-red-800 bg-red-950/60 text-red-300 font-bold px-2 py-1 uppercase tracking-wider hover:bg-red-900 hover:text-white transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMarkOne(notif); }}
                    >
                      [ ⚔️ JOIN DEBATE ]
                    </Link>
                  )}

                  {notif.type === "orbiter" && (
                    <Link
                      href={`/${notif.fromHandle.replace("@", "")}`}
                      className="font-mono text-[9px] border border-neutral-800 px-2 py-1 text-neutral-400 hover:border-white hover:text-white uppercase transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMarkOne(notif); }}
                    >
                      [ 🌐 PROFILE ]
                    </Link>
                  )}

                  {(notif.type === "whisper" || notif.type === "wire") && (
                    <Link
                      href="/wire"
                      className="font-mono text-[9px] border border-neutral-700 bg-white text-black font-bold px-2 py-1 uppercase tracking-wider hover:bg-neutral-200 transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMarkOne(notif); }}
                    >
                      [ 💬 WIRE ]
                    </Link>
                  )}

                  {notif.type === "stage" && (
                    <Link
                      href="/clash"
                      className="font-mono text-[9px] border border-neutral-700 bg-white text-black font-bold px-2 py-1 uppercase tracking-wider hover:bg-neutral-200 transition-colors shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleMarkOne(notif); }}
                    >
                      [ ⚔ STAGE ]
                    </Link>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteOne(notif.id, e)}
                    className="p-1 text-neutral-600 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
