export type LungeLeg = "left" | "right";

export interface LungeRules {
  standingKneeAngleMin: number;
  descendingKneeAngleMax: number;
  bottomKneeAngleMax: number;
  bottomKneeAngleMin: number;
  standingReturnKneeAngleMin: number;
  /** Other leg must stay above this while front leg lunges. */
  rearKneeAngleMin: number;
  validDepthKneeAngleMax: number;
  minimumDescentKneeAngleMax: number;
}

export const DEFAULT_LUNGE_RULES: LungeRules = {
  standingKneeAngleMin: 155,
  descendingKneeAngleMax: 140,
  bottomKneeAngleMax: 105,
  bottomKneeAngleMin: 110,
  standingReturnKneeAngleMin: 150,
  rearKneeAngleMin: 145,
  validDepthKneeAngleMax: 110,
  minimumDescentKneeAngleMax: 130,
};

export const LUNGE_PHASE_LABELS = {
  standing: "Standing",
  descending: "Going down",
  bottom: "Bottom",
  ascending: "Drive up",
} as const;

export type LungePhase = keyof typeof LUNGE_PHASE_LABELS;

export type LungeDepthStatus = "waiting" | "good" | "too_shallow";

export const LUNGE_DEPTH_LABELS: Record<LungeDepthStatus, string> = {
  waiting: "Waiting",
  good: "Good",
  too_shallow: "Too shallow",
};
