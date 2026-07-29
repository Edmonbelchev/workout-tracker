import type { SquatMetrics } from "@/lib/exercises/squat/squatMetrics";
import type { SquatPhase, SquatRules } from "@/lib/exercises/squat/squatRules";

export interface RepAttempt {
  startedFromStanding: boolean;
  reachedValidDepth: boolean;
  deepestKneeAngle: number;
  sawDescending: boolean;
}

export function createRepAttempt(): RepAttempt {
  return {
    startedFromStanding: false,
    reachedValidDepth: false,
    deepestKneeAngle: 180,
    sawDescending: false,
  };
}

export interface RepEvaluation {
  valid: boolean;
  feedback: string;
}

export function evaluateCompletedRep(
  attempt: RepAttempt,
  rules: SquatRules,
): RepEvaluation {
  if (!attempt.startedFromStanding || !attempt.sawDescending) {
    return { valid: false, feedback: "Ready" };
  }

  if (attempt.deepestKneeAngle <= rules.validDepthKneeAngleMax) {
    return { valid: true, feedback: "Good rep" };
  }

  if (attempt.deepestKneeAngle <= rules.minimumDescentKneeAngleMax) {
    return { valid: false, feedback: "Go slightly deeper" };
  }

  return { valid: false, feedback: "Ready" };
}

export function updateRepAttempt(
  attempt: RepAttempt,
  kneeAngle: number,
  phase: SquatPhase,
  rules: SquatRules,
): RepAttempt {
  const deepestKneeAngle = Math.min(attempt.deepestKneeAngle, kneeAngle);
  const reachedValidDepth =
    attempt.reachedValidDepth || kneeAngle <= rules.validDepthKneeAngleMax;

  return {
    ...attempt,
    deepestKneeAngle,
    reachedValidDepth,
    sawDescending: attempt.sawDescending || phase === "descending" || phase === "bottom",
  };
}

export function getDepthStatusDuringRep(
  attempt: RepAttempt | null,
  phase: SquatPhase,
): "waiting" | "good" | "too_shallow" {
  if (!attempt || phase === "standing") return "waiting";
  if (attempt.reachedValidDepth) return "good";
  return "waiting";
}

export function getFormFeedback(
  metrics: SquatMetrics,
  phase: SquatPhase,
  rules: SquatRules,
  attempt: RepAttempt | null,
): string | null {
  if (
    metrics.cameraView === "side" &&
    metrics.torsoInclination !== null &&
    metrics.torsoInclination > rules.maxTorsoInclination &&
    (phase === "descending" || phase === "bottom")
  ) {
    return "Keep your chest up";
  }

  if (
    phase === "bottom" &&
    attempt &&
    !attempt.reachedValidDepth &&
    attempt.deepestKneeAngle <= rules.minimumDescentKneeAngleMax
  ) {
    return "Go a little deeper";
  }

  return null;
}
