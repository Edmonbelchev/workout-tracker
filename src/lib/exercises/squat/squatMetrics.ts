import {
  calculateAngleSafe,
  calculateTorsoInclination,
  midpoint,
} from "@/lib/geometry/calculateAngle";
import type { Pose } from "@/lib/pose/types";

/** Raw joint measurements derived from a pose — no state machine or rep logic. */
export interface SquatMetrics {
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  torsoInclination: number | null;
  /** Mean of available knee angles — useful for squat phase detection later. */
  averageKneeAngle: number | null;
}

export const EMPTY_SQUAT_METRICS: SquatMetrics = {
  leftKneeAngle: null,
  rightKneeAngle: null,
  leftHipAngle: null,
  rightHipAngle: null,
  torsoInclination: null,
  averageKneeAngle: null,
};

/**
 * Computes squat-relevant angles from normalized pose landmarks.
 *
 * Knee angle: hip → knee → ankle (flexion at knee).
 * Hip angle: shoulder → hip → knee (flexion at hip).
 */
export function calculateSquatMetrics(pose: Pose | null): SquatMetrics {
  if (!pose) return EMPTY_SQUAT_METRICS;

  const leftKneeAngle = calculateAngleSafe(
    pose.leftHip,
    pose.leftKnee,
    pose.leftAnkle,
  );
  const rightKneeAngle = calculateAngleSafe(
    pose.rightHip,
    pose.rightKnee,
    pose.rightAnkle,
  );

  const leftHipAngle = calculateAngleSafe(
    pose.leftShoulder,
    pose.leftHip,
    pose.leftKnee,
  );
  const rightHipAngle = calculateAngleSafe(
    pose.rightShoulder,
    pose.rightHip,
    pose.rightKnee,
  );

  let torsoInclination: number | null = null;
  if (
    pose.leftShoulder &&
    pose.rightShoulder &&
    pose.leftHip &&
    pose.rightHip &&
    pose.leftShoulder.confidence >= 0.5 &&
    pose.rightShoulder.confidence >= 0.5 &&
    pose.leftHip.confidence >= 0.5 &&
    pose.rightHip.confidence >= 0.5
  ) {
    const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
    const hipMid = midpoint(pose.leftHip, pose.rightHip);
    const angle = calculateTorsoInclination(shoulderMid, hipMid);
    torsoInclination = Number.isFinite(angle) ? angle : null;
  }

  const kneeAngles = [leftKneeAngle, rightKneeAngle].filter(
    (angle): angle is number => angle !== null,
  );
  const averageKneeAngle =
    kneeAngles.length > 0
      ? kneeAngles.reduce((sum, angle) => sum + angle, 0) / kneeAngles.length
      : null;

  return {
    leftKneeAngle,
    rightKneeAngle,
    leftHipAngle,
    rightHipAngle,
    torsoInclination,
    averageKneeAngle,
  };
}

export { formatAngle } from "@/lib/geometry/formatAngle";
