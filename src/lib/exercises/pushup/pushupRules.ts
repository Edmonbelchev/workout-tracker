/**
 * Configurable thresholds for push-up phase detection and rep validation.
 *
 * Elbow angle: shoulder → elbow → wrist (180° = arms extended in plank).
 */
export interface PushupRules {
  /** Plank/top: average elbow angle must exceed this. */
  plankElbowAngleMin: number;
  /** Leave plank when elbows drop below this. */
  descendingElbowAngleMax: number;
  /** Enter bottom when elbows flex below this. */
  bottomElbowAngleMax: number;
  /** Leave bottom when elbows extend above this. */
  bottomElbowAngleMin: number;
  /** Return to plank when elbows exceed this. */
  plankReturnElbowAngleMin: number;
  /** Valid rep: deepest elbow angle must go below this. */
  validDepthElbowAngleMax: number;
  /** Minimum bend to register an incomplete rep attempt. */
  minimumDescentElbowAngleMax: number;
  /** Body line (shoulder-hip-ankle) below this = sagging hips. */
  minBodyLineAngle: number;
}

export const DEFAULT_PUSHUP_RULES: PushupRules = {
  plankElbowAngleMin: 160,
  descendingElbowAngleMax: 155,
  bottomElbowAngleMax: 100,
  bottomElbowAngleMin: 105,
  plankReturnElbowAngleMin: 158,
  validDepthElbowAngleMax: 110,
  minimumDescentElbowAngleMax: 140,
  minBodyLineAngle: 155,
};

export const PUSHUP_PHASE_LABELS = {
  plank: "Plank",
  descending: "Descending",
  bottom: "Bottom",
  ascending: "Ascending",
} as const;

export type PushupPhase = keyof typeof PUSHUP_PHASE_LABELS;

export type PushupDepthStatus = "waiting" | "good" | "too_shallow";

export const PUSHUP_DEPTH_LABELS: Record<PushupDepthStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_shallow: "Too shallow",
};
