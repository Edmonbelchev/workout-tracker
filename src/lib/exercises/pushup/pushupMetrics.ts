import { calculateAngleSafe, midpoint } from "@/lib/geometry/calculateAngle";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PushupMetrics {
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  averageElbowAngle: number | null;
  /** Shoulder → hip → ankle; ~180° = straight body line. */
  bodyLineAngle: number | null;
}

export const EMPTY_PUSHUP_METRICS: PushupMetrics = {
  leftElbowAngle: null,
  rightElbowAngle: null,
  averageElbowAngle: null,
  bodyLineAngle: null,
};

export const PUSHUP_REQUIRED_LANDMARKS: (keyof Pose)[] = [
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
];

const MIN_CONFIDENCE = 0.5;

export function calculatePushupMetrics(pose: Pose | null): PushupMetrics {
  if (!pose) return EMPTY_PUSHUP_METRICS;

  const leftElbowAngle = calculateAngleSafe(
    pose.leftShoulder,
    pose.leftElbow,
    pose.leftWrist,
  );
  const rightElbowAngle = calculateAngleSafe(
    pose.rightShoulder,
    pose.rightElbow,
    pose.rightWrist,
  );

  const elbowAngles = [leftElbowAngle, rightElbowAngle].filter(
    (a): a is number => a !== null,
  );
  const averageElbowAngle =
    elbowAngles.length > 0
      ? elbowAngles.reduce((sum, a) => sum + a, 0) / elbowAngles.length
      : null;

  let bodyLineAngle: number | null = null;
  if (
    pose.leftShoulder &&
    pose.rightShoulder &&
    pose.leftHip &&
    pose.rightHip &&
    pose.leftAnkle &&
    pose.rightAnkle
  ) {
    const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
    const hipMid = midpoint(pose.leftHip, pose.rightHip);
    const ankleMid = midpoint(pose.leftAnkle, pose.rightAnkle);

    if (
      shoulderMid.confidence >= MIN_CONFIDENCE &&
      hipMid.confidence >= MIN_CONFIDENCE &&
      ankleMid.confidence >= MIN_CONFIDENCE
    ) {
      bodyLineAngle = calculateAngleSafe(shoulderMid, hipMid, ankleMid);
    }
  }

  return {
    leftElbowAngle,
    rightElbowAngle,
    averageElbowAngle,
    bodyLineAngle,
  };
}

export function assessPushupTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const visible = PUSHUP_REQUIRED_LANDMARKS.filter((key) => {
    const point = pose[key];
    return point !== undefined && point.confidence >= MIN_CONFIDENCE;
  }).length;

  return visible >= PUSHUP_REQUIRED_LANDMARKS.length - 1 ? "good" : "poor";
}
