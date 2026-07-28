/**
 * Dip thresholds — vertical torso with elbow flexion (shoulder → elbow → wrist).
 */
export interface DipsRules {
  topElbowAngleMin: number;
  descendingElbowAngleMax: number;
  bottomElbowAngleMax: number;
  bottomElbowAngleMin: number;
  topReturnElbowAngleMin: number;
  validDepthElbowAngleMax: number;
  minimumDescentElbowAngleMax: number;
  /** Shoulders must be above hips by this normalized Y gap. */
  minShoulderHipGap: number;
}

export const DEFAULT_DIPS_RULES: DipsRules = {
  topElbowAngleMin: 158,
  descendingElbowAngleMax: 150,
  bottomElbowAngleMax: 95,
  bottomElbowAngleMin: 100,
  topReturnElbowAngleMin: 155,
  validDepthElbowAngleMax: 105,
  minimumDescentElbowAngleMax: 130,
  minShoulderHipGap: 0.06,
};

export const DIPS_PHASE_LABELS = {
  top: "Top",
  descending: "Going down",
  bottom: "Bottom",
  ascending: "Press up",
} as const;

export type DipsPhase = keyof typeof DIPS_PHASE_LABELS;

export type DipsDepthStatus = "waiting" | "good" | "too_shallow";

export const DIPS_DEPTH_LABELS: Record<DipsDepthStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_shallow: "Too shallow",
};
