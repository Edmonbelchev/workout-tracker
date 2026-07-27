"use client";

import { useEffect, useRef, useState } from "react";

import {
  calculateSquatMetrics,
  EMPTY_SQUAT_METRICS,
  type SquatMetrics,
} from "@/lib/exercises/squat/squatMetrics";
import { ExponentialMovingAverage, smoothNullable } from "@/lib/geometry/smoothing";
import type { Pose } from "@/lib/pose/types";

const UI_UPDATE_INTERVAL_MS = 100;

export interface UseSquatMetricsOptions {
  enabled: boolean;
  poseRef: React.RefObject<Pose | null>;
}

function createSmoothers() {
  return {
    leftKnee: new ExponentialMovingAverage(0.3),
    rightKnee: new ExponentialMovingAverage(0.3),
    leftHip: new ExponentialMovingAverage(0.3),
    rightHip: new ExponentialMovingAverage(0.3),
    torso: new ExponentialMovingAverage(0.3),
    averageKnee: new ExponentialMovingAverage(0.3),
  };
}

function smoothMetrics(
  raw: SquatMetrics,
  smoothers: ReturnType<typeof createSmoothers>,
): SquatMetrics {
  return {
    leftKneeAngle: smoothNullable(smoothers.leftKnee, raw.leftKneeAngle),
    rightKneeAngle: smoothNullable(smoothers.rightKnee, raw.rightKneeAngle),
    leftHipAngle: smoothNullable(smoothers.leftHip, raw.leftHipAngle),
    rightHipAngle: smoothNullable(smoothers.rightHip, raw.rightHipAngle),
    torsoInclination: smoothNullable(smoothers.torso, raw.torsoInclination),
    averageKneeAngle: smoothNullable(smoothers.averageKnee, raw.averageKneeAngle),
  };
}

/**
 * Derives squat joint angles from poseRef on a throttled interval.
 * Smoothing reduces HUD jitter without adding noticeable lag.
 */
export function useSquatMetrics({
  enabled,
  poseRef,
}: UseSquatMetricsOptions): SquatMetrics {
  const smoothersRef = useRef(createSmoothers());
  const [metrics, setMetrics] = useState<SquatMetrics>(EMPTY_SQUAT_METRICS);

  useEffect(() => {
    if (!enabled) {
      smoothersRef.current = createSmoothers();
      return;
    }

    let lastUpdate = 0;
    let rafId: number;

    const tick = (now: number) => {
      if (now - lastUpdate >= UI_UPDATE_INTERVAL_MS) {
        const raw = calculateSquatMetrics(poseRef.current);
        setMetrics(smoothMetrics(raw, smoothersRef.current));
        lastUpdate = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      smoothersRef.current = createSmoothers();
    };
  }, [enabled, poseRef]);

  if (!enabled) {
    return EMPTY_SQUAT_METRICS;
  }

  return metrics;
}
