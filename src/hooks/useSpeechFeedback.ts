"use client";

import { useEffect, useRef } from "react";

import type { WorkoutState } from "@/lib/exercises/types";
import { speechService } from "@/lib/speech/speechService";

export interface UseSpeechFeedbackOptions {
  enabled: boolean;
  workout: WorkoutState;
}

export function useSpeechFeedback({ enabled, workout }: UseSpeechFeedbackOptions): void {
  const lastRepTimestampRef = useRef<number | null>(null);
  const lastCoachingRef = useRef<string | null>(null);

  useEffect(() => {
    speechService.setEnabled(enabled && workout.isAvailable);
    if (!enabled) {
      lastRepTimestampRef.current = null;
      lastCoachingRef.current = null;
      speechService.resetCooldowns();
    }

    return () => {
      speechService.setEnabled(false);
    };
  }, [enabled, workout.isAvailable]);

  useEffect(() => {
    if (!enabled || !workout.isAvailable || workout.trackingQuality === "poor") return;

    const repEvent = workout.lastRepComplete;
    if (repEvent && repEvent.timestamp !== lastRepTimestampRef.current) {
      lastRepTimestampRef.current = repEvent.timestamp;

      if (repEvent.valid) {
        speechService.speakRepCount(repEvent.repNumber);
      } else {
        speechService.speak(repEvent.invalidReason ?? "Try again", { priority: "coaching" });
      }
      return;
    }

    const coaching = workout.coachingMessage;
    if (
      coaching &&
      coaching !== lastCoachingRef.current &&
      workout.isActivePhase
    ) {
      lastCoachingRef.current = coaching;
      speechService.speak(coaching, { priority: "coaching" });
    }

    if (!workout.isActivePhase && !coaching) {
      lastCoachingRef.current = null;
    }
  }, [workout, enabled]);
}
