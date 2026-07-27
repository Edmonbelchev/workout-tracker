import { calculateAngleSafe, midpoint } from "@/lib/geometry/calculateAngle";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PullupMetrics {
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  averageElbowAngle: number | null;
  /** Shoulder Y − wrist Y; positive = wrists above shoulders. */
  wristClearance: number | null;
}

export const EMPTY_PULLUP_METRICS: PullupMetrics = {
  leftElbowAngle: null,
  rightElbowAngle: null,
  averageElbowAngle: null,
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

export function calculatePullupMetrics(pose: Pose | null): PullupMetrics {
  if (!pose) return EMPTY_PULLUP_METRICS;

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

  return {
    leftElbowAngle,
    rightElbowAngle,
    averageElbowAngle,
    wristClearance,
  };
}

export function assessPullupTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const visible = PULLUP_REQUIRED_LANDMARKS.filter((key) => {
    const point = pose[key];
    return point !== undefined && point.confidence >= MIN_CONFIDENCE;
  }).length;

  return visible >= PULLUP_REQUIRED_LANDMARKS.length - 1 ? "good" : "poor";
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
