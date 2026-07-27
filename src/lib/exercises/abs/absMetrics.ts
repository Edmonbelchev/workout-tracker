import { calculateAngleSafe } from "@/lib/geometry/calculateAngle";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface AbsMetrics {
  leftHipFlexion: number | null;
  rightHipFlexion: number | null;
  averageHipFlexion: number | null;
}

export const EMPTY_ABS_METRICS: AbsMetrics = {
  leftHipFlexion: null,
  rightHipFlexion: null,
  averageHipFlexion: null,
};

export const ABS_REQUIRED_LANDMARKS: (keyof Pose)[] = [
  "leftShoulder",
  "rightShoulder",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
];

const MIN_CONFIDENCE = 0.5;

export function calculateAbsMetrics(pose: Pose | null): AbsMetrics {
  if (!pose) return EMPTY_ABS_METRICS;

  const leftHipFlexion = calculateAngleSafe(
    pose.leftShoulder,
    pose.leftHip,
    pose.leftKnee,
  );
  const rightHipFlexion = calculateAngleSafe(
    pose.rightShoulder,
    pose.rightHip,
    pose.rightKnee,
  );

  const angles = [leftHipFlexion, rightHipFlexion].filter(
    (a): a is number => a !== null,
  );
  const averageHipFlexion =
    angles.length > 0
      ? angles.reduce((sum, a) => sum + a, 0) / angles.length
      : null;

  return { leftHipFlexion, rightHipFlexion, averageHipFlexion };
}

export function assessAbsTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const visible = ABS_REQUIRED_LANDMARKS.filter((key) => {
    const point = pose[key];
    return point !== undefined && point.confidence >= MIN_CONFIDENCE;
  }).length;

  return visible >= ABS_REQUIRED_LANDMARKS.length - 1 ? "good" : "poor";
}
