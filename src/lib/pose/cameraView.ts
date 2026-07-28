import type { Pose } from "@/lib/pose/types";

/** Approximate camera orientation relative to the athlete. */
export type CameraView = "front" | "back" | "side" | "unknown";

const MIN_CONFIDENCE = 0.5;

/** Front or back — limbs foreshorten similarly in the camera plane. */
export function isCoronalView(view: CameraView): boolean {
  return view === "front" || view === "back";
}

/**
 * Estimates whether the athlete faces the camera (front), faces away (back),
 * or is in profile (side).
 *
 * Uses shoulder span vs torso height and, when available, shoulder/nose depth (z).
 */
export function detectCameraView(pose: Pose | null): CameraView {
  if (!pose?.leftShoulder || !pose?.rightShoulder || !pose?.leftHip || !pose?.rightHip) {
    return "unknown";
  }

  const ls = pose.leftShoulder;
  const rs = pose.rightShoulder;
  const lh = pose.leftHip;
  const rh = pose.rightHip;

  if (
    ls.confidence < MIN_CONFIDENCE ||
    rs.confidence < MIN_CONFIDENCE ||
    lh.confidence < MIN_CONFIDENCE ||
    rh.confidence < MIN_CONFIDENCE
  ) {
    return "unknown";
  }

  const shoulderWidth = Math.abs(ls.x - rs.x);
  const hipWidth = Math.abs(lh.x - rh.x);
  const torsoHeight = Math.abs((ls.y + rs.y) / 2 - (lh.y + rh.y) / 2);

  if (torsoHeight < 0.04) return "unknown";

  const shoulderRatio = shoulderWidth / torsoHeight;
  const hipRatio = hipWidth / torsoHeight;

  if (ls.z !== undefined && rs.z !== undefined) {
    const shoulderDepth = Math.abs(ls.z - rs.z);
    if (shoulderDepth > 0.06) return "side";

    if (shoulderDepth < 0.03 && shoulderRatio > 0.32) {
      return detectFrontOrBack(pose, ls, rs);
    }
  }

  if (shoulderRatio > 0.34 && hipRatio > 0.28) {
    return detectFrontOrBack(pose, ls, rs);
  }

  if (shoulderRatio < 0.2 && hipRatio < 0.18) return "side";

  return "unknown";
}

/**
 * When shoulders span the frame, use nose/eye depth to separate front vs back.
 * Facing away: nose is farther from the camera than the shoulder line.
 */
function detectFrontOrBack(
  pose: Pose,
  leftShoulder: NonNullable<Pose["leftShoulder"]>,
  rightShoulder: NonNullable<Pose["rightShoulder"]>,
): CameraView {
  const shoulderZ = ((leftShoulder.z ?? 0) + (rightShoulder.z ?? 0)) / 2;

  if (pose.nose && pose.nose.confidence >= MIN_CONFIDENCE) {
    const noseZ = pose.nose.z ?? 0;
    if (noseZ > shoulderZ + 0.012) return "back";
    if (noseZ < shoulderZ - 0.008) return "front";
  }

  const leftEyeVisible =
    pose.leftEye !== undefined && pose.leftEye.confidence >= MIN_CONFIDENCE;
  const rightEyeVisible =
    pose.rightEye !== undefined && pose.rightEye.confidence >= MIN_CONFIDENCE;

  if (!leftEyeVisible && !rightEyeVisible) return "back";

  return "front";
}

export function formatCameraView(view: CameraView): string {
  switch (view) {
    case "front":
      return "Front";
    case "back":
      return "Back";
    case "side":
      return "Side";
    default:
      return "Auto";
  }
}
