import type { JumpingJackMetrics } from "@/lib/exercises/jumpingJack/jumpingJackMetrics";
import type { JumpingJackPhase } from "@/lib/exercises/jumpingJack/jumpingJackRules";

export function getJumpingJackFormFeedback(
  metrics: JumpingJackMetrics,
  phase: JumpingJackPhase,
): string | null {
  if (phase === "opening" && !metrics.armsUp) {
    return "Raise arms overhead";
  }

  if (phase === "opening" && !metrics.legsOpen) {
    return "Jump feet wider";
  }

  return null;
}
