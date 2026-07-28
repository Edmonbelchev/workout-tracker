import type { PlankMetrics } from "@/lib/exercises/plank/plankMetrics";
import type { PlankPhase, PlankRules } from "@/lib/exercises/plank/plankRules";

export function getPlankFormFeedback(
  metrics: PlankMetrics,
  phase: PlankPhase,
  rules: PlankRules,
): string | null {
  if (phase !== "holding") return null;

  if (metrics.bodyLineAngle !== null && metrics.bodyLineAngle < rules.minHoldBodyLineAngle) {
    return "Keep your body straight";
  }

  if (
    metrics.elbowExtension !== null &&
    metrics.elbowExtension < rules.minElbowAngle - 10
  ) {
    return "Lock out your arms";
  }

  return null;
}

export function isPlankPosition(metrics: PlankMetrics, rules: PlankRules): boolean {
  return (
    metrics.bodyLineAngle !== null &&
    metrics.bodyLineAngle >= rules.minBodyLineAngle &&
    metrics.elbowExtension !== null &&
    metrics.elbowExtension >= rules.minElbowAngle
  );
}
