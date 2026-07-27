"use client";

import { useEffect, useRef, useState } from "react";

import {
  createExerciseRuntime,
  idleWorkoutState,
} from "@/lib/exercises/registry";
import type { ExerciseId, WorkoutState } from "@/lib/exercises/types";
import type { Pose } from "@/lib/pose/types";

const UI_UPDATE_INTERVAL_MS = 100;

export interface UseExerciseAnalysisOptions {
  exerciseId: ExerciseId;
  enabled: boolean;
  poseRef: React.RefObject<Pose | null>;
  debug?: boolean;
}

/**
 * Single throttled loop for exercise analysis — replaces separate metrics/analyzer hooks.
 */
export function useExerciseAnalysis({
  exerciseId,
  enabled,
  poseRef,
  debug = false,
}: UseExerciseAnalysisOptions): WorkoutState {
  const [workoutState, setWorkoutState] = useState<WorkoutState>(() =>
    idleWorkoutState(exerciseId),
  );
  const runtimeRef = useRef(createExerciseRuntime(exerciseId, { debug }));
  const debugRef = useRef(debug);

  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);

  useEffect(() => {
    runtimeRef.current = createExerciseRuntime(exerciseId, {
      debug: debugRef.current,
      onTransition: (line) => {
        if (debugRef.current) {
          console.log(`[${exerciseId}] ${line}`);
        }
      },
    });

    return () => {
      runtimeRef.current.reset();
    };
  }, [exerciseId]);

  useEffect(() => {
    if (!enabled) return;

    let lastUpdate = 0;
    let rafId: number;

    const tick = (now: number) => {
      if (now - lastUpdate >= UI_UPDATE_INTERVAL_MS) {
        const pose = poseRef.current;
        setWorkoutState(runtimeRef.current.analyze(pose));
        lastUpdate = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      runtimeRef.current.reset();
    };
  }, [enabled, exerciseId, poseRef]);

  if (!enabled || workoutState.exerciseId !== exerciseId) {
    return idleWorkoutState(exerciseId);
  }

  return workoutState;
}
