import { bestFlexionAngle } from "@/lib/geometry/calculateAngle";
import { isCoronalView, type CameraView } from "@/lib/pose/cameraView";

/** Deepest squat ≈ 42% reduction in hip–ankle gap from a standing baseline. */
const DEEP_GAP_DROP_RATIO = 0.42;
const GAP_TO_ANGLE_RANGE = 85;

/**
 * Map hip drop relative to a per-session standing baseline to a flexion angle.
 * At baseline → ~180°; deep squat → ~95°.
 */
export function baselineGapToSquatAngle(
  gap: number,
  baselineGap: number,
): number {
  const drop = clamp((baselineGap - gap) / (baselineGap * DEEP_GAP_DROP_RATIO), 0, 1);
  return 180 - drop * GAP_TO_ANGLE_RANGE;
}

export interface SquatFlexionInput {
  leftKnee: number | null;
  rightKnee: number | null;
  leftHip: number | null;
  rightHip: number | null;
  hipAnkleGap: number | null;
  view: CameraView;
  /** Calibrated while standing; required for coronal depth via hip drop. */
  baselineHipAnkleGap: number | null;
}

/**
 * View-aware squat depth signal.
 * - Side: knee flexion (most reliable in profile).
 * - Front/back: hip flexion + baseline-relative hip drop.
 */
export function computeSquatFlexionAngle(input: SquatFlexionInput): number | null {
  const knee = bestFlexionAngle(input.leftKnee, input.rightKnee);
  const hip = bestFlexionAngle(input.leftHip, input.rightHip);

  const gapAngle =
    input.hipAnkleGap !== null && input.baselineHipAnkleGap !== null
      ? baselineGapToSquatAngle(input.hipAnkleGap, input.baselineHipAnkleGap)
      : null;

  if (input.view === "side") {
    return knee;
  }

  if (isCoronalView(input.view)) {
    const signals = [knee, hip, gapAngle].filter((value): value is number => value !== null);
    if (signals.length > 0) return Math.min(...signals);
    return null;
  }

  // Unknown view — prefer knee; fall back to hip/gap when knees foreshorten.
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

/** @deprecated Use computeSquatFlexionAngle */
export function squatFlexionAngle(
  leftKnee: number | null,
  rightKnee: number | null,
  leftHip: number | null,
  rightHip: number | null,
  hipAnkleGap: number | null,
  view: CameraView,
): number | null {
  return computeSquatFlexionAngle({
    leftKnee,
    rightKnee,
    leftHip,
    rightHip,
    hipAnkleGap,
    view,
    baselineHipAnkleGap: null,
  });
}
