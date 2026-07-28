import {
  bestFlexionAngle,
  calculateAngleSafe,
  midpoint,
} from "@/lib/geometry/calculateAngle";
import { elbowFlexionAngle } from "@/lib/geometry/flexionSignal";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PushupMetrics {
  cameraView: CameraView;
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  averageElbowAngle: number | null;
  /** View-aware elbow flexion used for rep counting. */
  flexionAngle: number | null;
  /** Shoulder → hip → ankle; ~180° = straight body line (meaningful in side view). */
  bodyLineAngle: number | null;
}

export const EMPTY_PUSHUP_METRICS: PushupMetrics = {
  cameraView: "unknown",
  leftElbowAngle: null,
  rightElbowAngle: null,
  averageElbowAngle: null,
  flexionAngle: null,
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

function hasArmChain(
  pose: Pose,
  side: "left" | "right",
): boolean {
  const shoulder = side === "left" ? pose.leftShoulder : pose.rightShoulder;
  const elbow = side === "left" ? pose.leftElbow : pose.rightElbow;
  const wrist = side === "left" ? pose.leftWrist : pose.rightWrist;

  return (
    shoulder !== undefined &&
    elbow !== undefined &&
    wrist !== undefined &&
    shoulder.confidence >= MIN_CONFIDENCE &&
    elbow.confidence >= MIN_CONFIDENCE &&
    wrist.confidence >= MIN_CONFIDENCE
  );
}

export function calculatePushupMetrics(pose: Pose | null): PushupMetrics {
  if (!pose) return EMPTY_PUSHUP_METRICS;

  const cameraView = detectCameraView(pose);

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

  const flexionAngle = elbowFlexionAngle(
    leftElbowAngle,
    rightElbowAngle,
    cameraView,
  );

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
    cameraView,
    leftElbowAngle,
    rightElbowAngle,
    averageElbowAngle,
    flexionAngle,
    bodyLineAngle,
  };
}

export function assessPushupTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const view = detectCameraView(pose);
  const hipsVisible =
    pose.leftHip !== undefined &&
    pose.rightHip !== undefined &&
    pose.leftHip.confidence >= MIN_CONFIDENCE &&
    pose.rightHip.confidence >= MIN_CONFIDENCE;

  if (!hipsVisible) return "poor";

  if (view === "front") {
    const visible = PUSHUP_REQUIRED_LANDMARKS.filter((key) => {
      const point = pose[key];
      return point !== undefined && point.confidence >= MIN_CONFIDENCE;
    }).length;

    return visible >= PUSHUP_REQUIRED_LANDMARKS.length - 1 ? "good" : "poor";
  }

  const oneArm = hasArmChain(pose, "left") || hasArmChain(pose, "right");
  const oneShoulder =
    (pose.leftShoulder !== undefined &&
      pose.leftShoulder.confidence >= MIN_CONFIDENCE) ||
    (pose.rightShoulder !== undefined &&
      pose.rightShoulder.confidence >= MIN_CONFIDENCE);

  return oneArm && oneShoulder ? "good" : "poor";
}

export { bestFlexionAngle };
