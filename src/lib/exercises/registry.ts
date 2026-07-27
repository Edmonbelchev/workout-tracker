import { createAbsAdapter } from "@/lib/exercises/abs/absAdapter";
import { assessAbsTrackingQuality } from "@/lib/exercises/abs/absMetrics";
import { createPullupAdapter } from "@/lib/exercises/pullup/pullupAdapter";
import { assessPullupTrackingQuality } from "@/lib/exercises/pullup/pullupMetrics";
import { createPushupAdapter } from "@/lib/exercises/pushup/pushupAdapter";
import { assessPushupTrackingQuality } from "@/lib/exercises/pushup/pushupMetrics";
import { createSquatAdapter } from "@/lib/exercises/squat/squatAdapter";
import { createSquatJumpAdapter } from "@/lib/exercises/squatJump/squatJumpAdapter";
import { assessTrackingQuality } from "@/lib/pose/normalizePose";
import type {
  ExerciseDefinition,
  ExerciseId,
  ExerciseAnalyzerFactoryOptions,
  WorkoutState,
} from "@/lib/exercises/types";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface ExerciseRuntime {
  reset: () => void;
  analyze: (pose: Pose | null) => WorkoutState;
}

export const EXERCISE_REGISTRY: ExerciseDefinition[] = [
  {
    id: "squat",
    name: "Squat",
    description: "Count reps and depth from standing squats.",
    cameraHint: "Stand back so your full body fits in frame.",
    status: "available",
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ],
    createAnalyzer: (options) => createSquatAdapter(options).analyzer,
  },
  {
    id: "push-up",
    name: "Push-up",
    description: "Count reps from push-ups using elbow angles.",
    cameraHint: "Place camera to your side; show shoulders, arms, and hips.",
    status: "available",
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftWrist",
      "rightWrist",
      "leftHip",
      "rightHip",
    ],
    createAnalyzer: (options) => createPushupAdapter(options).analyzer,
  },
  {
    id: "pull-up",
    name: "Pull-up",
    description: "Count reps using elbow flexion and wrist height.",
    cameraHint: "Side view; full body visible with hands overhead.",
    status: "available",
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftWrist",
      "rightWrist",
    ],
    createAnalyzer: (options) => createPullupAdapter(options).analyzer,
  },
  {
    id: "squat-jump",
    name: "Squat jump",
    description: "Count reps when you squat, jump, and land.",
    cameraHint: "Full body in frame; feet must stay visible on landing.",
    status: "available",
    requiredLandmarks: [
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ],
    createAnalyzer: (options) => createSquatJumpAdapter(options).analyzer,
  },
  {
    id: "abs",
    name: "Abs",
    description: "Count crunches using hip flexion angle.",
    cameraHint: "Side view on the floor; shoulders, hips, and knees visible.",
    status: "available",
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
    ],
    createAnalyzer: (options) => createAbsAdapter(options).analyzer,
  },
];

export function getExerciseDefinition(id: ExerciseId): ExerciseDefinition {
  const found = EXERCISE_REGISTRY.find((e) => e.id === id);
  if (!found) throw new Error(`Unknown exercise: ${id}`);
  return found;
}

function assessTrackingForExercise(id: ExerciseId, pose: Pose | null): TrackingQuality {
  switch (id) {
    case "push-up":
      return assessPushupTrackingQuality(pose);
    case "pull-up":
      return assessPullupTrackingQuality(pose);
    case "abs":
      return assessAbsTrackingQuality(pose);
    default:
      return assessTrackingQuality(pose);
  }
}

export function createExerciseRuntime(
  id: ExerciseId,
  options?: ExerciseAnalyzerFactoryOptions,
): ExerciseRuntime {
  switch (id) {
    case "squat": {
      const { analyzer, toWorkoutState } = createSquatAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) =>
          toWorkoutState(analyzer.analyze(pose, assessTrackingForExercise(id, pose))),
      };
    }
    case "push-up": {
      const { analyzer, toWorkoutState } = createPushupAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) =>
          toWorkoutState(analyzer.analyze(pose, assessTrackingForExercise(id, pose))),
      };
    }
    case "pull-up": {
      const { analyzer, toWorkoutState } = createPullupAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) =>
          toWorkoutState(analyzer.analyze(pose, assessTrackingForExercise(id, pose))),
      };
    }
    case "squat-jump": {
      const { analyzer, toWorkoutState } = createSquatJumpAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) =>
          toWorkoutState(analyzer.analyze(pose, assessTrackingForExercise(id, pose))),
      };
    }
    case "abs": {
      const { analyzer, toWorkoutState } = createAbsAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) =>
          toWorkoutState(analyzer.analyze(pose, assessTrackingForExercise(id, pose))),
      };
    }
  }
}

export function idleWorkoutState(id: ExerciseId): WorkoutState {
  const def = getExerciseDefinition(id);
  return {
    exerciseId: id,
    exerciseName: def.name,
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
    cameraHint: def.cameraHint,
    debugLines: [],
  };
}

export const DEFAULT_EXERCISE_ID: ExerciseId = "squat";

export function isExerciseId(value: string): value is ExerciseId {
  return EXERCISE_REGISTRY.some((e) => e.id === value);
}
