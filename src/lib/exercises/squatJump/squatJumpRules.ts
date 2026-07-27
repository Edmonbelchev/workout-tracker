import type { SquatRules } from "@/lib/exercises/squat/squatRules";

/**
 * Squat jump thresholds — extends squat with flight/landing detection.
 *
 * Flight is detected via upward hip movement (y decreases in image space)
 * while knees are nearly extended.
 */
export interface SquatJumpRules extends SquatRules {
  /** Minimum upward hip delta per frame to enter flight (normalized y, negative = up). */
  flightHipDeltaThreshold: number;
  /** Knee angle must exceed this when entering flight. */
  flightKneeAngleMin: number;
  /** Downward hip delta per frame to enter landing. */
  landingHipDeltaThreshold: number;
}

export const DEFAULT_SQUAT_JUMP_RULES: SquatJumpRules = {
  standingKneeAngleMin: 160,
  descendingKneeAngleMax: 155,
  bottomKneeAngleMax: 100,
  bottomKneeAngleMin: 105,
  standingReturnKneeAngleMin: 158,
  validDepthKneeAngleMax: 110,
  minimumDescentKneeAngleMax: 140,
  maxTorsoInclination: 35,
  flightHipDeltaThreshold: -0.018,
  flightKneeAngleMin: 150,
  landingHipDeltaThreshold: 0.012,
};

export const SQUAT_JUMP_PHASE_LABELS = {
  standing: "Standing",
  descending: "Descending",
  bottom: "Bottom",
  ascending: "Ascending",
  flight: "Flight",
  landing: "Landing",
} as const;

export type SquatJumpPhase = keyof typeof SQUAT_JUMP_PHASE_LABELS;

export type SquatJumpDepthStatus = "waiting" | "good" | "too_shallow" | "no_jump";

export const SQUAT_JUMP_DEPTH_LABELS: Record<SquatJumpDepthStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_shallow: "Too shallow",
  no_jump: "No jump",
};
