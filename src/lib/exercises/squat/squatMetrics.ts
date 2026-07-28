import {
  calculateAngleSafe,
  calculateTorsoInclination,
  midpoint,
} from "@/lib/geometry/calculateAngle";
import { squatFlexionAngle } from "@/lib/geometry/flexionSignal";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

/** Raw joint measurements derived from a pose — no state machine or rep logic. */
export interface SquatMetrics {
  cameraView: CameraView;
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  torsoInclination: number | null;
  /** Mean of available knee angles — shown in HUD. */
  averageKneeAngle: number | null;
  /** View-aware depth signal used for rep counting. */
  flexionAngle: number | null;
}

export const EMPTY_SQUAT_METRICS: SquatMetrics = {
  cameraView: "unknown",
  leftKneeAngle: null,
  rightKneeAngle: null,
  leftHipAngle: null,
  rightHipAngle: null,
  torsoInclination: null,
  averageKneeAngle: null,
  flexionAngle: null,
};

/**
 * Computes squat-relevant angles from normalized pose landmarks.
 *
 * Knee angle: hip → knee → ankle (flexion at knee).
 * Hip angle: shoulder → hip → knee (flexion at hip).
 */
export function calculateSquatMetrics(pose: Pose | null): SquatMetrics {
  if (!pose) return EMPTY_SQUAT_METRICS;

  const cameraView = detectCameraView(pose);

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

  const flexionAngle = squatFlexionAngle(
    leftKneeAngle,
    rightKneeAngle,
    leftHipAngle,
    rightHipAngle,
    cameraView,
  );

  return {
    cameraView,
    leftKneeAngle,
    rightKneeAngle,
    leftHipAngle,
    rightHipAngle,
    torsoInclination,
    averageKneeAngle,
    flexionAngle,
  };
}

function hasLegChain(pose: Pose, side: "left" | "right"): boolean {
  const hip = side === "left" ? pose.leftHip : pose.rightHip;
  const knee = side === "left" ? pose.leftKnee : pose.rightKnee;
  const ankle = side === "left" ? pose.leftAnkle : pose.rightAnkle;

  return (
    hip !== undefined &&
    knee !== undefined &&
    ankle !== undefined &&
    hip.confidence >= 0.5 &&
    knee.confidence >= 0.5 &&
    ankle.confidence >= 0.5
  );
}

export function assessSquatTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const view = detectCameraView(pose);

  if (view === "front") {
    const visible = [
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
      "leftKnee",
      "rightKnee",
      "leftAnkle",
      "rightAnkle",
    ].filter((key) => {
      const point = pose[key as keyof Pose];
      return point !== undefined && point.confidence >= 0.5;
    }).length;

    return visible >= 7 ? "good" : "poor";
  }

  const oneLeg = hasLegChain(pose, "left") || hasLegChain(pose, "right");
  const oneShoulder =
    (pose.leftShoulder !== undefined && pose.leftShoulder.confidence >= 0.5) ||
    (pose.rightShoulder !== undefined && pose.rightShoulder.confidence >= 0.5);

  return oneLeg && oneShoulder ? "good" : "poor";
}

export { formatAngle } from "@/lib/geometry/formatAngle";
