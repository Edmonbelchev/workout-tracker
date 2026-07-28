import {
  formatPlankFormStatus,
  formatPlankPhase,
  PlankAnalyzer,
  type PlankAnalysis,
} from "@/lib/exercises/plank/PlankAnalyzer";
import { formatAngle } from "@/lib/geometry/formatAngle";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createPlankAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<PlankAnalysis> {
  void options;
  const analyzer = new PlankAnalyzer();
  return { analyzer, toWorkoutState: plankToWorkoutState };
}

export function plankToWorkoutState(analysis: PlankAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Form",
      value: formatPlankFormStatus(analysis.formStatus),
      variant:
        analysis.formStatus === "good"
          ? "good"
          : analysis.formStatus === "sagging"
            ? "warn"
            : "default",
    },
    { label: "Best", value: `${analysis.bestHoldSeconds}s`, variant: "phase" },
    { label: "Body line", value: formatAngle(analysis.metrics.bodyLineAngle) },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Hold: ${analysis.holdSeconds}s (best ${analysis.bestHoldSeconds}s)`,
    `Body line: ${formatAngle(analysis.metrics.bodyLineAngle)}`,
    `Elbow ext: ${formatAngle(analysis.metrics.elbowExtension)}`,
  ];

  return {
    exerciseId: "plank",
    exerciseName: "Plank",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.holdSeconds,
    invalidReps: 0,
    phase: formatPlankPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase === "holding",
    counterLabel: "Time",
    hudFields,
    lastRepComplete: null,
    cameraHint: "Side view — show shoulders, arms, and hips in plank.",
    debugLines,
  };
}
