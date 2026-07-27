import type { AbsPhase, AbsRules } from "@/lib/exercises/abs/absRules";

export interface AbsRepAttempt {
  startedFromFlat: boolean;
  reachedValidPeak: boolean;
  peakHipAngle: number;
  sawCurling: boolean;
}

export function createAbsRepAttempt(): AbsRepAttempt {
  return {
    startedFromFlat: false,
    reachedValidPeak: false,
    peakHipAngle: 180,
    sawCurling: false,
  };
}

export function updateAbsRepAttempt(
  attempt: AbsRepAttempt,
  hipAngle: number,
  phase: AbsPhase,
  rules: AbsRules,
): AbsRepAttempt {
  return {
    ...attempt,
    peakHipAngle: Math.min(attempt.peakHipAngle, hipAngle),
    reachedValidPeak:
      attempt.reachedValidPeak ||
      hipAngle <= rules.validPeakHipAngleMax ||
      phase === "peak",
    sawCurling: attempt.sawCurling || phase === "curling" || phase === "peak",
  };
}

export function evaluateAbsRep(
  attempt: AbsRepAttempt,
  rules: AbsRules,
): { valid: boolean; feedback: string } {
  if (!attempt.startedFromFlat || !attempt.sawCurling) {
    return { valid: false, feedback: "Ready" };
  }

  if (attempt.reachedValidPeak) {
    return { valid: true, feedback: "Good rep" };
  }

  if (attempt.peakHipAngle <= rules.minimumCurlHipAngleMax) {
    return { valid: false, feedback: "Curl higher" };
  }

  return { valid: false, feedback: "Ready" };
}

export function getAbsDepthStatus(
  attempt: AbsRepAttempt | null,
  phase: AbsPhase,
): "waiting" | "good" | "too_shallow" {
  if (!attempt || phase === "flat") return "waiting";
  if (attempt.reachedValidPeak) return "good";
  return "waiting";
}

export function getAbsFormFeedback(
  phase: AbsPhase,
  attempt: AbsRepAttempt | null,
  rules: AbsRules,
): string | null {
  if (
    phase === "peak" &&
    attempt &&
    !attempt.reachedValidPeak &&
    attempt.peakHipAngle <= rules.minimumCurlHipAngleMax
  ) {
    return "Squeeze higher";
  }

  if (phase === "curling") {
    return "Curl up";
  }

  return null;
}
