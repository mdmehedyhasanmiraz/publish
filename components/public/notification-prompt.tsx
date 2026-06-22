"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Ensure we are in the browser and Notification is supported
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    // Only show if the current permission state is default (promptable)
    if (Notification.permission !== "default") {
      return;
    }

    // Check 3-day dismissal cooldown
    const dismissedUntil = localStorage.getItem("notification_prompt_dismissed_until");
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Check showing frequency (twice each day - rolling 24 hour period)
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    let shows: number[] = [];
    try {
      const showsStr = localStorage.getItem("notification_prompt_shows");
      if (showsStr) {
        shows = JSON.parse(showsStr);
      }
    } catch (e) {
      shows = [];
    }

    // Filter shows to the last 24 hours
    const recentShows = shows.filter((timestamp) => timestamp > oneDayAgo);

    if (recentShows.length >= 2) {
      return;
    }

    // Record the current show
    recentShows.push(now);
    localStorage.setItem("notification_prompt_shows", JSON.stringify(recentShows));

    // Show the card with a slight delay for entry animation
    const timer = setTimeout(() => {
      setShowPrompt(true);
      // Wait a tick to trigger transition
      setTimeout(() => setIsAnimating(true), 50);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsAnimating(false);
    // Wait for animation to finish before removing from DOM
    setTimeout(() => {
      setShowPrompt(false);
      // Set dismissal cooldown to 3 days from now
      const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem("notification_prompt_dismissed_until", threeDaysFromNow.toString());
    }, 300);
  };

  const handleEnable = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Notification permission granted, hide prompt
        setIsAnimating(false);
        setTimeout(() => {
          setShowPrompt(false);
        }, 300);
      } else {
        // If denied or default, we treat it as dismissed (so it doesn't prompt again immediately)
        handleDismiss();
      }
    } catch (error) {
      console.error("Error requesting notification permission", error);
      handleDismiss();
    }
  };

  if (!showPrompt) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm sm:max-w-md bg-slate-950 border border-slate-800 text-slate-100 rounded-xl shadow-2xl p-4 flex items-start gap-3 transition-all duration-300 ease-out transform ${
        isAnimating
          ? "translate-y-0 opacity-100 scale-100"
          : "-translate-y-12 opacity-0 scale-95"
      }`}
    >
      <div className="flex-shrink-0 p-2 bg-slate-900 rounded-lg text-teal-400">
        <Bell className="h-5 w-5 animate-bounce" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-200">
          Enable Notifications
        </h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Stay updated on the latest open access research publications and journal announcements.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleEnable}
            className="bg-teal-500 text-slate-950 font-medium hover:bg-teal-400 transition-colors h-8 px-3 rounded-lg"
          >
            Turn on
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors h-8 px-3 rounded-lg"
          >
            Later
          </Button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-900"
        aria-label="Dismiss notification request"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
