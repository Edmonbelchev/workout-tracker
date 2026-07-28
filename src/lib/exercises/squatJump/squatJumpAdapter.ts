import {
  formatSquatJumpDepthStatus,
  formatSquatJumpPhase,
  SquatJumpAnalyzer,
  type SquatJumpAnalysis,
  type SquatJumpStateTransition,
} from "@/lib/exercises/squatJump/SquatJumpAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createSquatJumpAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<SquatJumpAnalysis> {
  const analyzer = new SquatJumpAnalyzer({
    onTransition: (transition: SquatJumpStateTransition) => {
      if (options.debug) {
        options.onTransition?.(
          `${transition.from.toUpperCase()} → ${transition.to.toUpperCase()} (${transition.kneeAngle?.toFixed(1)}°)`,
        );
      }
    },
    onRepComplete: (event) => {
      options.onRepComplete?.({
        repNumber: event.repNumber,
        valid: event.valid,
        timestamp: event.timestamp,
        invalidReason: event.valid ? undefined : "Jump higher",
      });
    },
  });

  return { analyzer, toWorkoutState: squatJumpToWorkoutState };
}

export function squatJumpToWorkoutState(analysis: SquatJumpAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Jump",
      value: formatSquatJumpDepthStatus(analysis.depthStatus),
      variant:
        analysis.depthStatus === "good"
          ? "good"
          : analysis.depthStatus === "no_jump" || analysis.depthStatus === "too_shallow"
            ? "warn"
            : "default",
    },
    { label: "Left knee", value: formatAngle(analysis.metrics.leftKneeAngle) },
    { label: "Right knee", value: formatAngle(analysis.metrics.rightKneeAngle) },
    {
      label: "Hip Δy",
      value:
        analysis.metrics.hipDeltaY === null
          ? "—"
          : `${(analysis.metrics.hipDeltaY * 1000).toFixed(1)}`,
    },
    {
      label: "Feedback",
      value: analysis.feedback,
      variant: analysis.trackingQuality === "good" ? "good" : "warn",
    },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Flexion: ${formatAngle(analysis.metrics.flexionAngle)}`,
    `Smoothed knee: ${formatAngle(analysis.smoothedKneeAngle)}`,
    `Hip mid Y: ${analysis.metrics.hipMidY?.toFixed(4) ?? "—"}`,
    `Hip delta Y: ${analysis.metrics.hipDeltaY?.toFixed(4) ?? "—"}`,
    ...analysis.transitionLog.map(
      (t) => `${t.from} → ${t.to} (${t.kneeAngle?.toFixed(1)}°)`,
    ),
  ];

  if (analysis.lastRepComplete) {
    debugLines.unshift(
      `Last rep: ${analysis.lastRepComplete.valid ? "VALID" : "INVALID"} (deepest ${analysis.lastRepComplete.deepestKneeAngle.toFixed(1)}°)`,
    );
  }

  return {
    exerciseId: "squat-jump",
    exerciseName: "Squat jump",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatSquatJumpPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "standing",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Jump higher",
        }
      : null,
    cameraHint: "Front or side view — full body with feet visible.",
    debugLines,
  };
}
