/**
 * Configurable thresholds for squat phase detection and rep validation.
 *
 * Hysteresis: separate enter/exit thresholds prevent rapid state flicker when
 * knee angle hovers near a boundary (e.g. 99° vs 101° at the bottom).
 *
 * All angles are interior joint angles in degrees (180° = fully extended).
 */
export interface SquatRules {
  /** Standing: average knee angle must exceed this to be considered standing. */
  standingKneeAngleMin: number;
  /** Leave standing for descending when knee drops below this. */
  descendingKneeAngleMax: number;
  /** Enter bottom phase when knee drops below this. */
  bottomKneeAngleMax: number;
  /** Leave bottom for ascending when knee rises above this. */
  bottomKneeAngleMin: number;
  /** Return to standing from ascending when knee exceeds this. */
  standingReturnKneeAngleMin: number;
  /** Valid rep depth: deepest knee angle must go below this. */
  validDepthKneeAngleMax: number;
  /** Minimum descent before a rep attempt is tracked (must bend at least this much). */
  minimumDescentKneeAngleMax: number;
  /** Torso inclination above this triggers chest-up coaching. */
  maxTorsoInclination: number;
}

export const DEFAULT_SQUAT_RULES: SquatRules = {
  standingKneeAngleMin: 160,
  descendingKneeAngleMax: 155,
  /** Must be >= validDepthKneeAngleMax or reps never reach the bottom phase. */
  bottomKneeAngleMax: 110,
  bottomKneeAngleMin: 115,
  standingReturnKneeAngleMin: 155,
  validDepthKneeAngleMax: 105,
  minimumDescentKneeAngleMax: 135,
  maxTorsoInclination: 35,
};

export const SQUAT_PHASE_LABELS = {
  standing: "Standing",
  descending: "Descending",
  bottom: "Bottom",
  ascending: "Ascending",
} as const;

export type SquatPhase = keyof typeof SQUAT_PHASE_LABELS;

export type DepthStatus = "waiting" | "good" | "too_shallow";

export const DEPTH_STATUS_LABELS: Record<DepthStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_shallow: "Too shallow",
};
