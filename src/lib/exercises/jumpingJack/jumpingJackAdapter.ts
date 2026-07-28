import {
  formatJumpingJackPhase,
  JumpingJackAnalyzer,
  type JumpingJackAnalysis,
  type JumpingJackStateTransition,
} from "@/lib/exercises/jumpingJack/JumpingJackAnalyzer";
import { formatCameraView } from "@/lib/pose/cameraView";
import type {
  ExerciseAnalyzerAdapter,
  ExerciseAnalyzerFactoryOptions,
  HudField,
  WorkoutState,
} from "@/lib/exercises/types";

export function createJumpingJackAdapter(
  options: ExerciseAnalyzerFactoryOptions = {},
): ExerciseAnalyzerAdapter<JumpingJackAnalysis> {
  const analyzer = new JumpingJackAnalyzer({
    onTransition: (transition: JumpingJackStateTransition) => {
      if (options.debug) {
        options.onTransition?.(`${transition.from.toUpperCase()} → ${transition.to.toUpperCase()}`);
      }
    },
    onRepComplete: (event) => {
      options.onRepComplete?.({
        repNumber: event.repNumber,
        valid: event.valid,
        timestamp: event.timestamp,
      });
    },
  });

  return { analyzer, toWorkoutState: jumpingJackToWorkoutState };
}

export function jumpingJackToWorkoutState(analysis: JumpingJackAnalysis): WorkoutState {
  const hudFields: HudField[] = [
    {
      label: "Arms",
      value: analysis.metrics.armsUp ? "Up" : "Down",
      variant: analysis.metrics.armsUp ? "good" : "default",
    },
    {
      label: "Legs",
      value: analysis.metrics.legsOpen ? "Open" : "Closed",
      variant: analysis.metrics.legsOpen ? "good" : "default",
    },
  ];

  const debugLines = [
    `View: ${formatCameraView(analysis.metrics.cameraView)}`,
    `Arm raise: ${analysis.metrics.armRaise?.toFixed(3) ?? "—"}`,
    `Leg spread: ${analysis.metrics.legSpreadRatio?.toFixed(2) ?? "—"}`,
    ...analysis.transitionLog.map((t) => `${t.from} → ${t.to}`),
  ];

  return {
    exerciseId: "jumping-jack",
    exerciseName: "Jumping jack",
    trackingQuality: analysis.trackingQuality,
    isAvailable: true,
    reps: analysis.reps,
    invalidReps: analysis.invalidReps,
    phase: formatJumpingJackPhase(analysis.phase),
    feedback: analysis.feedback,
    coachingMessage: analysis.coachingMessage,
    isActivePhase: analysis.phase !== "closed",
    hudFields,
    lastRepComplete: analysis.lastRepComplete
      ? {
          repNumber: analysis.lastRepComplete.repNumber,
          valid: analysis.lastRepComplete.valid,
          timestamp: analysis.lastRepComplete.timestamp,
        }
      : null,
    cameraHint: "Front view works best — full body head to feet.",
    debugLines,
  };
}
