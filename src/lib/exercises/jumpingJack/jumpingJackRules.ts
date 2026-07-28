export interface JumpingJackRules {
  /** Wrists must be above shoulders by this normalized Y margin. */
  armsUpWristMargin: number;
  /** Ankle spread ratio vs hip width to count legs open. */
  legSpreadRatioMin: number;
  /** Ratio below this = closed position. */
  legSpreadRatioMax: number;
  /** Arm spread ratio vs shoulder width when open. */
  armSpreadRatioMin: number;
}

export const DEFAULT_JUMPING_JACK_RULES: JumpingJackRules = {
  armsUpWristMargin: 0.04,
  legSpreadRatioMin: 1.35,
  legSpreadRatioMax: 1.15,
  armSpreadRatioMin: 1.5,
};

export const JUMPING_JACK_PHASE_LABELS = {
  closed: "Closed",
  opening: "Opening",
  open: "Open",
  closing: "Closing",
} as const;

export type JumpingJackPhase = keyof typeof JUMPING_JACK_PHASE_LABELS;
