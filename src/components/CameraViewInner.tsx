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

  const selectorDisabled = status === "requesting";
  const cameraActive = detectionEnabled;

  return (
    <div
      className={
        cameraActive
          ? "fixed inset-0 z-0 h-dvh w-full overflow-hidden bg-black"
          : "relative flex min-h-full flex-1 flex-col bg-zinc-950"
      }
    >
      {cameraActive && <WorkoutHUD workout={workout} />}

      {cameraActive && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
          <div className="pointer-events-auto flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <ExerciseSelector
                value={exerciseId}
                onChange={setExerciseId}
                disabled={selectorDisabled}
              />
            </div>
            <button
              type="button"
              onClick={stop}
              className="shrink-0 rounded-full border border-zinc-600/80 bg-zinc-950/85 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md transition hover:border-zinc-400 hover:bg-zinc-900"
            >
              Stop
            </button>
          </div>

          {isDetectorReady &&
            workout.trackingQuality === "poor" &&
            workout.isAvailable && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/85 px-3 py-2 text-center text-sm text-amber-200 backdrop-blur-md">
                {workout.cameraHint}
              </div>
            )}
        </div>
      )}

      <div
        className={
          cameraActive
            ? "absolute inset-0"
            : "flex flex-1 flex-col items-center justify-center px-3 pb-20 pt-8 sm:px-4 sm:pb-16"
        }
      >
        {!cameraActive && (
          <div className="mb-4 w-full max-w-lg pointer-events-auto">
            <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-zinc-500">
              Exercise
            </p>
            <ExerciseSelector
              value={exerciseId}
              onChange={setExerciseId}
              disabled={selectorDisabled}
            />
          </div>
        )}

        <div
          className={
            cameraActive
              ? "absolute inset-0"
              : "relative aspect-[3/4] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl shadow-black/50"
          }
        >
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
      </div>

      {!cameraActive && (
        <>
          <PrivacyNotice />
          {!debug && <DebugHint />}
        </>
      )}
      {debug && (
        <DebugPanel
          workout={workout}
          fps={fps}
          overlay={cameraActive}
        />
      )}
    </div>
  );
}
