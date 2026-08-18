"use client";

/**
 * app/components/Toast.tsx
 * ─────────────────────────────────────────────────────
 * In-app toast notification component for real-time alerts
 */

import React, { useEffect, useState } from "react";
import { X, Bell, ArrowUp, Repeat2, RefreshCw, Swords, Mic2, Hand, Users, LogOut, Mic, MicOff, AtSign, Star } from "lucide-react";
import { type EchoNotification } from "@/lib/notifications";

import { useRouter } from "next/navigation";

// Simple notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
};

interface ToastProps {
  notification: EchoNotification;
  onClose: () => void;
  duration?: number;
}

export function Toast({ notification, onClose, duration = 5000 }: ToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play notification sound on mount
    playNotificationSound();

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClick = () => {
    if (notification.roomId) {
      router.push(`/room/${notification.roomId}`);
    } else if (notification.type === "wire" || notification.type === "whisper") {
      router.push("/wire");
    } else if (notification.type === "orbiter") {
      router.push(`/${notification.fromHandle.replace("@", "")}`);
    } else if (notification.type === "stage") {
      router.push("/clash");
    } else if (notification.postId) {
      router.push(`/#${notification.postId}`);
    } else {
      router.push("/notifications");
    }
    onClose();
  };

  const getIcon = () => {
    const cls = "w-4 h-4";
    switch (notification.type) {
      case "pulse": return <ArrowUp className={cls} />;
      case "reverb": return <Repeat2 className={cls} />;
      case "orbiter": return <RefreshCw className={cls} />;
      case "stage": return <Swords className={cls} />;
      case "whisper":
      case "wire": return <Mic2 className={cls} />;
      case "raise_hand": return <Hand className={cls} />;
      case "room_join": return <Users className={cls} />;
      case "room_leave": return <LogOut className={cls} />;
      case "room_promote": return <Mic className={cls} />;
      case "room_demote": return <MicOff className={cls} />;
      case "mention": return <AtSign className={cls} />;
      case "bookmark": return <Star className={cls} />;
      default: return <Bell className={cls} />;
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case "pulse": return "text-white";
      case "reverb": return "text-white";
      case "orbiter": return "text-white";
      case "stage": return "text-white";
      case "whisper":
      case "wire": return "text-white";
      case "raise_hand": return "text-white";
      case "room_join": return "text-white";
      case "room_leave": return "text-neutral-500";
      case "room_promote": return "text-green-400";
      case "room_demote": return "text-red-400";
      case "mention": return "text-white";
      case "bookmark": return "text-amber-400";
      default: return "text-white";
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-black border border-white p-4 shadow-2xl transition-all duration-300 cursor-pointer font-mono ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`shrink-0 w-8 h-8 border border-neutral-700 flex items-center justify-center ${getIconColor()} animate-pulse`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-bold tracking-widest uppercase">
            {notification.fromHandle}
          </p>
          <p className="text-neutral-300 text-xs leading-snug truncate mt-0.5">
            {notification.text}
          </p>
          {notification.roomName && (
            <p className="text-[10px] text-neutral-500 uppercase mt-1">
              in "{notification.roomName}"
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="shrink-0 text-neutral-600 hover:text-white transition-colors cursor-pointer p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  notifications: EchoNotification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ notifications, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notif) => (
        <div key={notif.id} className="pointer-events-auto">
          <Toast
            notification={notif}
            onClose={() => onDismiss(notif.id)}
            duration={5000}
          />
        </div>
      ))}
    </div>
  );
}
