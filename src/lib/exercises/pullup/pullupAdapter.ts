import {
  formatPullupHeightStatus,
  formatPullupPhase,
  PullupAnalyzer,
  type PullupAnalysis,
  type PullupStateTransition,
} from "@/lib/exercises/pullup/PullupAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createPullupAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<PullupAnalysis> {
  const analyzer = new PullupAnalyzer({
    onTransition: (transition: PullupStateTransition) => {
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
        invalidReason: event.valid ? undefined : "Pull higher",
      });
    },
  });

  return { analyzer, toWorkoutState: pullupToWorkoutState };
}

export function pullupToWorkoutState(analysis: PullupAnalysis): WorkoutState {
  const clearanceLabel =
    analysis.metrics.wristClearance === null
      ? "—"
      : `${(analysis.metrics.wristClearance * 100).toFixed(1)}%`;

  const hudFields: HudField[] = [
    {
      label: "Height",
      value: formatPullupHeightStatus(analysis.heightStatus),
      variant:
        analysis.heightStatus === "good"
          ? "good"
          : analysis.heightStatus === "too_low"
            ? "warn"
            : "default",
    },
    { label: "Left elbow", value: formatAngle(analysis.metrics.leftElbowAngle) },
    { label: "Right elbow", value: formatAngle(analysis.metrics.rightElbowAngle) },
    { label: "Wrist clr", value: clearanceLabel },
    {
      label: "Feedback",
      value: analysis.feedback,
      variant: analysis.trackingQuality === "good" ? "good" : "warn",
    },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Flexion: ${formatAngle(analysis.metrics.flexionAngle)}`,
    `Smoothed elbow: ${formatAngle(analysis.smoothedElbowAngle)}`,
    `Wrist clearance: ${analysis.metrics.wristClearance?.toFixed(4) ?? "—"}`,
    ...analysis.transitionLog.map(
      (t) => `${t.from} → ${t.to} (${t.elbowAngle?.toFixed(1)}°)`,
    ),
  ];

  if (analysis.lastRepComplete) {
    debugLines.unshift(
      `Last rep: ${analysis.lastRepComplete.valid ? "VALID" : "INVALID"} (peak ${analysis.lastRepComplete.peakElbowAngle.toFixed(1)}°)`,
    );
  }

  return {
    exerciseId: "pull-up",
    exerciseName: "Pull-up",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatPullupPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "hanging",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Pull higher",
        }
      : null,
    cameraHint: "Front, back, or side view — full body with hands overhead.",
    debugLines,
  };
}
