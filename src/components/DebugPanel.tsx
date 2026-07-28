"use client";

import type { WorkoutState } from "@/lib/exercises/types";

interface DebugPanelProps {
  workout: WorkoutState;
  fps: number;
  overlay?: boolean;
}

export function DebugPanel({ workout, fps, overlay = false }: DebugPanelProps) {
  return (
    <div
      className={[
        "pointer-events-none absolute inset-x-3 z-10 max-h-40 overflow-y-auto rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-3 font-mono text-[11px] text-zinc-300 backdrop-blur-sm sm:inset-x-4",
        overlay
          ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)]"
          : "bottom-12",
      ].join(" ")}
    >
      <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
        Debug — {workout.exerciseId}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <span>Phase: {workout.phase}</span>
        <span>Reps: {workout.reps}</span>
        <span>Invalid: {workout.invalidReps}</span>
        <span>FPS: {fps}</span>
        <span>Available: {workout.isAvailable ? "yes" : "no"}</span>
      </div>

      {workout.debugLines.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-zinc-800 pt-2">
          {[...workout.debugLines].reverse().slice(0, 10).map((line, index) => (
            <li key={`${line}-${index}`} className="text-emerald-400/90">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
