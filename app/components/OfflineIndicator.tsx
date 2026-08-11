"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Update online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Initial check
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-tertiary border-b border-standard px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 text-secondary" />
      <span className="font-mono text-xs tracking-widest uppercase text-secondary">
        You're offline. Some features may be limited.
      </span>
    </div>
  );
}
