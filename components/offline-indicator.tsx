"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

/**
 * Offline Indicator Component
 *
 * Shows a banner when the user is offline and provides
 * context about what features are available.
 */
export function OfflineIndicator({
  className,
  showWhenOnline = false,
  autoHide = true,
  autoHideDelay = 3000,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initialize with actual status
    setIsOnline(navigator.onLine);
    setShowBanner(!navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowBanner(true);
        // Auto-hide after delay when coming back online
        if (autoHide) {
          setTimeout(() => {
            setShowBanner(false);
            setWasOffline(false);
          }, autoHideDelay);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
      setDismissed(false); // Reset dismissed state when going offline
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline, autoHide, autoHideDelay]);

  // Don't show if dismissed or if online and not showing reconnected message
  if (dismissed || (!showBanner && !showWhenOnline)) {
    return null;
  }

  if (isOnline && !showWhenOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50",
        "animate-in slide-in-from-bottom-2 fade-in duration-300",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-lg shadow-lg p-4",
          isOnline
            ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
            : "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex-shrink-0 p-2 rounded-full",
              isOnline
                ? "bg-green-100 dark:bg-green-900"
                : "bg-amber-100 dark:bg-amber-900",
            )}
          >
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-medium text-sm",
                isOnline
                  ? "text-green-800 dark:text-green-200"
                  : "text-amber-800 dark:text-amber-200",
              )}
            >
              {isOnline ? "Back online!" : "You're offline"}
            </p>
            <p
              className={cn(
                "text-sm mt-1",
                isOnline
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              {isOnline
                ? "Your connection has been restored. Any pending changes will sync."
                : "Some features may be limited. Your work will be saved locally."}
            </p>

            {!isOnline && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-8 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry Connection
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 flex-shrink-0",
              isOnline
                ? "text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
                : "text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900",
            )}
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact offline indicator for headers/navbars
 */
export function OfflineIndicatorCompact({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full",
        "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
        "text-xs font-medium",
        className,
      )}
    >
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}

/**
 * Hook to check online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export default OfflineIndicator;
