import { calculateAngleSafe, midpoint } from "@/lib/geometry/calculateAngle";
import { absFlexionAngle } from "@/lib/geometry/flexionSignal";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface AbsMetrics {
  cameraView: CameraView;
  leftHipFlexion: number | null;
  rightHipFlexion: number | null;
  averageHipFlexion: number | null;
  /** Shoulder–hip–knee curl from front view (torso compression proxy). */
  torsoCurlAngle: number | null;
  /** View-aware flexion used for rep counting. */
  flexionAngle: number | null;
}

export const EMPTY_ABS_METRICS: AbsMetrics = {
  cameraView: "unknown",
  leftHipFlexion: null,
  rightHipFlexion: null,
  averageHipFlexion: null,
  torsoCurlAngle: null,
  flexionAngle: null,
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

function hasSideChain(pose: Pose, side: "left" | "right"): boolean {
  const shoulder = side === "left" ? pose.leftShoulder : pose.rightShoulder;
  const hip = side === "left" ? pose.leftHip : pose.rightHip;
  const knee = side === "left" ? pose.leftKnee : pose.rightKnee;

  return (
    shoulder !== undefined &&
    hip !== undefined &&
    knee !== undefined &&
    shoulder.confidence >= MIN_CONFIDENCE &&
    hip.confidence >= MIN_CONFIDENCE &&
    knee.confidence >= MIN_CONFIDENCE
  );
}

export function calculateAbsMetrics(pose: Pose | null): AbsMetrics {
  if (!pose) return EMPTY_ABS_METRICS;

  const cameraView = detectCameraView(pose);

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

  let torsoCurlAngle: number | null = null;
  if (
    pose.leftShoulder &&
    pose.rightShoulder &&
    pose.leftHip &&
    pose.rightHip &&
    pose.leftKnee &&
    pose.rightKnee &&
    pose.leftShoulder.confidence >= MIN_CONFIDENCE &&
    pose.rightShoulder.confidence >= MIN_CONFIDENCE &&
    pose.leftHip.confidence >= MIN_CONFIDENCE &&
    pose.rightHip.confidence >= MIN_CONFIDENCE &&
    pose.leftKnee.confidence >= MIN_CONFIDENCE &&
    pose.rightKnee.confidence >= MIN_CONFIDENCE
  ) {
    const shoulderMid = midpoint(pose.leftShoulder, pose.rightShoulder);
    const hipMid = midpoint(pose.leftHip, pose.rightHip);
    const kneeMid = midpoint(pose.leftKnee, pose.rightKnee);
    torsoCurlAngle = calculateAngleSafe(shoulderMid, hipMid, kneeMid);
  }

  const flexionAngle = absFlexionAngle(
    leftHipFlexion,
    rightHipFlexion,
    torsoCurlAngle,
    cameraView,
  );

  return {
    cameraView,
    leftHipFlexion,
    rightHipFlexion,
    averageHipFlexion,
    torsoCurlAngle,
    flexionAngle,
  };
}

export function assessAbsTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const view = detectCameraView(pose);

  if (view === "front") {
    const visible = ABS_REQUIRED_LANDMARKS.filter((key) => {
      const point = pose[key];
      return point !== undefined && point.confidence >= MIN_CONFIDENCE;
    }).length;

    return visible >= ABS_REQUIRED_LANDMARKS.length - 1 ? "good" : "poor";
  }

  const oneSide = hasSideChain(pose, "left") || hasSideChain(pose, "right");
  return oneSide ? "good" : "poor";
}
