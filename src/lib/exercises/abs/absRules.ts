/**
 * Crunch/sit-up thresholds using hip flexion angle (shoulder → hip → knee).
 * Smaller angle = more flexed / crunched.
 */
export interface AbsRules {
  /** Flat position: hip angle above this. */
  flatHipAngleMin: number;
  /** Leave flat when angle drops below this. */
  curlingHipAngleMax: number;
  /** Enter peak when angle below this. */
  peakHipAngleMax: number;
  /** Leave peak when angle rises above this. */
  peakHipAngleMin: number;
  /** Return to flat when angle exceeds this. */
  flatReturnHipAngleMin: number;
  /** Valid rep requires peak below this. */
  validPeakHipAngleMax: number;
  /** Minimum curl before incomplete rep feedback. */
  minimumCurlHipAngleMax: number;
}

export const DEFAULT_ABS_RULES: AbsRules = {
  flatHipAngleMin: 155,
  curlingHipAngleMax: 150,
  peakHipAngleMax: 100,
  peakHipAngleMin: 105,
  flatReturnHipAngleMin: 152,
  validPeakHipAngleMax: 110,
  minimumCurlHipAngleMax: 130,
};

export const ABS_PHASE_LABELS = {
  flat: "Flat",
  curling: "Curling",
  peak: "Peak",
  lowering: "Lowering",
} as const;

export type AbsPhase = keyof typeof ABS_PHASE_LABELS;

export type AbsDepthStatus = "waiting" | "good" | "too_shallow";

export const ABS_DEPTH_LABELS: Record<AbsDepthStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_shallow: "Too shallow",
};
