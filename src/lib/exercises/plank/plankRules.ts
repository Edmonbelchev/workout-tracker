export interface PlankRules {
  /** Enter hold when body line angle exceeds this. */
  minBodyLineAngle: number;
  /** Exit hold when body line sags below this. */
  minHoldBodyLineAngle: number;
  /** Elbows must be extended above this to start hold. */
  minElbowAngle: number;
  /** Minimum seconds before announcing milestones. */
  milestoneIntervalSec: number;
}

export const DEFAULT_PLANK_RULES: PlankRules = {
  minBodyLineAngle: 155,
  minHoldBodyLineAngle: 145,
  minElbowAngle: 155,
  milestoneIntervalSec: 10,
};

export const PLANK_PHASE_LABELS = {
  idle: "Idle",
  holding: "Holding",
  rest: "Rest",
} as const;

export type PlankPhase = keyof typeof PLANK_PHASE_LABELS;

export type PlankFormStatus = "good" | "sagging" | "waiting";

export const PLANK_FORM_LABELS: Record<PlankFormStatus, string> = {
  good: "Good",
  sagging: "Hips sagging",
  waiting: "Waiting",
};
