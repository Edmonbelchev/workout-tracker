import { bestFlexionAngle } from "@/lib/geometry/calculateAngle";
import { isCoronalView, type CameraView } from "@/lib/pose/cameraView";

/** Squat depth signal — knee flexion; from front also blends hip flexion. */
export function squatFlexionAngle(
  leftKnee: number | null,
  rightKnee: number | null,
  leftHip: number | null,
  rightHip: number | null,
  view: CameraView,
): number | null {
  const knee = bestFlexionAngle(leftKnee, rightKnee);

  if (isCoronalView(view)) {
    const hip = bestFlexionAngle(leftHip, rightHip);
    if (knee !== null && hip !== null) return Math.min(knee, hip);
    return knee ?? hip;
  }

  return knee;
}

/** Push-up / pull-up elbow flexion — uses the more bent arm in profile. */
export function elbowFlexionAngle(
  left: number | null,
  right: number | null,
  view: CameraView,
): number | null {
  void view;
  return bestFlexionAngle(left, right);
}

/**
 * Pull-up flexion from front/back view: elbow angles foreshorten, so wrist height
 * is mapped to an elbow-like signal for phase detection.
 */
export function pullupFlexionAngle(
  leftElbow: number | null,
  rightElbow: number | null,
  wristClearance: number | null,
  view: CameraView,
): number | null {
  const elbow = bestFlexionAngle(leftElbow, rightElbow);

  if (!isCoronalView(view) || wristClearance === null) {
    return elbow;
  }

  // clearance 0 ≈ hang (~168°), 0.035 ≈ top (~93°)
  const proxy = 168 - (wristClearance / 0.035) * 75;
  const clamped = Math.max(70, Math.min(175, proxy));

  if (elbow !== null) return Math.min(elbow, clamped);
  return clamped;
}

/** Crunch flexion — hip angle; from front uses shoulder-to-hip compression. */
export function absFlexionAngle(
  leftHip: number | null,
  rightHip: number | null,
  torsoCurlAngle: number | null,
  view: CameraView,
): number | null {
  const hip = bestFlexionAngle(leftHip, rightHip);

  if (view === "front" && torsoCurlAngle !== null) {
    if (hip !== null) return Math.min(hip, torsoCurlAngle);
    return torsoCurlAngle;
  }

  return hip;
}
