import type { Point } from "@/lib/pose/types";

/**
 * Calculates the interior angle ABC in degrees, where B is the joint vertex.
 *
 * Uses 2D vectors in image space (x, y). Works well when the limb plane is
 * roughly parallel to the camera; foreshortening can underestimate flexion
 * when joints move toward/away from the camera.
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  return calculateAngleFromVectors(
    a.x - b.x,
    a.y - b.y,
    c.x - b.x,
    c.y - b.y,
  );
}

/**
 * 3D joint angle using x, y, and z when present. Reduces foreshortening error
 * when the athlete is not perfectly side-on or face-on to the camera.
 */
export function calculateAngle3D(a: Point, b: Point, c: Point): number {
  const baz = (a.z ?? 0) - (b.z ?? 0);
  const bcz = (c.z ?? 0) - (b.z ?? 0);

  return calculateAngleFromVectors(
    a.x - b.x,
    a.y - b.y,
    c.x - b.x,
    c.y - b.y,
    baz,
    bcz,
  );
}

function calculateAngleFromVectors(
  bax: number,
  bay: number,
  bcx: number,
  bcy: number,
  baz = 0,
  bcz = 0,
): number {
  const magnitudeBA = Math.hypot(bax, bay, baz);
  const magnitudeBC = Math.hypot(bcx, bcy, bcz);

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return NaN;
  }

  const dot = bax * bcx + bay * bcy + baz * bcz;
  const cosAngle = clamp(dot / (magnitudeBA * magnitudeBC), -1, 1);

  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function has3D(a: Point, b: Point, c: Point): boolean {
  return a.z !== undefined && b.z !== undefined && c.z !== undefined;
}

/**
 * Angle ABC when all three points exist and meet minimum confidence.
 * Prefers 3D when z is available on all landmarks.
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

  const angle = has3D(a, b, c) ? calculateAngle3D(a, b, c) : calculateAngle(a, b, c);
  return Number.isFinite(angle) ? angle : null;
}

/** Smallest angle = deepest flexion; best bilateral signal across camera angles. */
export function bestFlexionAngle(
  left: number | null,
  right: number | null,
): number | null {
  const angles = [left, right].filter((angle): angle is number => angle !== null);
  if (angles.length === 0) return null;
  return Math.min(...angles);
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
