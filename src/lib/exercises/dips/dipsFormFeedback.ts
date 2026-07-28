import type { DipsMetrics } from "@/lib/exercises/dips/dipsMetrics";
import type { DipsPhase, DipsRules } from "@/lib/exercises/dips/dipsRules";

export interface DipsRepAttempt {
  startedFromTop: boolean;
  reachedValidDepth: boolean;
  deepestElbowAngle: number;
  sawDescending: boolean;
}

export function createDipsRepAttempt(): DipsRepAttempt {
  return {
    startedFromTop: false,
    reachedValidDepth: false,
    deepestElbowAngle: 180,
    sawDescending: false,
  };
}

export function updateDipsRepAttempt(
  attempt: DipsRepAttempt,
  elbowAngle: number,
  phase: DipsPhase,
  rules: DipsRules,
): DipsRepAttempt {
  return {
    ...attempt,
    deepestElbowAngle: Math.min(attempt.deepestElbowAngle, elbowAngle),
    reachedValidDepth:
      attempt.reachedValidDepth ||
      elbowAngle <= rules.validDepthElbowAngleMax ||
      phase === "bottom",
    sawDescending: attempt.sawDescending || phase === "descending" || phase === "bottom",
  };
}

export function evaluateDipsRep(
  attempt: DipsRepAttempt,
  rules: DipsRules,
): { valid: boolean; feedback: string } {
  if (!attempt.startedFromTop || !attempt.sawDescending) {
    return { valid: false, feedback: "Ready" };
  }

  if (attempt.reachedValidDepth) {
    return { valid: true, feedback: "Good rep" };
  }

  if (attempt.deepestElbowAngle <= rules.minimumDescentElbowAngleMax) {
    return { valid: false, feedback: "Go slightly lower" };
  }

  return { valid: false, feedback: "Ready" };
}

export function getDipsDepthStatus(
  attempt: DipsRepAttempt | null,
  phase: DipsPhase,
): "waiting" | "good" | "too_shallow" {
  if (!attempt || phase === "top") return "waiting";
  if (attempt.reachedValidDepth) return "good";
  return "waiting";
}

export function getDipsFormFeedback(
  metrics: DipsMetrics,
  phase: DipsPhase,
  rules: DipsRules,
  attempt: DipsRepAttempt | null,
): string | null {
  if (!metrics.isVerticalTorso && (phase === "top" || phase === "descending")) {
    return "Stay upright on the bars";
  }

  if (
    phase === "bottom" &&
    attempt &&
    !attempt.reachedValidDepth &&
    attempt.deepestElbowAngle <= rules.minimumDescentElbowAngleMax
  ) {
    return "Go a little lower";
  }

  return null;
}
