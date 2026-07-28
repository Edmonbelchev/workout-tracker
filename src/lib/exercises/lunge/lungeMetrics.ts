import { calculateAngleSafe } from "@/lib/geometry/calculateAngle";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

import type { LungeLeg } from "./lungeRules";

export interface LungeMetrics {
  cameraView: CameraView;
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  activeLeg: LungeLeg | null;
  /** Front (working) knee flexion for rep logic. */
  flexionAngle: number | null;
  /** Rear knee angle — should stay extended during lunge. */
  rearKneeAngle: number | null;
}

export const EMPTY_LUNGE_METRICS: LungeMetrics = {
  cameraView: "unknown",
  leftKneeAngle: null,
  rightKneeAngle: null,
  activeLeg: null,
  flexionAngle: null,
  rearKneeAngle: null,
};

const MIN_CONFIDENCE = 0.5;

function hasLegChain(pose: Pose, side: "left" | "right"): boolean {
  const hip = side === "left" ? pose.leftHip : pose.rightHip;
  const knee = side === "left" ? pose.leftKnee : pose.rightKnee;
  const ankle = side === "left" ? pose.leftAnkle : pose.rightAnkle;
  return (
    hip !== undefined &&
    knee !== undefined &&
    ankle !== undefined &&
    hip.confidence >= MIN_CONFIDENCE &&
    knee.confidence >= MIN_CONFIDENCE &&
    ankle.confidence >= MIN_CONFIDENCE
  );
}

export function inferActiveLeg(
  leftKnee: number | null,
  rightKnee: number | null,
  locked: LungeLeg | null,
): LungeLeg | null {
  if (locked) return locked;

  if (leftKnee !== null && rightKnee !== null) {
    if (leftKnee < rightKnee - 15) return "left";
    if (rightKnee < leftKnee - 15) return "right";
  }

  return null;
}

export function calculateLungeMetrics(
  pose: Pose | null,
  lockedLeg: LungeLeg | null,
): LungeMetrics {
  if (!pose) return EMPTY_LUNGE_METRICS;

  const cameraView = detectCameraView(pose);
  const leftKneeAngle = calculateAngleSafe(pose.leftHip, pose.leftKnee, pose.leftAnkle);
  const rightKneeAngle = calculateAngleSafe(pose.rightHip, pose.rightKnee, pose.rightAnkle);

  const activeLeg = inferActiveLeg(leftKneeAngle, rightKneeAngle, lockedLeg);
  let flexionAngle: number | null = null;
  let rearKneeAngle: number | null = null;

  if (activeLeg === "left") {
    flexionAngle = leftKneeAngle;
    rearKneeAngle = rightKneeAngle;
  } else if (activeLeg === "right") {
    flexionAngle = rightKneeAngle;
    rearKneeAngle = leftKneeAngle;
  } else if (leftKneeAngle !== null && rightKneeAngle !== null) {
    flexionAngle = Math.min(leftKneeAngle, rightKneeAngle);
  }

  return {
    cameraView,
    leftKneeAngle,
    rightKneeAngle,
    activeLeg,
    flexionAngle,
    rearKneeAngle,
  };
}

export function assessLungeTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const oneLeg = hasLegChain(pose, "left") || hasLegChain(pose, "right");
  const oneShoulder =
    (pose.leftShoulder !== undefined && pose.leftShoulder.confidence >= MIN_CONFIDENCE) ||
    (pose.rightShoulder !== undefined && pose.rightShoulder.confidence >= MIN_CONFIDENCE);

  return oneLeg && oneShoulder ? "good" : "poor";
}
