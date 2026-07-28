import {
  BurpeeAnalyzer,
  formatBurpeePhase,
  type BurpeeAnalysis,
  type BurpeeStateTransition,
} from "@/lib/exercises/burpee/BurpeeAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createBurpeeAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<BurpeeAnalysis> {
  const analyzer = new BurpeeAnalyzer({
    onTransition: (transition: BurpeeStateTransition) => {
      if (options.debug) {
        options.onTransition?.(`${transition.from.toUpperCase()} → ${transition.to.toUpperCase()}`);
      }
    },
    onRepComplete: (event) => {
      options.onRepComplete?.({
        repNumber: event.repNumber,
        valid: event.valid,
        timestamp: event.timestamp,
        invalidReason: event.valid ? undefined : "Complete all phases",
      });
    },
  });

  return { analyzer, toWorkoutState: burpeeToWorkoutState };
}

export function burpeeToWorkoutState(analysis: BurpeeAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    { label: "Knee", value: formatAngle(analysis.metrics.kneeFlexion), variant: "phase" },
    { label: "Elbow", value: formatAngle(analysis.metrics.elbowFlexion) },
    {
      label: "Hands",
      value: analysis.metrics.handsDown ? "Down" : "Up",
      variant: analysis.metrics.handsDown ? "good" : "default",
    },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Knee: ${formatAngle(analysis.metrics.kneeFlexion)}`,
    `Elbow: ${formatAngle(analysis.metrics.elbowFlexion)}`,
    `Hip Δy: ${analysis.metrics.hipDeltaY?.toFixed(4) ?? "—"}`,
    ...analysis.transitionLog.map((t) => `${t.from} → ${t.to}`),
  ];

  return {
    exerciseId: "burpee",
    exerciseName: "Burpee",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatBurpeePhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "standing",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Complete all phases",
        }
      : null,
    cameraHint: "Front or side view — full body with space to move.",
    debugLines,
  };
}
