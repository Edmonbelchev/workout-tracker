export interface BurpeeRules {
  standingKneeAngleMin: number;
  squatKneeAngleMax: number;
  /** Wrists below shoulders by this margin = hands on floor. */
  handsDownMargin: number;
  plankElbowAngleMin: number;
  pushDownElbowAngleMax: number;
  pushUpElbowAngleMin: number;
  jumpKneeAngleMin: number;
  flightHipDeltaThreshold: number;
  validPushElbowAngleMax: number;
}

export const DEFAULT_BURPEE_RULES: BurpeeRules = {
  standingKneeAngleMin: 155,
  squatKneeAngleMax: 135,
  handsDownMargin: 0.08,
  plankElbowAngleMin: 155,
  pushDownElbowAngleMax: 115,
  pushUpElbowAngleMin: 155,
  jumpKneeAngleMin: 145,
  flightHipDeltaThreshold: -0.015,
  validPushElbowAngleMax: 120,
};

export const BURPEE_PHASE_LABELS = {
  standing: "Standing",
  squat: "Squat",
  plank: "Plank",
  chest_down: "Chest down",
  chest_up: "Chest up",
  jump: "Jump",
} as const;

export type BurpeePhase = keyof typeof BURPEE_PHASE_LABELS;
