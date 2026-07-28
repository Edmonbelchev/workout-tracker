"use client";

import type { HudFieldVariant, WorkoutState } from "@/lib/exercises/types";

interface WorkoutHUDProps {
  workout: WorkoutState;
}

function feedbackTone(feedback: string, isActivePhase: boolean): HudFieldVariant {
  if (feedback === "Good rep") return "good";
  if (feedback === "Ready" && !isActivePhase) return "default";
  return "warn";
}

export function WorkoutHUD({ workout }: WorkoutHUDProps) {
  const feedbackVariant = feedbackTone(workout.feedback, workout.isActivePhase);
  const feedbackClass =
    feedbackVariant === "good"
      ? "text-emerald-300"
      : feedbackVariant === "warn"
        ? "text-amber-200"
        : "text-zinc-100";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="min-w-0 max-w-[58%] rounded-xl border border-zinc-700/80 bg-zinc-950/85 px-3 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md sm:max-w-[55%] sm:px-4 sm:py-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Feedback</p>
        <p className={`truncate text-base font-semibold leading-snug sm:text-lg ${feedbackClass}`}>
          {workout.feedback}
        </p>
      </div>

      <div className="shrink-0 rounded-xl border border-emerald-500/40 bg-zinc-950/85 px-4 py-2.5 text-center shadow-lg shadow-black/40 backdrop-blur-md sm:px-5 sm:py-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Reps</p>
        <p className="text-4xl font-bold tabular-nums leading-none text-emerald-400 sm:text-5xl">
          {workout.reps}
        </p>
      </div>
    </div>
  );
}

export function PrivacyNotice() {
  return (
    <p className="pointer-events-none absolute bottom-4 left-4 z-10 text-xs text-zinc-500">
      Video processing happens on your device.
    </p>
  );
}

export function DebugHint() {
  return (
    <p className="pointer-events-none absolute bottom-4 right-4 z-10 text-xs text-zinc-600">
      Add <code className="text-zinc-500">?debug=1</code> for debug info
    </p>
  );
}
