import type { Point } from "@/lib/pose/types";

/**
 * Calculates the interior angle ABC in degrees, where B is the joint vertex.
 *
 * Uses 2D vectors in image space (x, y). Works well when the limb plane is
 * roughly parallel to the camera; foreshortening can underestimate flexion
 * when joints move toward/away from the camera.
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;

  const magnitudeBA = Math.hypot(bax, bay);
  const magnitudeBC = Math.hypot(bcx, bcy);

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return NaN;
  }

  const dot = bax * bcx + bay * bcy;
  const cosAngle = clamp(dot / (magnitudeBA * magnitudeBC), -1, 1);

  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Angle ABC when all three points exist and meet minimum confidence.
 */
export function calculateAngleSafe(
  a: Point | undefined,
  b: Point | undefined,
  c: Point | undefined,
  minConfidence = 0.5,
): number | null {
  if (!a || !b || !c) return null;
  if (
    a.confidence < minConfidence ||
    b.confidence < minConfidence ||
    c.confidence < minConfidence
  ) {
    return null;
  }

  const angle = calculateAngle(a, b, c);
  return Number.isFinite(angle) ? angle : null;
}

export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: a.z !== undefined && b.z !== undefined ? (a.z + b.z) / 2 : undefined,
    confidence: Math.min(a.confidence, b.confidence),
  };
}

/**
 * Torso lean from vertical, in degrees.
 * 0° = upright; larger values = leaning forward/back relative to camera.
 */
export function calculateTorsoInclination(
  shoulderMid: Point,
  hipMid: Point,
): number {
  const tx = shoulderMid.x - hipMid.x;
  const ty = shoulderMid.y - hipMid.y;
  const magnitude = Math.hypot(tx, ty);

  if (magnitude === 0) return NaN;

  // Image y-axis points downward; "up" is (0, -1).
  const dotWithUp = -ty / magnitude;
  const cosAngle = clamp(dotWithUp, -1, 1);

  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
