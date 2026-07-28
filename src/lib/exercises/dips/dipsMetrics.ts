import { bestFlexionAngle, calculateAngleSafe, midpoint } from "@/lib/geometry/calculateAngle";
import { elbowFlexionAngle } from "@/lib/geometry/flexionSignal";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface DipsMetrics {
  cameraView: CameraView;
  leftElbowAngle: number | null;
  rightElbowAngle: number | null;
  flexionAngle: number | null;
  /** Positive when shoulders are above hips in image space. */
  shoulderHipGap: number | null;
  isVerticalTorso: boolean;
}

export const EMPTY_DIPS_METRICS: DipsMetrics = {
  cameraView: "unknown",
  leftElbowAngle: null,
  rightElbowAngle: null,
  flexionAngle: null,
  shoulderHipGap: null,
  isVerticalTorso: false,
};

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

export function calculateDipsMetrics(pose: Pose | null): DipsMetrics {
  if (!pose) return EMPTY_DIPS_METRICS;

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
  const flexionAngle = elbowFlexionAngle(leftElbowAngle, rightElbowAngle, cameraView);

  let shoulderHipGap: number | null = null;
  let isVerticalTorso = false;

  if (
    pose.leftShoulder &&
    pose.rightShoulder &&
    pose.leftHip &&
    pose.rightHip &&
    pose.leftShoulder.confidence >= MIN_CONFIDENCE &&
    pose.rightShoulder.confidence >= MIN_CONFIDENCE &&
    pose.leftHip.confidence >= MIN_CONFIDENCE &&
    pose.rightHip.confidence >= MIN_CONFIDENCE
  ) {
    const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
    const hipMid = midpoint(pose.leftHip, pose.rightHip);
    shoulderHipGap = hipMid.y - shoulderMid.y;
    isVerticalTorso = shoulderHipGap >= 0.05;
  }

  return {
    cameraView,
    leftElbowAngle,
    rightElbowAngle,
    flexionAngle,
    shoulderHipGap,
    isVerticalTorso,
  };
}

export function assessDipsTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const oneArm = hasArmChain(pose, "left") || hasArmChain(pose, "right");
  const hips =
    pose.leftHip !== undefined &&
    pose.rightHip !== undefined &&
    pose.leftHip.confidence >= MIN_CONFIDENCE &&
    pose.rightHip.confidence >= MIN_CONFIDENCE;

  return oneArm && hips ? "good" : "poor";
}

export { bestFlexionAngle };
