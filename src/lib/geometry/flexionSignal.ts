import { bestFlexionAngle } from "@/lib/geometry/calculateAngle";
import { isCoronalView, type CameraView } from "@/lib/pose/cameraView";

/** Map hip–ankle vertical separation to a knee-like flexion angle (180° = standing). */
const STANDING_HIP_ANKLE_GAP = 0.36;
const DEEP_HIP_ANKLE_GAP = 0.17;
const GAP_TO_ANGLE_RANGE = 88;

export function hipAnkleGapToSquatAngle(gap: number): number {
  const depth = clamp(
    (STANDING_HIP_ANKLE_GAP - gap) / (STANDING_HIP_ANKLE_GAP - DEEP_HIP_ANKLE_GAP),
    0,
    1,
  );
  return 180 - depth * GAP_TO_ANGLE_RANGE;
}

/**
 * Unified squat depth signal — uses the deepest reading across knee, hip, and
 * vertical hip drop so front, back, and side views share one threshold scale.
 */
export function squatFlexionAngle(
  leftKnee: number | null,
  rightKnee: number | null,
  leftHip: number | null,
  rightHip: number | null,
  hipAnkleGap: number | null,
  view: CameraView,
): number | null {
  void view;

  const knee = bestFlexionAngle(leftKnee, rightKnee);
  const hip = bestFlexionAngle(leftHip, rightHip);
  const gapAngle =
    hipAnkleGap !== null ? hipAnkleGapToSquatAngle(hipAnkleGap) : null;

  const signals = [knee, hip, gapAngle].filter((value): value is number => value !== null);
  if (signals.length === 0) return null;

  return Math.min(...signals);
}

/** Push-up / dip elbow flexion — uses the more bent arm in profile. */
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
