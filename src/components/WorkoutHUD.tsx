"use client";

import type { HudFieldVariant, WorkoutState } from "@/lib/exercises/types";
import type { TrackingQuality } from "@/lib/pose/types";

interface WorkoutHUDProps {
  workout: WorkoutState;
  trackingQuality: TrackingQuality;
  isDetectorReady: boolean;
  debug?: boolean;
}

function StatusBadge({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: HudFieldVariant;
}) {
  const valueClass =
    variant === "good"
      ? "text-emerald-400"
      : variant === "warn"
        ? "text-amber-400"
        : variant === "phase"
          ? "text-cyan-400"
          : "text-zinc-100";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

export function WorkoutHUD({
  workout,
  trackingQuality,
  isDetectorReady,
  debug = false,
}: WorkoutHUDProps) {
  const trackingLabel = trackingQuality === "good" ? "Good" : "Poor";
  const trackingVariant = trackingQuality === "good" ? "good" : "warn";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-emerald-500/80">
            AI Fitness Coach
          </p>
          <h1 className="truncate text-lg font-bold text-white sm:text-xl">
            {workout.exerciseName}
          </h1>
          {!workout.isAvailable && (
            <p className="mt-0.5 text-xs text-amber-400">Preview — coming soon</p>
          )}
        </div>

        <div className="shrink-0 rounded-xl border border-emerald-500/30 bg-zinc-950/90 px-4 py-2 text-center backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Reps</p>
          <p className="text-3xl font-bold tabular-nums leading-none text-emerald-400">
            {workout.reps}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          <StatusBadge label="Phase" value={workout.phase} variant="phase" />
          <StatusBadge label="Tracking" value={trackingLabel} variant={trackingVariant} />
          {workout.hudFields.map((field) => (
            <StatusBadge
              key={field.label}
              label={field.label}
              value={field.value}
              variant={field.variant}
            />
          ))}
          {debug && (
            <>
              <StatusBadge
                label="Invalid"
                value={String(workout.invalidReps)}
                variant={workout.invalidReps > 0 ? "warn" : "default"}
              />
              <StatusBadge
                label="Detector"
                value={isDetectorReady ? "Ready" : "Loading…"}
                variant={isDetectorReady ? "good" : "default"}
              />
            </>
          )}
        </div>
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
