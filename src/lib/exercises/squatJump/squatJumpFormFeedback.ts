import type { SquatJumpMetrics } from "@/lib/exercises/squatJump/squatJumpMetrics";
import type { SquatJumpPhase, SquatJumpRules } from "@/lib/exercises/squatJump/squatJumpRules";

export interface SquatJumpRepAttempt {
  startedFromStanding: boolean;
  reachedValidDepth: boolean;
  sawFlight: boolean;
  deepestKneeAngle: number;
  sawDescending: boolean;
}

export function createSquatJumpRepAttempt(): SquatJumpRepAttempt {
  return {
    startedFromStanding: false,
    reachedValidDepth: false,
    sawFlight: false,
    deepestKneeAngle: 180,
    sawDescending: false,
  };
}

export function updateSquatJumpRepAttempt(
  attempt: SquatJumpRepAttempt,
  kneeAngle: number,
  phase: SquatJumpPhase,
  rules: SquatJumpRules,
): SquatJumpRepAttempt {
  return {
    ...attempt,
    deepestKneeAngle: Math.min(attempt.deepestKneeAngle, kneeAngle),
    reachedValidDepth:
      attempt.reachedValidDepth ||
      kneeAngle <= rules.validDepthKneeAngleMax ||
      phase === "bottom",
    sawDescending:
      attempt.sawDescending || phase === "descending" || phase === "bottom",
    sawFlight: attempt.sawFlight || phase === "flight" || phase === "landing",
  };
}

export function evaluateSquatJumpRep(
  attempt: SquatJumpRepAttempt,
  rules: SquatJumpRules,
): { valid: boolean; feedback: string } {
  if (!attempt.startedFromStanding || !attempt.sawDescending) {
    return { valid: false, feedback: "Ready" };
  }

  if (!attempt.reachedValidDepth) {
    if (attempt.deepestKneeAngle <= rules.minimumDescentKneeAngleMax) {
      return { valid: false, feedback: "Go slightly deeper" };
    }
    return { valid: false, feedback: "Ready" };
  }

  if (!attempt.sawFlight) {
    return { valid: false, feedback: "Jump higher" };
  }

  return { valid: true, feedback: "Good rep" };
}

export function getSquatJumpDepthStatus(
  attempt: SquatJumpRepAttempt | null,
  phase: SquatJumpPhase,
): "waiting" | "good" | "too_shallow" | "no_jump" {
  if (!attempt || phase === "standing") return "waiting";
  if (attempt.reachedValidDepth && attempt.sawFlight) return "good";
  if (attempt.reachedValidDepth) return "waiting";
  return "waiting";
}

export function getSquatJumpFormFeedback(
  metrics: SquatJumpMetrics,
  phase: SquatJumpPhase,
  rules: SquatJumpRules,
): string | null {
  if (
    metrics.torsoInclination !== null &&
    metrics.torsoInclination > rules.maxTorsoInclination &&
    (phase === "descending" || phase === "bottom")
  ) {
    return "Keep your chest up";
  }

  if (phase === "ascending") {
    return "Explode up";
  }

  return null;
}
