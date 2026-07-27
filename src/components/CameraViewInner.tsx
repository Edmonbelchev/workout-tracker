"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { DebugPanel } from "@/components/DebugPanel";
import { ExerciseSelector, useSelectedExercise } from "@/components/ExerciseSelector";
import { PoseOverlay } from "@/components/PoseOverlay";
import {
  DebugHint,
  PrivacyNotice,
  WorkoutHUD,
} from "@/components/WorkoutHUD";
import { useCamera } from "@/hooks/useCamera";
import { useExerciseAnalysis } from "@/hooks/useExerciseAnalysis";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { useSpeechFeedback } from "@/hooks/useSpeechFeedback";
import { getExerciseDefinition } from "@/lib/exercises/registry";

export function CameraViewInner() {
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "1";
  const [exerciseId, setExerciseId] = useSelectedExercise();
  const exerciseDef = getExerciseDefinition(exerciseId);

  const { videoRef, status, error, start, stop } = useCamera();
  const detectionEnabled = status === "active";
  const analysisEnabled = detectionEnabled && exerciseDef.status === "available";

  const { poseRef, isDetectorReady, detectorError, fps } =
    usePoseDetection({
      enabled: detectionEnabled,
      videoRef,
    });

  const workout = useExerciseAnalysis({
    exerciseId,
    enabled: detectionEnabled && isDetectorReady,
    poseRef,
    debug,
  });

  useSpeechFeedback({
    enabled: analysisEnabled && isDetectorReady,
    workout,
  });

  const handleStart = useCallback(async () => {
    await start();
  }, [start]);

  const cameraIdle = status === "idle" || status === "error";

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-zinc-950">
      <WorkoutHUD
        workout={workout}
        trackingQuality={workout.trackingQuality}
        isDetectorReady={isDetectorReady}
        debug={debug}
      />

      <div className="flex flex-1 flex-col items-center justify-center px-3 pb-20 pt-28 sm:px-4 sm:pb-16 sm:pt-32">
        <div className="mb-4 w-full max-w-lg pointer-events-auto">
          <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-zinc-500">
            Exercise
          </p>
          <ExerciseSelector
            value={exerciseId}
            onChange={setExerciseId}
            disabled={!cameraIdle}
          />
          {!cameraIdle && (
            <p className="mt-2 text-center text-xs text-zinc-600">
              Stop camera to switch exercises
            </p>
          )}
        </div>

        <div className="relative aspect-[3/4] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl shadow-black/50">
          <div className="absolute inset-0 scale-x-[-1]">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
            />
            {detectionEnabled && isDetectorReady && (
              <PoseOverlay videoRef={videoRef} poseRef={poseRef} debug={debug} />
            )}
          </div>

          {status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/90 p-6 text-center">
              <p className="text-zinc-300">{exerciseDef.cameraHint}</p>
              {exerciseDef.status === "coming-soon" && (
                <p className="text-sm text-amber-300/90">
                  {exerciseDef.name} tracking is coming soon. You can still preview the pose
                  skeleton.
                </p>
              )}
              <button
                type="button"
                onClick={handleStart}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                Start Camera
              </button>
            </div>
          )}

          {status === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90">
              <p className="text-zinc-400">Requesting camera access…</p>
            </div>
          )}

          {(status === "error" || detectorError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/90 p-6 text-center">
              <p className="text-red-400">{error ?? detectorError}</p>
              <button
                type="button"
                onClick={handleStart}
                className="rounded-full border border-zinc-600 px-5 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Try Again
              </button>
            </div>
          )}

          {!isDetectorReady && status === "active" && !detectorError && (
            <div className="absolute inset-x-0 bottom-4 text-center">
              <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-xs text-zinc-400 backdrop-blur">
                Loading pose model…
              </span>
            </div>
          )}
        </div>

        {status === "active" && (
          <button
            type="button"
            onClick={stop}
            className="mt-4 text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            Stop camera
          </button>
        )}
      </div>

      <PrivacyNotice />
      {debug && <DebugPanel workout={workout} fps={fps} />}
      {!debug && <DebugHint />}
    </div>
  );
}
