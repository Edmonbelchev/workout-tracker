import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createDipsRepAttempt,
  evaluateDipsRep,
  getDipsDepthStatus,
  getDipsFormFeedback,
  updateDipsRepAttempt,
  type DipsRepAttempt,
} from "@/lib/exercises/dips/dipsFormFeedback";
import {
  assessDipsTrackingQuality,
  calculateDipsMetrics,
  EMPTY_DIPS_METRICS,
  type DipsMetrics,
} from "@/lib/exercises/dips/dipsMetrics";
import {
  DEFAULT_DIPS_RULES,
  DIPS_DEPTH_LABELS,
  DIPS_PHASE_LABELS,
  type DipsDepthStatus,
  type DipsPhase,
  type DipsRules,
} from "@/lib/exercises/dips/dipsRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface DipsStateTransition {
  from: DipsPhase;
  to: DipsPhase;
  timestamp: number;
  elbowAngle: number | null;
}

export interface DipsRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  deepestElbowAngle: number;
  timestamp: number;
}

export interface DipsAnalysis {
  exerciseId: "dips";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: DipsPhase;
  metrics: DipsMetrics;
  smoothedElbowAngle: number | null;
  reps: number;
  invalidReps: number;
  depthStatus: DipsDepthStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: DipsStateTransition | null;
  transitionLog: DipsStateTransition[];
  lastRepComplete: DipsRepCompleteEvent | null;
}

export interface DipsAnalyzerOptions {
  rules?: DipsRules;
  onTransition?: (transition: DipsStateTransition) => void;
  onRepComplete?: (event: DipsRepCompleteEvent) => void;
}

export class DipsAnalyzer implements ExerciseAnalyzer<DipsAnalysis> {
  readonly exerciseId = "dips" as const;
  readonly exerciseName = "Dips";

  private phase: DipsPhase = "top";
  private rules: DipsRules;
  private onTransition?: (transition: DipsStateTransition) => void;
  private onRepComplete?: (event: DipsRepCompleteEvent) => void;
  private elbowSmoother = new ExponentialMovingAverage(0.25);
  private lastTransition: DipsStateTransition | null = null;
  private transitionLog: DipsStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: DipsRepAttempt | null = null;
  private depthStatus: DipsDepthStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: DipsRepCompleteEvent | null = null;
  private shallowFeedbackUntil = 0;

  constructor(options: DipsAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_DIPS_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): DipsAnalysis {
    const metrics = calculateDipsMetrics(pose);
    const quality = trackingQuality ?? assessDipsTrackingQuality(pose);

    if (quality === "poor" || metrics.flexionAngle === null) {
      this.elbowSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(metrics, quality, "Show arms, shoulders, and hips");
    }

    const smoothed = this.elbowSmoother.update(metrics.flexionAngle);
    this.updatePhase(smoothed, metrics);
    return this.buildAnalysis(metrics, quality, this.feedback, smoothed);
  }

  reset(): void {
    this.phase = "top";
    this.elbowSmoother.reset();
    this.lastTransition = null;
    this.transitionLog = [];
    this.reps = 0;
    this.invalidReps = 0;
    this.repAttempt = null;
    this.depthStatus = "waiting";
    this.feedback = "Ready";
    this.coachingMessage = null;
    this.lastRepComplete = null;
    this.shallowFeedbackUntil = 0;
  }

