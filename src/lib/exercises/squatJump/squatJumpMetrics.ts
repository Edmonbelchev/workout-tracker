import { calculateSquatMetrics, type SquatMetrics } from "@/lib/exercises/squat/squatMetrics";
import { midpoint } from "@/lib/geometry/calculateAngle";
import type { Pose } from "@/lib/pose/types";

export interface SquatJumpMetrics extends SquatMetrics {
  hipMidY: number | null;
  /** Normalized y delta per frame; negative = hip moving up. */
  hipDeltaY: number | null;
}

export const EMPTY_SQUAT_JUMP_METRICS: SquatJumpMetrics = {
  ...calculateSquatMetrics(null),
  hipMidY: null,
  hipDeltaY: null,
};

export function calculateSquatJumpMetrics(
  pose: Pose | null,
  previousHipMidY: number | null,
): SquatJumpMetrics {
  const base = calculateSquatMetrics(pose);

  if (!pose?.leftHip || !pose?.rightHip) {
    return { ...base, hipMidY: null, hipDeltaY: null };
  }

  if (pose.leftHip.confidence < 0.5 || pose.rightHip.confidence < 0.5) {
    return { ...base, hipMidY: null, hipDeltaY: null };
  }

  const hipMid = midpoint(pose.leftHip, pose.rightHip);
  const hipMidY = hipMid.y;
  const hipDeltaY =
    previousHipMidY !== null ? hipMidY - previousHipMidY : null;

  return { ...base, hipMidY, hipDeltaY };
}
