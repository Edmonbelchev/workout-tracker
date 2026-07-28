import { createAbsAdapter } from "@/lib/exercises/abs/absAdapter";
import { assessAbsTrackingQuality } from "@/lib/exercises/abs/absMetrics";
import { createBurpeeAdapter } from "@/lib/exercises/burpee/burpeeAdapter";
import { assessBurpeeTrackingQuality } from "@/lib/exercises/burpee/burpeeMetrics";
import { createDipsAdapter } from "@/lib/exercises/dips/dipsAdapter";
import { assessDipsTrackingQuality } from "@/lib/exercises/dips/dipsMetrics";
import { createJumpingJackAdapter } from "@/lib/exercises/jumpingJack/jumpingJackAdapter";
import { assessJumpingJackTrackingQuality } from "@/lib/exercises/jumpingJack/jumpingJackMetrics";
import { createLungeAdapter } from "@/lib/exercises/lunge/lungeAdapter";
import { assessLungeTrackingQuality } from "@/lib/exercises/lunge/lungeMetrics";
import { createPlankAdapter } from "@/lib/exercises/plank/plankAdapter";
import { assessPlankTrackingQuality } from "@/lib/exercises/plank/plankMetrics";
import { createPullupAdapter } from "@/lib/exercises/pullup/pullupAdapter";
import { assessPullupTrackingQuality } from "@/lib/exercises/pullup/pullupMetrics";
import { createPushupAdapter } from "@/lib/exercises/pushup/pushupAdapter";
import { assessPushupTrackingQuality } from "@/lib/exercises/pushup/pushupMetrics";
import { createSquatAdapter } from "@/lib/exercises/squat/squatAdapter";
import { assessSquatTrackingQuality } from "@/lib/exercises/squat/squatMetrics";
import { createSquatJumpAdapter } from "@/lib/exercises/squatJump/squatJumpAdapter";
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
    cameraHint: "Front or side view — keep your full body in frame.",
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
    id: "lunge",
    name: "Lunge",
    description: "Count alternating lunges with left/right leg tracking.",
    cameraHint: "Front or side view — full body with room to step forward.",
    status: "available",
    requiredLandmarks: [
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ],
    createAnalyzer: (options) => createLungeAdapter(options).analyzer,
  },
  {
    id: "push-up",
    name: "Push-up",
    description: "Count reps from push-ups using elbow angles.",
    cameraHint: "Front or side view — show shoulders, arms, and hips.",
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
    id: "dips",
    name: "Dips",
    description: "Count dip reps using elbow flexion on parallel bars.",
    cameraHint: "Front or side view — show arms, shoulders, and hips.",
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
    createAnalyzer: (options) => createDipsAdapter(options).analyzer,
  },
  {
    id: "pull-up",
    name: "Pull-up",
    description: "Count reps using elbow flexion and wrist height.",
    cameraHint: "Front, back, or side view — full body with hands overhead.",
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
    id: "plank",
    name: "Plank",
    description: "Track plank hold time and body alignment.",
    cameraHint: "Side view — show shoulders, arms, and hips in plank.",
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
    createAnalyzer: (options) => createPlankAdapter(options).analyzer,
  },
  {
    id: "jumping-jack",
    name: "Jumping jack",
    description: "Count reps when arms and legs open and close together.",
    cameraHint: "Front view works best — full body head to feet.",
    status: "available",
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftWrist",
      "rightWrist",
      "leftHip",
      "rightHip",
      "leftAnkle",
      "rightAnkle",
    ],
    createAnalyzer: (options) => createJumpingJackAdapter(options).analyzer,
  },
  {
    id: "burpee",
    name: "Burpee",
    description: "Count full burpee cycles: squat, plank, push, and jump.",
    cameraHint: "Front or side view — full body with space to move.",
    status: "available",
    requiredLandmarks: [
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftWrist",
      "rightWrist",
    ],
    createAnalyzer: (options) => createBurpeeAdapter(options).analyzer,
  },
  {
    id: "squat-jump",
    name: "Squat jump",
    description: "Count reps when you squat, jump, and land.",
    cameraHint: "Front or side view — full body with feet visible.",
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
    cameraHint: "Front or side view — show shoulders, hips, and knees.",
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
    case "squat":
    case "squat-jump":
      return assessSquatTrackingQuality(pose);
    case "lunge":
      return assessLungeTrackingQuality(pose);
    case "push-up":
      return assessPushupTrackingQuality(pose);
    case "dips":
      return assessDipsTrackingQuality(pose);
    case "pull-up":
      return assessPullupTrackingQuality(pose);
    case "plank":
      return assessPlankTrackingQuality(pose);
    case "jumping-jack":
      return assessJumpingJackTrackingQuality(pose);
    case "burpee":
      return assessBurpeeTrackingQuality(pose);
    case "abs":
      return assessAbsTrackingQuality(pose);
  }
}

function createRuntimeForExercise(
  id: ExerciseId,
  options?: ExerciseAnalyzerFactoryOptions,
): ExerciseRuntime {
  const quality = (pose: Pose | null) => assessTrackingForExercise(id, pose);

  switch (id) {
    case "squat": {
      const { analyzer, toWorkoutState } = createSquatAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "lunge": {
      const { analyzer, toWorkoutState } = createLungeAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "push-up": {
      const { analyzer, toWorkoutState } = createPushupAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "dips": {
      const { analyzer, toWorkoutState } = createDipsAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "pull-up": {
      const { analyzer, toWorkoutState } = createPullupAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "plank": {
      const { analyzer, toWorkoutState } = createPlankAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "jumping-jack": {
      const { analyzer, toWorkoutState } = createJumpingJackAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "burpee": {
      const { analyzer, toWorkoutState } = createBurpeeAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "squat-jump": {
      const { analyzer, toWorkoutState } = createSquatJumpAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
    case "abs": {
      const { analyzer, toWorkoutState } = createAbsAdapter(options);
      return {
        reset: () => analyzer.reset(),
        analyze: (pose) => toWorkoutState(analyzer.analyze(pose, quality(pose))),
      };
    }
  }
}

export function createExerciseRuntime(
  id: ExerciseId,
  options?: ExerciseAnalyzerFactoryOptions,
): ExerciseRuntime {
  return createRuntimeForExercise(id, options);
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
    counterLabel: id === "plank" ? "Time" : undefined,
  };
}

export const DEFAULT_EXERCISE_ID: ExerciseId = "squat";

export function isExerciseId(value: string): value is ExerciseId {
  return EXERCISE_REGISTRY.some((e) => e.id === value);
}
