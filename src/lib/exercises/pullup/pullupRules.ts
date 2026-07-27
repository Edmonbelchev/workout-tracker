/**
 * Pull-up thresholds using elbow flexion and wrist-vs-shoulder height.
 *
 * Wrist clearance = shoulderMid.y − wristMid.y (image space).
 * Positive clearance means wrists are above shoulders — a chin-over-bar proxy
 * without detecting the bar itself.
 */
export interface PullupRules {
  /** Dead hang: elbow angle above this. */
  hangingElbowAngleMin: number;
  /** Start pulling when elbow drops below this. */
  pullingElbowAngleMax: number;
  /** Enter top at elbow angle or wrist clearance. */
  topElbowAngleMax: number;
  topWristClearanceMin: number;
  /** Leave top (hysteresis). */
  topElbowAngleMin: number;
  topWristClearanceExit: number;
  /** Return to hang. */
  hangingReturnElbowAngleMin: number;
  /** Valid rep: must reach this flexion or clearance at top. */
  validTopElbowAngleMax: number;
  validTopWristClearanceMin: number;
  /** Minimum pull before incomplete-rep feedback. */
  minimumPullElbowAngleMax: number;
}

export const DEFAULT_PULLUP_RULES: PullupRules = {
  hangingElbowAngleMin: 158,
  pullingElbowAngleMax: 155,
  topElbowAngleMax: 95,
  topWristClearanceMin: 0.015,
  topElbowAngleMin: 100,
  topWristClearanceExit: 0.008,
  hangingReturnElbowAngleMin: 155,
  validTopElbowAngleMax: 105,
  validTopWristClearanceMin: 0.01,
  minimumPullElbowAngleMax: 130,
};

export const PULLUP_PHASE_LABELS = {
  hanging: "Hanging",
  pulling: "Pulling",
  top: "Top",
  lowering: "Lowering",
} as const;

export type PullupPhase = keyof typeof PULLUP_PHASE_LABELS;

export type PullupHeightStatus = "waiting" | "good" | "too_low";

export const PULLUP_HEIGHT_LABELS: Record<PullupHeightStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_low: "Too low",
};
