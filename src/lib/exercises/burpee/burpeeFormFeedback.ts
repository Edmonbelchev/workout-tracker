import type { BurpeeMetrics } from "@/lib/exercises/burpee/burpeeMetrics";
import type { BurpeePhase } from "@/lib/exercises/burpee/burpeeRules";

export interface BurpeeRepAttempt {
  sawSquat: boolean;
  sawPlank: boolean;
  sawPush: boolean;
  sawJump: boolean;
  deepestElbow: number;
}

export function createBurpeeRepAttempt(): BurpeeRepAttempt {
  return {
    sawSquat: false,
    sawPlank: false,
    sawPush: false,
    sawJump: false,
    deepestElbow: 180,
  };
}

export function updateBurpeeRepAttempt(
  attempt: BurpeeRepAttempt,
  phase: BurpeePhase,
  elbowFlexion: number | null,
): BurpeeRepAttempt {
  return {
    sawSquat: attempt.sawSquat || phase === "squat",
    sawPlank: attempt.sawPlank || phase === "plank" || phase === "chest_down",
    sawPush:
      attempt.sawPush ||
      phase === "chest_down" ||
      (elbowFlexion !== null && elbowFlexion <= 120),
    sawJump: attempt.sawJump || phase === "jump",
    deepestElbow:
      elbowFlexion !== null
        ? Math.min(attempt.deepestElbow, elbowFlexion)
        : attempt.deepestElbow,
  };
}

export function evaluateBurpeeRep(attempt: BurpeeRepAttempt): {
  valid: boolean;
  feedback: string;
} {
  if (!attempt.sawSquat) return { valid: false, feedback: "Ready" };
  if (!attempt.sawPlank) return { valid: false, feedback: "Ready" };
  if (!attempt.sawPush) return { valid: false, feedback: "Chest to floor" };
  if (!attempt.sawJump) return { valid: false, feedback: "Jump at the top" };
  return { valid: true, feedback: "Good rep" };
}

export function getBurpeeFormFeedback(
  phase: BurpeePhase,
  metrics: BurpeeMetrics,
): string | null {
  if (phase === "squat") return "Hands to floor";
  if (phase === "plank" && !metrics.handsDown) return "Plant your hands";
  if (phase === "chest_down") return "Chest down";
  if (phase === "chest_up") return "Press up";
  if (phase === "jump") return "Explode up";
  return null;
}
