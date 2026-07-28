import { calculatePushupMetrics } from "@/lib/exercises/pushup/pushupMetrics";
import { calculateSquatJumpMetrics } from "@/lib/exercises/squatJump/squatJumpMetrics";
import { midpoint } from "@/lib/geometry/calculateAngle";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface BurpeeMetrics {
  cameraView: CameraView;
  kneeFlexion: number | null;
  elbowFlexion: number | null;
  elbowExtension: number | null;
  bodyLineAngle: number | null;
  handsDown: boolean;
  hipDeltaY: number | null;
}

export const EMPTY_BURPEE_METRICS: BurpeeMetrics = {
  cameraView: "unknown",
  kneeFlexion: null,
  elbowFlexion: null,
  elbowExtension: null,
  bodyLineAngle: null,
  handsDown: false,
  hipDeltaY: null,
};

const MIN_CONFIDENCE = 0.5;

export function calculateBurpeeMetrics(
  pose: Pose | null,
  previousHipMidY: number | null,
): BurpeeMetrics {
  if (!pose) return EMPTY_BURPEE_METRICS;

  const cameraView = detectCameraView(pose);
  const squat = calculateSquatJumpMetrics(pose, previousHipMidY);
  const pushup = calculatePushupMetrics(pose);

  const elbowAngles = [pushup.leftElbowAngle, pushup.rightElbowAngle].filter(
    (a): a is number => a !== null,
  );
  const elbowExtension = elbowAngles.length > 0 ? Math.max(...elbowAngles) : null;

  let handsDown = false;
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
    handsDown = wristMid.y > shoulderMid.y + 0.06;
  }

  return {
    cameraView,
    kneeFlexion: squat.flexionAngle,
    elbowFlexion: pushup.flexionAngle,
    elbowExtension,
    bodyLineAngle: pushup.bodyLineAngle,
    handsDown,
    hipDeltaY: squat.hipDeltaY,
  };
}

export function assessBurpeeTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const keys: (keyof Pose)[] = [
    "leftShoulder",
    "rightShoulder",
    "leftHip",
    "rightHip",
    "leftKnee",
    "rightKnee",
    "leftWrist",
    "rightWrist",
  ];

  const visible = keys.filter((key) => {
    const point = pose[key];
    return point !== undefined && point.confidence >= MIN_CONFIDENCE;
  }).length;

  return visible >= keys.length - 1 ? "good" : "poor";
}
