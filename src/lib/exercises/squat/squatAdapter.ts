import {
  formatDepthStatus,
  formatSquatPhase,
  SquatAnalyzer,
  type SquatAnalysis,
  type StateTransition,
} from "@/lib/exercises/squat/SquatAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createSquatAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<SquatAnalysis> {
  const analyzer = new SquatAnalyzer({
    onTransition: (transition: StateTransition) => {
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
        invalidReason: event.valid ? undefined : "Go slightly deeper",
      });
    },
  });

  return { analyzer, toWorkoutState: squatToWorkoutState };
}

export function squatToWorkoutState(analysis: SquatAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Depth",
      value: formatDepthStatus(analysis.depthStatus),
      variant:
        analysis.depthStatus === "good"
          ? "good"
          : analysis.depthStatus === "too_shallow"
            ? "warn"
            : "default",
    },
    { label: "Left knee", value: formatAngle(analysis.metrics.leftKneeAngle) },
    { label: "Right knee", value: formatAngle(analysis.metrics.rightKneeAngle) },
    {
      label: "Feedback",
      value: analysis.feedback,
      variant: analysis.trackingQuality === "good" ? "good" : "warn",
    },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Flexion: ${formatAngle(analysis.metrics.flexionAngle)}`,
    `Hip-ankle gap: ${analysis.metrics.hipAnkleGap?.toFixed(3) ?? "—"}`,
    `Smoothed knee: ${formatAngle(analysis.smoothedKneeAngle)}`,
    `Left hip: ${formatAngle(analysis.metrics.leftHipAngle)}`,
    `Right hip: ${formatAngle(analysis.metrics.rightHipAngle)}`,
    `Torso: ${formatAngle(analysis.metrics.torsoInclination)}`,
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
    exerciseId: "squat",
    exerciseName: "Squat",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatSquatPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "standing",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Go slightly deeper",
        }
      : null,
    cameraHint: "Front or side view — keep your full body in frame.",
    debugLines,
  };
}
