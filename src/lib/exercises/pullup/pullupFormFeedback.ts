import {
  isAtTop,
  type PullupMetrics,
} from "@/lib/exercises/pullup/pullupMetrics";
import type { PullupPhase, PullupRules } from "@/lib/exercises/pullup/pullupRules";

export interface PullupRepAttempt {
  startedFromHang: boolean;
  reachedValidTop: boolean;
  peakElbowAngle: number;
  sawPulling: boolean;
  bestWristClearance: number;
}

export function createPullupRepAttempt(): PullupRepAttempt {
  return {
    startedFromHang: false,
    reachedValidTop: false,
    peakElbowAngle: 180,
    sawPulling: false,
    bestWristClearance: 0,
  };
}

export function updatePullupRepAttempt(
  attempt: PullupRepAttempt,
  elbowAngle: number,
  metrics: PullupMetrics,
  phase: PullupPhase,
  rules: PullupRules,
): PullupRepAttempt {
  const bestWristClearance = Math.max(
    attempt.bestWristClearance,
    metrics.wristClearance ?? 0,
  );
  const reachedValidTop =
    attempt.reachedValidTop ||
    phase === "top" ||
    elbowAngle <= rules.validTopElbowAngleMax ||
    bestWristClearance >= rules.validTopWristClearanceMin;

  return {
    ...attempt,
    peakElbowAngle: Math.min(attempt.peakElbowAngle, elbowAngle),
    bestWristClearance,
    reachedValidTop,
    sawPulling: attempt.sawPulling || phase === "pulling" || phase === "top",
  };
}

export function evaluatePullupRep(
  attempt: PullupRepAttempt,
  rules: PullupRules,
): { valid: boolean; feedback: string } {
  if (!attempt.startedFromHang || !attempt.sawPulling) {
    return { valid: false, feedback: "Ready" };
  }

  if (attempt.reachedValidTop) {
    return { valid: true, feedback: "Good rep" };
  }

  if (attempt.peakElbowAngle <= rules.minimumPullElbowAngleMax) {
    return { valid: false, feedback: "Pull higher" };
  }

  return { valid: false, feedback: "Ready" };
}

export function getPullupHeightStatus(
  attempt: PullupRepAttempt | null,
  phase: PullupPhase,
): "waiting" | "good" | "too_low" {
  if (!attempt || phase === "hanging") return "waiting";
  if (attempt.reachedValidTop) return "good";
  return "waiting";
}

export function getPullupFormFeedback(
  metrics: PullupMetrics,
  phase: PullupPhase,
  elbowAngle: number,
  rules: PullupRules,
): string | null {
  if (phase === "pulling") {
    return "Pull up";
  }

  if (
    phase === "top" &&
    !isAtTop(elbowAngle, metrics.wristClearance, rules)
  ) {
    return "Get chin over the bar";
  }

  if (phase === "lowering") {
    return "Lower with control";
  }

  return null;
}
