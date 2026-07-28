import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import { getJumpingJackFormFeedback } from "@/lib/exercises/jumpingJack/jumpingJackFormFeedback";
import {
  assessJumpingJackTrackingQuality,
  calculateJumpingJackMetrics,
  EMPTY_JUMPING_JACK_METRICS,
  isJackClosed,
  isJackOpen,
  type JumpingJackMetrics,
} from "@/lib/exercises/jumpingJack/jumpingJackMetrics";
import {
  DEFAULT_JUMPING_JACK_RULES,
  JUMPING_JACK_PHASE_LABELS,
  type JumpingJackPhase,
  type JumpingJackRules,
} from "@/lib/exercises/jumpingJack/jumpingJackRules";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface JumpingJackStateTransition {
  from: JumpingJackPhase;
  to: JumpingJackPhase;
  timestamp: number;
}

export interface JumpingJackRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  timestamp: number;
}

export interface JumpingJackAnalysis {
  exerciseId: "jumping-jack";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: JumpingJackPhase;
  metrics: JumpingJackMetrics;
  reps: number;
  invalidReps: number;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: JumpingJackStateTransition | null;
  transitionLog: JumpingJackStateTransition[];
  lastRepComplete: JumpingJackRepCompleteEvent | null;
}

export interface JumpingJackAnalyzerOptions {
  rules?: JumpingJackRules;
  onTransition?: (transition: JumpingJackStateTransition) => void;
  onRepComplete?: (event: JumpingJackRepCompleteEvent) => void;
}

export class JumpingJackAnalyzer implements ExerciseAnalyzer<JumpingJackAnalysis> {
  readonly exerciseId = "jumping-jack" as const;
  readonly exerciseName = "Jumping jack";

  private phase: JumpingJackPhase = "closed";
  private rules: JumpingJackRules;
  private onTransition?: (transition: JumpingJackStateTransition) => void;
  private onRepComplete?: (event: JumpingJackRepCompleteEvent) => void;
  private lastTransition: JumpingJackStateTransition | null = null;
  private transitionLog: JumpingJackStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private sawOpen = false;
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: JumpingJackRepCompleteEvent | null = null;

  constructor(options: JumpingJackAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_JUMPING_JACK_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): JumpingJackAnalysis {
    const metrics = calculateJumpingJackMetrics(pose);
    const quality = trackingQuality ?? assessJumpingJackTrackingQuality(pose);

    if (quality === "poor" || metrics.armRaise === null) {
      this.coachingMessage = null;
      return this.buildAnalysis(metrics, quality, "Show your full body head to feet");
    }

    this.updatePhase(metrics);
    return this.buildAnalysis(metrics, quality, this.feedback);
  }

  reset(): void {
    this.phase = "closed";
    this.lastTransition = null;
    this.transitionLog = [];
    this.reps = 0;
    this.invalidReps = 0;
    this.sawOpen = false;
    this.feedback = "Ready";
    this.coachingMessage = null;
    this.lastRepComplete = null;
  }

  private updatePhase(metrics: JumpingJackMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "closed":
        if (!isJackClosed(metrics, this.rules) && (metrics.armsUp || metrics.legsOpen)) {
          next = "opening";
        }
        break;
      case "opening":
        if (isJackOpen(metrics, this.rules)) next = "open";
        else if (isJackClosed(metrics, this.rules)) next = "closed";
        break;
      case "open":
        if (!isJackOpen(metrics, this.rules)) next = "closing";
        break;
      case "closing":
        if (isJackOpen(metrics, this.rules)) next = "open";
        else if (isJackClosed(metrics, this.rules)) next = "closed";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next);
      this.recordTransition(previous, next);
      this.phase = next;
    } else {
      this.coachingMessage = getJumpingJackFormFeedback(metrics, this.phase);
      if (this.coachingMessage) this.feedback = this.coachingMessage;
    }
  }

  private handleTransition(from: JumpingJackPhase, to: JumpingJackPhase): void {
    if (to === "open") {
      this.sawOpen = true;
      this.feedback = "Open";
      this.coachingMessage = null;
      return;
    }

    if (from === "closing" && to === "closed" && this.sawOpen) {
      this.reps += 1;
      this.sawOpen = false;
      this.feedback = "Good rep";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    if (from === "opening" && to === "closed") {
      this.sawOpen = false;
      this.feedback = "Ready";
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.coachingMessage = null;
  }

  private recordTransition(from: JumpingJackPhase, to: JumpingJackPhase): void {
    const transition: JumpingJackStateTransition = { from, to, timestamp: Date.now() };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-12);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: JumpingJackPhase): string {
    switch (phase) {
      case "closed":
        return "Ready";
      case "opening":
        return "Jump out";
      case "open":
        return "Open";
      case "closing":
        return "Jump in";
    }
  }

  private buildAnalysis(
    metrics: JumpingJackMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
  ): JumpingJackAnalysis {
    return {
      exerciseId: "jumping-jack",
      exerciseName: "Jumping jack",
      trackingQuality,
      phase: this.phase,
      metrics,
      reps: this.reps,
      invalidReps: this.invalidReps,
      feedback,
      coachingMessage: this.coachingMessage,
      lastTransition: this.lastTransition,
      transitionLog: [...this.transitionLog],
      lastRepComplete: this.lastRepComplete,
    };
  }
}

export function formatJumpingJackPhase(phase: JumpingJackPhase): string {
  return JUMPING_JACK_PHASE_LABELS[phase];
}

export { EMPTY_JUMPING_JACK_METRICS };
