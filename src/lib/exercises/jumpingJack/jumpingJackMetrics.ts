import { midpoint } from "@/lib/geometry/calculateAngle";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface JumpingJackMetrics {
  cameraView: CameraView;
  /** Wrist mid Y minus shoulder mid Y; negative = arms above shoulders. */
  armRaise: number | null;
  armSpreadRatio: number | null;
  legSpreadRatio: number | null;
  armsUp: boolean;
  legsOpen: boolean;
}

export const EMPTY_JUMPING_JACK_METRICS: JumpingJackMetrics = {
  cameraView: "unknown",
  armRaise: null,
  armSpreadRatio: null,
  legSpreadRatio: null,
  armsUp: false,
  legsOpen: false,
};

const MIN_CONFIDENCE = 0.5;

export function calculateJumpingJackMetrics(pose: Pose | null): JumpingJackMetrics {
  if (!pose) return EMPTY_JUMPING_JACK_METRICS;

  const cameraView = detectCameraView(pose);

  if (
    !pose.leftShoulder ||
    !pose.rightShoulder ||
    !pose.leftWrist ||
    !pose.rightWrist ||
    !pose.leftHip ||
    !pose.rightHip ||
    !pose.leftAnkle ||
    !pose.rightAnkle
  ) {
    return { ...EMPTY_JUMPING_JACK_METRICS, cameraView };
  }

  const confOk =
    pose.leftShoulder.confidence >= MIN_CONFIDENCE &&
    pose.rightShoulder.confidence >= MIN_CONFIDENCE &&
    pose.leftWrist.confidence >= MIN_CONFIDENCE &&
    pose.rightWrist.confidence >= MIN_CONFIDENCE &&
    pose.leftHip.confidence >= MIN_CONFIDENCE &&
    pose.rightHip.confidence >= MIN_CONFIDENCE &&
    pose.leftAnkle.confidence >= MIN_CONFIDENCE &&
    pose.rightAnkle.confidence >= MIN_CONFIDENCE;

  if (!confOk) return { ...EMPTY_JUMPING_JACK_METRICS, cameraView };

  const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
  const wristMid = midpoint(pose.leftWrist, pose.rightWrist);

  const shoulderWidth = Math.abs(pose.leftShoulder.x - pose.rightShoulder.x);
  const wristWidth = Math.abs(pose.leftWrist.x - pose.rightWrist.x);
  const hipWidth = Math.abs(pose.leftHip.x - pose.rightHip.x);
  const ankleWidth = Math.abs(pose.leftAnkle.x - pose.rightAnkle.x);

  const armRaise = wristMid.y - shoulderMid.y;
  const armSpreadRatio = shoulderWidth > 0.01 ? wristWidth / shoulderWidth : null;
  const legSpreadRatio = hipWidth > 0.01 ? ankleWidth / hipWidth : null;

  return {
    cameraView,
    armRaise,
    armSpreadRatio,
    legSpreadRatio,
    armsUp: armRaise < -0.03,
    legsOpen: legSpreadRatio !== null && legSpreadRatio >= 1.25,
  };
}

export function assessJumpingJackTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const keys: (keyof Pose)[] = [
    "leftShoulder",
    "rightShoulder",
    "leftWrist",
    "rightWrist",
    "leftHip",
    "rightHip",
    "leftAnkle",
    "rightAnkle",
  ];

  const visible = keys.filter((key) => {
    const point = pose[key];
    return point !== undefined && point.confidence >= MIN_CONFIDENCE;
  }).length;

  return visible >= keys.length - 1 ? "good" : "poor";
}

export function isJackOpen(
  metrics: JumpingJackMetrics,
  rules: { armsUpWristMargin: number; legSpreadRatioMin: number; armSpreadRatioMin: number },
): boolean {
  return (
    metrics.armRaise !== null &&
    metrics.armRaise <= -rules.armsUpWristMargin &&
    metrics.legsOpen &&
    (metrics.armSpreadRatio === null || metrics.armSpreadRatio >= rules.armSpreadRatioMin)
  );
}

export function isJackClosed(
  metrics: JumpingJackMetrics,
  rules: { legSpreadRatioMax: number },
): boolean {
  if (metrics.armRaise === null) return false;
  const armsDown = metrics.armRaise > -0.02;
  const legsClosed =
    metrics.legSpreadRatio === null || metrics.legSpreadRatio <= rules.legSpreadRatioMax;
  return armsDown && legsClosed;
}
