import {
  DipsAnalyzer,
  formatDipsDepthStatus,
  formatDipsPhase,
  type DipsAnalysis,
  type DipsStateTransition,
} from "@/lib/exercises/dips/DipsAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createDipsAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<DipsAnalysis> {
  const analyzer = new DipsAnalyzer({
    onTransition: (transition: DipsStateTransition) => {
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

  return { analyzer, toWorkoutState: dipsToWorkoutState };
}

export function dipsToWorkoutState(analysis: DipsAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Depth",
      value: formatDipsDepthStatus(analysis.depthStatus),
      variant:
        analysis.depthStatus === "good"
          ? "good"
          : analysis.depthStatus === "too_shallow"
            ? "warn"
            : "default",
    },
    { label: "Left elbow", value: formatAngle(analysis.metrics.leftElbowAngle) },
    { label: "Right elbow", value: formatAngle(analysis.metrics.rightElbowAngle) },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Flexion: ${formatAngle(analysis.metrics.flexionAngle)}`,
    `Shoulder-hip gap: ${analysis.metrics.shoulderHipGap?.toFixed(3) ?? "—"}`,
    ...analysis.transitionLog.map(
      (t) => `${t.from} → ${t.to} (${t.elbowAngle?.toFixed(1)}°)`,
    ),
  ];

  return {
    exerciseId: "dips",
    exerciseName: "Dips",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatDipsPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "top",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
          invalidReason: analysis.lastRepComplete.valid ? undefined : "Go slightly lower",
        }
      : null,
    cameraHint: "Front or side view — show arms, shoulders, and hips.",
    debugLines,
  };
}
