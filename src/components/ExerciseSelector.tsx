"use client";

import { useCallback, useState } from "react";

import { EXERCISE_REGISTRY } from "@/lib/exercises/registry";
import type { ExerciseId } from "@/lib/exercises/types";

const STORAGE_KEY = "exercise-tracker:selected-exercise";

interface ExerciseSelectorProps {
  value: ExerciseId;
  onChange: (id: ExerciseId) => void;
  disabled?: boolean;
}

function readStoredExercise(): ExerciseId {
  if (typeof window === "undefined") return "squat";
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored && EXERCISE_REGISTRY.some((e) => e.id === stored)) {
    return stored as ExerciseId;
  }
  return "squat";
}

export function useSelectedExercise(): [ExerciseId, (id: ExerciseId) => void] {
  const [exerciseId, setExerciseId] = useState<ExerciseId>(readStoredExercise);

  const setAndPersist = useCallback((id: ExerciseId) => {
    setExerciseId(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  }, []);

  return [exerciseId, setAndPersist];
}

export function ExerciseSelector({ value, onChange, disabled }: ExerciseSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXERCISE_REGISTRY.map((exercise) => {
        const isActive = exercise.id === value;
        const isSoon = exercise.status === "coming-soon";

        return (
          <button
            key={exercise.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(exercise.id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              isActive
                ? "bg-emerald-500 text-zinc-950"
                : "border border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-zinc-500",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {exercise.name}
            {isSoon && !isActive && (
              <span className="ml-1 text-[10px] text-zinc-500">soon</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
