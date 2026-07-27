import {
  formatPushupDepthStatus,
  formatPushupPhase,
  PushupAnalyzer,
  type PushupAnalysis,
  type PushupStateTransition,
} from "@/lib/exercises/pushup/PushupAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createPushupAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<PushupAnalysis> {
  const analyzer = new PushupAnalyzer({
    onTransition: (transition: PushupStateTransition) => {
      if (options.debug) {
        options.onTransition?.(
          `${transition.from.toUpperCase()} → ${transition.to.toUpperCase()} (${transition.elbowAngle?.toFixed(1)}°)`,
        );
      }
    },
    onRepComplete: (event) => {
      options.onRepComplete?.({
        repNumber: event.repNumber,
        valid: event.valid,
        timestamp: event.timestamp,
        invalidReason: event.valid ? undefined : "Go slightly lower",
      });
    },
  });

  return { analyzer, toWorkoutState: pushupToWorkoutState };
}

export function pushupToWorkoutState(analysis: PushupAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Depth",
      value: formatPushupDepthStatus(analysis.depthStatus),
      variant:
        analysis.depthStatus === "good"
          ? "good"
          : analysis.depthStatus === "too_shallow"
            ? "warn"
            : "default",
    },
    { label: "Left elbow", value: formatAngle(analysis.metrics.leftElbowAngle) },
    { label: "Right elbow", value: formatAngle(analysis.metrics.rightElbowAngle) },
    { label: "Body line", value: formatAngle(analysis.metrics.bodyLineAngle) },
    {
      label: "Feedback",
      value: analysis.feedback,
      variant: analysis.trackingQuality === "good" ? "good" : "warn",
    },
  ];

  const debugLines = [
    `Smoothed elbow: ${formatAngle(analysis.smoothedElbowAngle)}`,
    ...analysis.transitionLog.map(
      (t) => `${t.from} → ${t.to} (${t.elbowAngle?.toFixed(1)}°)`,
    ),
  ];

  if (analysis.lastRepComplete) {
    debugLines.unshift(
      `Last rep: ${analysis.lastRepComplete.valid ? "VALID" : "INVALID"} (deepest ${analysis.lastRepComplete.deepestElbowAngle.toFixed(1)}°)`,
    );
  }

  return {
    exerciseId: "push-up",
    exerciseName: "Push-up",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatPushupPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "plank",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Go slightly lower",
        }
      : null,
    cameraHint: "Place camera to your side; show shoulders, arms, and hips.",
    debugLines,
  };
}