  private updatePhase(elbowAngle: number, metrics: DipsMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "top":
        if (elbowAngle < this.rules.descendingElbowAngleMax) next = "descending";
        break;
      case "descending":
        if (elbowAngle > this.rules.topElbowAngleMin) next = "top";
        else if (elbowAngle < this.rules.bottomElbowAngleMax) next = "bottom";
        break;
      case "bottom":
        if (elbowAngle > this.rules.bottomElbowAngleMin) next = "ascending";
        break;
      case "ascending":
        if (elbowAngle < this.rules.bottomElbowAngleMax) next = "bottom";
        else if (elbowAngle > this.rules.topReturnElbowAngleMin) next = "top";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, elbowAngle, metrics);
      this.recordTransition(previous, next, elbowAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updateDipsRepAttempt(this.repAttempt, elbowAngle, this.phase, this.rules);
      this.depthStatus = getDipsDepthStatus(this.repAttempt, this.phase);
      this.updateLiveFeedback(metrics);
    }
  }

  private handleTransition(
    from: DipsPhase,
    to: DipsPhase,
    elbowAngle: number,
    metrics: DipsMetrics,
  ): void {
    if (from === "top" && to === "descending") {
      this.repAttempt = { ...createDipsRepAttempt(), startedFromTop: true };
      this.depthStatus = "waiting";
      this.feedback = "Going down";
      this.coachingMessage = null;
      return;
    }

    if (from === "descending" && to === "top") {
      this.repAttempt = null;
      this.depthStatus = "waiting";
      this.feedback = "Ready";
      this.coachingMessage = null;
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updateDipsRepAttempt(this.repAttempt, elbowAngle, to, this.rules);
    }

    if (from === "ascending" && to === "top" && this.repAttempt) {
      this.completeRep(this.repAttempt);
      this.repAttempt = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.updateLiveFeedback(metrics);
    if (this.repAttempt) {
      this.depthStatus = getDipsDepthStatus(this.repAttempt, to);
    }
  }

  private completeRep(attempt: DipsRepAttempt): void {
    const result = evaluateDipsRep(attempt, this.rules);

    if (result.valid) {
      this.reps += 1;
      this.feedback = "Good rep";
      this.depthStatus = "good";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        deepestElbowAngle: attempt.deepestElbowAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    if (
      attempt.sawDescending &&
      attempt.deepestElbowAngle <= this.rules.minimumDescentElbowAngleMax
    ) {
      this.invalidReps += 1;
      this.feedback = "Go slightly lower";
      this.depthStatus = "too_shallow";
      this.shallowFeedbackUntil = Date.now() + 2500;
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: false,
        deepestElbowAngle: attempt.deepestElbowAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.feedback = "Ready";
    this.depthStatus = "waiting";
  }

  private updateLiveFeedback(metrics: DipsMetrics): void {
    if (Date.now() < this.shallowFeedbackUntil) {
      this.coachingMessage = "Go slightly lower";
      return;
    }

    this.coachingMessage = getDipsFormFeedback(
      metrics,
      this.phase,
      this.rules,
      this.repAttempt,
    );

    if (this.coachingMessage && this.phase !== "top") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(from: DipsPhase, to: DipsPhase, elbowAngle: number): void {
    const transition: DipsStateTransition = {
      from,
      to,
      timestamp: Date.now(),
      elbowAngle,
    };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-12);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: DipsPhase): string {
    switch (phase) {
      case "top":
        return "Ready";
      case "descending":
        return "Going down";
      case "bottom":
        return "Hold depth";
      case "ascending":
        return "Press up";
    }
  }

  private buildAnalysis(
    metrics: DipsMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedElbowAngle: number | null = null,
  ): DipsAnalysis {
    return {
      exerciseId: "dips",
      exerciseName: "Dips",
      trackingQuality,
      phase: this.phase,
      metrics,
      smoothedElbowAngle,
      reps: this.reps,
      invalidReps: this.invalidReps,
      depthStatus: this.depthStatus,
      feedback,
      coachingMessage: this.coachingMessage,
      lastTransition: this.lastTransition,
      transitionLog: [...this.transitionLog],
      lastRepComplete: this.lastRepComplete,
    };
  }
}

export function formatDipsPhase(phase: DipsPhase): string {
  return DIPS_PHASE_LABELS[phase];
}

export function formatDipsDepthStatus(status: DipsDepthStatus): string {
  return DIPS_DEPTH_LABELS[status];
}

export { EMPTY_DIPS_METRICS };
