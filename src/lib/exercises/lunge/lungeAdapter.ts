import {
  formatLungeDepthStatus,
  formatLungePhase,
  LungeAnalyzer,
  type LungeAnalysis,
  type LungeStateTransition,
} from "@/lib/exercises/lunge/LungeAnalyzer";
import { legLabel } from "@/lib/exercises/lunge/lungeFormFeedback";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createLungeAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<LungeAnalysis> {
  const analyzer = new LungeAnalyzer({
    onTransition: (transition: LungeStateTransition) => {
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

  return { analyzer, toWorkoutState: lungeToWorkoutState };
}

export function lungeToWorkoutState(analysis: LungeAnalysis): WorkoutState {
  const legValue = analysis.activeLeg ? legLabel(analysis.activeLeg) : "—";

  const hudFields: HudField[] = [
    { label: "Leg", value: legValue, variant: "phase" },
    {
      label: "Depth",
      value: formatLungeDepthStatus(analysis.depthStatus),
      variant:
        analysis.depthStatus === "good"
          ? "good"
          : analysis.depthStatus === "too_shallow"
            ? "warn"
            : "default",
    },
    { label: "Left knee", value: formatAngle(analysis.metrics.leftKneeAngle) },
    { label: "Right knee", value: formatAngle(analysis.metrics.rightKneeAngle) },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Leg: ${legValue}`,
    `Flexion: ${formatAngle(analysis.metrics.flexionAngle)}`,
    ...analysis.transitionLog.map(
      (t) => `${t.from} → ${t.to} (${t.kneeAngle?.toFixed(1)}°)`,
    ),
  ];

  return {
    exerciseId: "lunge",
    exerciseName: "Lunge",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatLungePhase(analysis.phase),
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
    cameraHint: "Front or side view — full body with room to step forward.",
    debugLines,
  };
}
