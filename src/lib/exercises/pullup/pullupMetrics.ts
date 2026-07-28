import {
  bestFlexionAngle,
  calculateAngleSafe,
  midpoint,
} from "@/lib/geometry/calculateAngle";
import { pullupFlexionAngle } from "@/lib/geometry/flexionSignal";
import { detectCameraView, isCoronalView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PullupMetrics {
  cameraView: CameraView;
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  averageElbowAngle: number | null;
  /** View-aware flexion used for rep counting. */
  flexionAngle: number | null;
  /** Shoulder Y − wrist Y; positive = wrists above shoulders. */
  wristClearance: number | null;
}

export const EMPTY_PULLUP_METRICS: PullupMetrics = {
  cameraView: "unknown",
  leftElbowAngle: null,
  rightElbowAngle: null,
  averageElbowAngle: null,
  flexionAngle: null,
  wristClearance: null,
};

export const PULLUP_REQUIRED_LANDMARKS: (keyof Pose)[] = [
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
];

const MIN_CONFIDENCE = 0.5;

function hasArmChain(pose: Pose, side: "left" | "right"): boolean {
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

export function calculatePullupMetrics(pose: Pose | null): PullupMetrics {
  if (!pose) return EMPTY_PULLUP_METRICS;

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

  let wristClearance: number | null = null;
  if (
    pose.leftShoulder &&
    pose.rightShoulder &&
    pose.leftWrist &&
    pose.rightWrist &&
    pose.leftShoulder.confidence >= MIN_CONFIDENCE &&
    pose.rightShoulder.confidence >= MIN_CONFIDENCE &&
    pose.leftWrist.confidence >= MIN_CONFIDENCE &&
    pose.rightWrist.confidence >= MIN_CONFIDENCE
  ) {
    const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
    const wristMid = midpoint(pose.leftWrist, pose.rightWrist);
    wristClearance = shoulderMid.y - wristMid.y;
  }

  const flexionAngle = pullupFlexionAngle(
    leftElbowAngle,
    rightElbowAngle,
    wristClearance,
    cameraView,
  );

  return {
    cameraView,
    leftElbowAngle,
    rightElbowAngle,
    averageElbowAngle,
    flexionAngle,
    wristClearance,
  };
}

export function assessPullupTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const view = detectCameraView(pose);

  if (isCoronalView(view)) {
    const shoulders =
      pose.leftShoulder !== undefined &&
      pose.rightShoulder !== undefined &&
      pose.leftShoulder.confidence >= MIN_CONFIDENCE &&
      pose.rightShoulder.confidence >= MIN_CONFIDENCE;
    const wrists =
      pose.leftWrist !== undefined &&
      pose.rightWrist !== undefined &&
      pose.leftWrist.confidence >= MIN_CONFIDENCE &&
      pose.rightWrist.confidence >= MIN_CONFIDENCE;

    return shoulders && wrists ? "good" : "poor";
  }

  const oneArm = hasArmChain(pose, "left") || hasArmChain(pose, "right");
  const oneShoulder =
    (pose.leftShoulder !== undefined &&
      pose.leftShoulder.confidence >= MIN_CONFIDENCE) ||
    (pose.rightShoulder !== undefined &&
      pose.rightShoulder.confidence >= MIN_CONFIDENCE);

  return oneArm && oneShoulder ? "good" : "poor";
}

export function isAtTop(
  elbowAngle: number,
  wristClearance: number | null,
  rules: { topElbowAngleMax: number; topWristClearanceMin: number },
): boolean {
  if (elbowAngle <= rules.topElbowAngleMax) return true;
  if (wristClearance !== null && wristClearance >= rules.topWristClearanceMin) {
    return true;
  }
  return false;
}

export function isOutOfTop(
  elbowAngle: number,
  wristClearance: number | null,
  rules: { topElbowAngleMin: number; topWristClearanceExit: number },
): boolean {
  if (elbowAngle > rules.topElbowAngleMin) return true;
  if (wristClearance !== null && wristClearance < rules.topWristClearanceExit) {
    return true;
  }
  return false;
}

export { bestFlexionAngle };
