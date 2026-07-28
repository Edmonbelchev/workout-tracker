import {
  formatAbsDepthStatus,
  formatAbsPhase,
  AbsAnalyzer,
  type AbsAnalysis,
  type AbsStateTransition,
} from "@/lib/exercises/abs/AbsAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createAbsAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<AbsAnalysis> {
  const analyzer = new AbsAnalyzer({
    onTransition: (transition: AbsStateTransition) => {
      if (options.debug) {
        options.onTransition?.(
          `${transition.from.toUpperCase()} → ${transition.to.toUpperCase()} (${transition.hipAngle?.toFixed(1)}°)`,
        );
      }
    },
    onRepComplete: (event) => {
      options.onRepComplete?.({
        repNumber: event.repNumber,
        valid: event.valid,
        timestamp: event.timestamp,
        invalidReason: event.valid ? undefined : "Curl higher",
      });
    },
  });

  return { analyzer, toWorkoutState: absToWorkoutState };
}

export function absToWorkoutState(analysis: AbsAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Curl",
      value: formatAbsDepthStatus(analysis.depthStatus),
      variant:
        analysis.depthStatus === "good"
          ? "good"
          : analysis.depthStatus === "too_shallow"
            ? "warn"
            : "default",
    },
    { label: "Left hip", value: formatAngle(analysis.metrics.leftHipFlexion) },
    { label: "Right hip", value: formatAngle(analysis.metrics.rightHipFlexion) },
    {
      label: "Feedback",
      value: analysis.feedback,
      variant: analysis.trackingQuality === "good" ? "good" : "warn",
    },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Flexion: ${formatAngle(analysis.metrics.flexionAngle)}`,
    `Smoothed hip: ${formatAngle(analysis.smoothedHipAngle)}`,
    ...analysis.transitionLog.map(
      (t) => `${t.from} → ${t.to} (${t.hipAngle?.toFixed(1)}°)`,
    ),
  ];

  if (analysis.lastRepComplete) {
    debugLines.unshift(
      `Last rep: ${analysis.lastRepComplete.valid ? "VALID" : "INVALID"} (peak ${analysis.lastRepComplete.peakHipAngle.toFixed(1)}°)`,
    );
  }

  return {
    exerciseId: "abs",
    exerciseName: "Abs",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatAbsPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "flat",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Curl higher",
        }
      : null,
    cameraHint: "Front or side view — show shoulders, hips, and knees.",
    debugLines,
  };
}
