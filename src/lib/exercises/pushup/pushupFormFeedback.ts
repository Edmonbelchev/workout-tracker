import type { PushupMetrics } from "@/lib/exercises/pushup/pushupMetrics";
import type { PushupPhase, PushupRules } from "@/lib/exercises/pushup/pushupRules";

export interface PushupRepAttempt {
  startedFromPlank: boolean;
  reachedValidDepth: boolean;
  deepestElbowAngle: number;
  sawDescending: boolean;
}

export function createPushupRepAttempt(): PushupRepAttempt {
  return {
    startedFromPlank: false,
    reachedValidDepth: false,
    deepestElbowAngle: 180,
    sawDescending: false,
  };
}

export function updatePushupRepAttempt(
  attempt: PushupRepAttempt,
  elbowAngle: number,
  phase: PushupPhase,
  rules: PushupRules,
): PushupRepAttempt {
  return {
    ...attempt,
    deepestElbowAngle: Math.min(attempt.deepestElbowAngle, elbowAngle),
    reachedValidDepth:
      attempt.reachedValidDepth ||
      elbowAngle <= rules.validDepthElbowAngleMax ||
      phase === "bottom",
    sawDescending:
      attempt.sawDescending || phase === "descending" || phase === "bottom",
  };
}

export function evaluatePushupRep(
  attempt: PushupRepAttempt,
  rules: PushupRules,
): { valid: boolean; feedback: string } {
  if (!attempt.startedFromPlank || !attempt.sawDescending) {
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

export function getPushupDepthStatus(
  attempt: PushupRepAttempt | null,
  phase: PushupPhase,
): "waiting" | "good" | "too_shallow" {
  if (!attempt || phase === "plank") return "waiting";
  if (attempt.reachedValidDepth) return "good";
  return "waiting";
}

export function getPushupFormFeedback(
  metrics: PushupMetrics,
  phase: PushupPhase,
  rules: PushupRules,
  attempt: PushupRepAttempt | null,
): string | null {
  if (
    metrics.cameraView === "side" &&
    metrics.bodyLineAngle !== null &&
    metrics.bodyLineAngle < rules.minBodyLineAngle &&
    (phase === "plank" || phase === "descending" || phase === "bottom")
  ) {
    return "Keep your body straight";
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
