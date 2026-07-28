import type { LungeMetrics } from "@/lib/exercises/lunge/lungeMetrics";
import type { LungeLeg, LungePhase, LungeRules } from "@/lib/exercises/lunge/lungeRules";

export interface LungeRepAttempt {
  leg: LungeLeg;
  startedFromStanding: boolean;
  reachedValidDepth: boolean;
  deepestKneeAngle: number;
  sawDescending: boolean;
}

export function createLungeRepAttempt(leg: LungeLeg): LungeRepAttempt {
  return {
    leg,
    startedFromStanding: false,
    reachedValidDepth: false,
    deepestKneeAngle: 180,
    sawDescending: false,
  };
}

export function updateLungeRepAttempt(
  attempt: LungeRepAttempt,
  kneeAngle: number,
  phase: LungePhase,
  rules: LungeRules,
): LungeRepAttempt {
  return {
    ...attempt,
    deepestKneeAngle: Math.min(attempt.deepestKneeAngle, kneeAngle),
    reachedValidDepth:
      attempt.reachedValidDepth ||
      kneeAngle <= rules.validDepthKneeAngleMax ||
      phase === "bottom",
    sawDescending: attempt.sawDescending || phase === "descending" || phase === "bottom",
  };
}

export function evaluateLungeRep(
  attempt: LungeRepAttempt,
  rules: LungeRules,
): { valid: boolean; feedback: string } {
  if (!attempt.startedFromStanding || !attempt.sawDescending) {
    return { valid: false, feedback: "Ready" };
  }

  if (attempt.reachedValidDepth) {
    return { valid: true, feedback: "Good rep" };
  }

  if (attempt.deepestKneeAngle <= rules.minimumDescentKneeAngleMax) {
    return { valid: false, feedback: "Go slightly deeper" };
  }

  return { valid: false, feedback: "Ready" };
}

export function getLungeDepthStatus(
  attempt: LungeRepAttempt | null,
  phase: LungePhase,
): "waiting" | "good" | "too_shallow" {
  if (!attempt || phase === "standing") return "waiting";
  if (attempt.reachedValidDepth) return "good";
  return "waiting";
}

export function getLungeFormFeedback(
  metrics: LungeMetrics,
  phase: LungePhase,
  rules: LungeRules,
  attempt: LungeRepAttempt | null,
): string | null {
  if (
    metrics.rearKneeAngle !== null &&
    metrics.rearKneeAngle < rules.rearKneeAngleMin &&
    phase !== "standing"
  ) {
    return "Keep back leg straighter";
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

export function legLabel(leg: LungeLeg): string {
  return leg === "left" ? "Left" : "Right";
}
