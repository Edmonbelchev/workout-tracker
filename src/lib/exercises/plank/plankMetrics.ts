import {
  assessPushupTrackingQuality,
  calculatePushupMetrics,
  type PushupMetrics,
} from "@/lib/exercises/pushup/pushupMetrics";
import { detectCameraView, type CameraView } from "@/lib/pose/cameraView";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PlankMetrics extends PushupMetrics {
  /** Best elbow angle for plank (most extended arm). */
  elbowExtension: number | null;
}

export const EMPTY_PLANK_METRICS: PlankMetrics = {
  cameraView: "unknown",
  leftElbowAngle: null,
  rightElbowAngle: null,
  averageElbowAngle: null,
  flexionAngle: null,
  bodyLineAngle: null,
  elbowExtension: null,
};

export function calculatePlankMetrics(pose: Pose | null): PlankMetrics {
  const base = calculatePushupMetrics(pose);
  const elbowAngles = [base.leftElbowAngle, base.rightElbowAngle].filter(
    (a): a is number => a !== null,
  );
  const elbowExtension =
    elbowAngles.length > 0 ? Math.max(...elbowAngles) : null;

  return { ...base, elbowExtension };
}

export function assessPlankTrackingQuality(pose: Pose | null): TrackingQuality {
  return assessPushupTrackingQuality(pose);
}

export { detectCameraView, type CameraView };
