import type { ExerciseAnalyzer, ExerciseAnalysis, RepCompleteEvent } from "@/lib/exercises/types";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface ComingSoonAnalysis extends ExerciseAnalysis {
  exerciseId: "push-up" | "pull-up" | "squat-jump" | "abs";
  feedback: string;
}

/**
 * Placeholder analyzer for exercises not yet implemented.
 * Keeps the registry and UI wiring consistent while work is in progress.
 */
export class ComingSoonAnalyzer implements ExerciseAnalyzer<ComingSoonAnalysis> {
  readonly exerciseId: ComingSoonAnalysis["exerciseId"];
  readonly exerciseName: string;

  constructor(exerciseId: ComingSoonAnalysis["exerciseId"], exerciseName: string) {
    this.exerciseId = exerciseId;
    this.exerciseName = exerciseName;
  }

  analyze(_pose: Pose | null, trackingQuality: TrackingQuality = "poor"): ComingSoonAnalysis {
    return {
      exerciseId: this.exerciseId,
      exerciseName: this.exerciseName,
      trackingQuality,
      feedback: "Coming soon — squat is fully supported today",
    };
  }

  reset(): void {
    // no-op
  }
}

export function comingSoonToWorkoutState(
  analysis: ComingSoonAnalysis,
  cameraHint: string,
): import("@/lib/exercises/types").WorkoutState {
  return {
    exerciseId: analysis.exerciseId,
    exerciseName: analysis.exerciseName,
    trackingQuality: analysis.trackingQuality,
    isAvailable: false,
    reps: 0,
    invalidReps: 0,
    phase: "—",
    feedback: analysis.feedback,
    coachingMessage: null,
    isActivePhase: false,
    hudFields: [
      { label: "Status", value: "Coming soon", variant: "warn" },
    ],
    lastRepComplete: null,
    cameraHint,
    debugLines: ["Analyzer not implemented yet"],
  };
}

export function emptyRepEvent(): RepCompleteEvent | null {
  return null;
}
