import type { Pose, TrackingQuality } from "@/lib/pose/types";

/** Supported exercise identifiers — add new IDs here as analyzers are built. */
export type ExerciseId =
  | "squat"
  | "push-up"
  | "pull-up"
  | "squat-jump"
  | "abs";

export type ExerciseStatus = "available" | "coming-soon";

export interface ExerciseAnalysis {
  exerciseId: ExerciseId;
  exerciseName: string;
  trackingQuality: TrackingQuality;
}

export interface ExerciseAnalyzer<TAnalysis extends ExerciseAnalysis = ExerciseAnalysis> {
  readonly exerciseId: ExerciseId;
  readonly exerciseName: string;
  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): TAnalysis;
  reset(): void;
}

export interface RepCompleteEvent {
  repNumber: number;
  valid: boolean;
  timestamp: number;
  invalidReason?: string;
}

export type HudFieldVariant = "default" | "good" | "warn" | "phase";

export interface HudField {
  label: string;
  value: string;
  variant?: HudFieldVariant;
}

/**
 * Unified workout output consumed by HUD, speech, and debug UI.
 * Each exercise analyzer maps its specific analysis into this shape.
 */
export interface WorkoutState {
  exerciseId: ExerciseId;
  exerciseName: string;
  trackingQuality: TrackingQuality;
  isAvailable: boolean;
  reps: number;
  invalidReps: number;
  phase: string;
  feedback: string;
  coachingMessage: string | null;
  isActivePhase: boolean;
  hudFields: HudField[];
  lastRepComplete: RepCompleteEvent | null;
  cameraHint: string;
  debugLines: string[];
}

export const EMPTY_WORKOUT_STATE: WorkoutState = {
  exerciseId: "squat",
  exerciseName: "Squat",
  trackingQuality: "poor",
  isAvailable: true,
  reps: 0,
  invalidReps: 0,
  phase: "—",
  feedback: "Ready",
  coachingMessage: null,
  isActivePhase: false,
  hudFields: [],
  lastRepComplete: null,
  cameraHint: "Stand back so your full body is visible.",
  debugLines: [],
};

export interface ExerciseDefinition {
  id: ExerciseId;
  name: string;
  description: string;
  cameraHint: string;
  status: ExerciseStatus;
  /** Landmarks needed for reliable tracking — used for future quality checks. */
  requiredLandmarks: (keyof Pose)[];
  createAnalyzer: (options?: ExerciseAnalyzerFactoryOptions) => ExerciseAnalyzer;
}

export interface ExerciseAnalyzerFactoryOptions {
  debug?: boolean;
  onTransition?: (line: string) => void;
  onRepComplete?: (event: RepCompleteEvent) => void;
}

export interface ExerciseAnalyzerAdapter<TAnalysis extends ExerciseAnalysis> {
  analyzer: ExerciseAnalyzer<TAnalysis>;
  toWorkoutState: (analysis: TAnalysis) => WorkoutState;
}
