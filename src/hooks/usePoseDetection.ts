"use client";

import { useEffect, useRef, useState } from "react";

import { createPoseDetector, type PoseDetector } from "@/lib/pose/poseDetector";
import type { Pose, PoseDetectionResult, TrackingQuality } from "@/lib/pose/types";

const UI_UPDATE_INTERVAL_MS = 100;

export interface UsePoseDetectionOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onResult?: (result: PoseDetectionResult) => void;
}

export interface UsePoseDetectionResult {
  poseRef: React.RefObject<Pose | null>;
  trackingQuality: TrackingQuality;
  isDetectorReady: boolean;
  detectorError: string | null;
  fps: number;
}

/**
 * Runs pose detection on a video element outside React's render cycle.
 * poseRef is updated every frame; React state is throttled for HUD updates.
 */
export function usePoseDetection({
  enabled,
  videoRef,
  onResult,
}: UsePoseDetectionOptions): UsePoseDetectionResult {
  const poseRef = useRef<Pose | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const frameCountRef = useRef(0);
  const lastFpsTickRef = useRef(0);

  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality>("poor");
  const [isDetectorReady, setIsDetectorReady] = useState(false);
  const [detectorError, setDetectorError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let cancelled = false;

    createPoseDetector()
      .then((detector) => {
        if (cancelled) {
          detector.close();
          return;
        }
        detectorRef.current = detector;
        setIsDetectorReady(true);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Failed to initialize pose detector.";
        setDetectorError(message);
      });

    return () => {
      cancelled = true;
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !isDetectorReady) return;

    let lastUiUpdate = 0;
    lastFpsTickRef.current = performance.now();

    const tick = (now: number) => {
      const video = videoRef.current;
      const detector = detectorRef.current;

      if (video && detector && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const timestampMs = performance.now();
          const result = detector.detectForVideo(video, timestampMs);

          poseRef.current = result.pose;

          if (now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
            setTrackingQuality(result.trackingQuality);
            lastUiUpdate = now;
          }

          onResult?.(result);

          frameCountRef.current += 1;
          if (now - lastFpsTickRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsTickRef.current = now;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      lastVideoTimeRef.current = -1;
      poseRef.current = null;
    };
  }, [enabled, isDetectorReady, onResult, videoRef]);

  return {
    poseRef,
    trackingQuality,
    isDetectorReady,
    detectorError,
    fps,
  };
}
