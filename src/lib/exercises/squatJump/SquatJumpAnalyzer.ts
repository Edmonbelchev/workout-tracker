import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createSquatJumpRepAttempt,
  evaluateSquatJumpRep,
  getSquatJumpDepthStatus,
  getSquatJumpFormFeedback,
  updateSquatJumpRepAttempt,
  type SquatJumpRepAttempt,
} from "@/lib/exercises/squatJump/squatJumpFormFeedback";
import {
  calculateSquatJumpMetrics,
  EMPTY_SQUAT_JUMP_METRICS,
  type SquatJumpMetrics,
} from "@/lib/exercises/squatJump/squatJumpMetrics";
import {
  DEFAULT_SQUAT_JUMP_RULES,
  SQUAT_JUMP_DEPTH_LABELS,
  SQUAT_JUMP_PHASE_LABELS,
  type SquatJumpDepthStatus,
  type SquatJumpPhase,
  type SquatJumpRules,
} from "@/lib/exercises/squatJump/squatJumpRules";
import { assessSquatTrackingQuality } from "@/lib/exercises/squat/squatMetrics";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface SquatJumpStateTransition {
  from: SquatJumpPhase;
  to: SquatJumpPhase;
  timestamp: number;
  kneeAngle: number | null;
}

export interface SquatJumpRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  deepestKneeAngle: number;
  timestamp: number;
}

export interface SquatJumpAnalysis {
  exerciseId: "squat-jump";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: SquatJumpPhase;
  metrics: SquatJumpMetrics;
  smoothedKneeAngle: number | null;
  reps: number;
  invalidReps: number;
  depthStatus: SquatJumpDepthStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: SquatJumpStateTransition | null;
  transitionLog: SquatJumpStateTransition[];
  lastRepComplete: SquatJumpRepCompleteEvent | null;
}

export const EMPTY_SQUAT_JUMP_ANALYSIS: SquatJumpAnalysis = {
  exerciseId: "squat-jump",
  exerciseName: "Squat jump",
  trackingQuality: "poor",
  phase: "standing",
  metrics: {
    ...EMPTY_SQUAT_JUMP_METRICS,
  },
  smoothedKneeAngle: null,
  reps: 0,
  invalidReps: 0,
  depthStatus: "waiting",
  feedback: "Ready",
  coachingMessage: null,
  lastTransition: null,
  transitionLog: [],
  lastRepComplete: null,
};

const MAX_TRANSITION_LOG = 12;

export interface SquatJumpAnalyzerOptions {
  rules?: SquatJumpRules;
  onTransition?: (transition: SquatJumpStateTransition) => void;
  onRepComplete?: (event: SquatJumpRepCompleteEvent) => void;
}

export class SquatJumpAnalyzer implements ExerciseAnalyzer<SquatJumpAnalysis> {
  readonly exerciseId = "squat-jump" as const;
  readonly exerciseName = "Squat jump";

  private phase: SquatJumpPhase = "standing";
  private rules: SquatJumpRules;
  private onTransition?: (transition: SquatJumpStateTransition) => void;
  private onRepComplete?: (event: SquatJumpRepCompleteEvent) => void;
  private kneeSmoother = new ExponentialMovingAverage(0.25);
  private previousHipMidY: number | null = null;
  private lastTransition: SquatJumpStateTransition | null = null;
  private transitionLog: SquatJumpStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: SquatJumpRepAttempt | null = null;
  private depthStatus: SquatJumpDepthStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: SquatJumpRepCompleteEvent | null = null;
  private invalidFeedbackUntil = 0;

  constructor(options: SquatJumpAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_SQUAT_JUMP_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): SquatJumpAnalysis {
    const metrics = calculateSquatJumpMetrics(pose, this.previousHipMidY);
    const quality = trackingQuality ?? assessSquatTrackingQuality(pose);

    if (metrics.hipMidY !== null) {
      this.previousHipMidY = metrics.hipMidY;
    }

    if (quality === "poor" || metrics.flexionAngle === null) {
      this.kneeSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(metrics, quality, "Move so your full body is visible");
    }

    const smoothedKnee = this.kneeSmoother.update(metrics.flexionAngle);
    this.updatePhase(smoothedKnee, metrics);

    return this.buildAnalysis(metrics, quality, this.feedback, smoothedKnee);
  }

  reset(): void {
    this.phase = "standing";
    this.kneeSmoother.reset();
    this.previousHipMidY = null;
    this.lastTransition = null;
    this.transitionLog = [];
    this.reps = 0;
    this.invalidReps = 0;
    this.repAttempt = null;
    this.depthStatus = "waiting";
    this.feedback = "Ready";
    this.coachingMessage = null;
    this.lastRepComplete = null;
    this.invalidFeedbackUntil = 0;
  }

  private updatePhase(kneeAngle: number, metrics: SquatJumpMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "standing":
        if (kneeAngle < this.rules.descendingKneeAngleMax) next = "descending";
        break;
      case "descending":
        if (kneeAngle > this.rules.standingKneeAngleMin) next = "standing";
        else if (kneeAngle < this.rules.bottomKneeAngleMax) next = "bottom";
        break;
      case "bottom":
        if (kneeAngle > this.rules.bottomKneeAngleMin) next = "ascending";
        break;
      case "ascending":
        if (kneeAngle < this.rules.bottomKneeAngleMax) next = "bottom";
        else if (this.detectFlight(kneeAngle, metrics)) next = "flight";
        else if (kneeAngle > this.rules.standingReturnKneeAngleMin) next = "standing";
        break;
      case "flight":
        if (this.detectLanding(metrics)) next = "landing";
        break;
      case "landing":
        if (kneeAngle > this.rules.standingReturnKneeAngleMin) next = "standing";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, kneeAngle, metrics);
      this.recordTransition(previous, next, kneeAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updateSquatJumpRepAttempt(
        this.repAttempt,
        kneeAngle,
        this.phase,
        this.rules,
      );
      this.depthStatus = getSquatJumpDepthStatus(this.repAttempt, this.phase);
      this.updateLiveFeedback(metrics);
    }
  }

  private detectFlight(kneeAngle: number, metrics: SquatJumpMetrics): boolean {
    if (kneeAngle < this.rules.flightKneeAngleMin) return false;
    if (metrics.hipDeltaY === null) return false;
    return metrics.hipDeltaY <= this.rules.flightHipDeltaThreshold;
  }

  private detectLanding(metrics: SquatJumpMetrics): boolean {
    if (metrics.hipDeltaY === null) return false;
    return metrics.hipDeltaY >= this.rules.landingHipDeltaThreshold;
  }

  private handleTransition(
    from: SquatJumpPhase,
    to: SquatJumpPhase,
    kneeAngle: number,
    metrics: SquatJumpMetrics,
  ): void {
    if (from === "standing" && to === "descending") {
      this.repAttempt = { ...createSquatJumpRepAttempt(), startedFromStanding: true };
      this.depthStatus = "waiting";
      this.feedback = "Going down";
      return;
    }

    if (from === "descending" && to === "standing") {
      this.repAttempt = null;
      this.depthStatus = "waiting";
      this.feedback = "Ready";
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updateSquatJumpRepAttempt(
        this.repAttempt,
        kneeAngle,
        to,
        this.rules,
      );
    }

    if (
      (from === "ascending" && to === "standing") ||
      (from === "landing" && to === "standing")
    ) {
      if (this.repAttempt) {
        this.completeRep(this.repAttempt);
        this.repAttempt = null;
      }
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.updateLiveFeedback(metrics);
    if (this.repAttempt) {
      this.depthStatus = getSquatJumpDepthStatus(this.repAttempt, to);
    }
  }

  private completeRep(attempt: SquatJumpRepAttempt): void {
    const result = evaluateSquatJumpRep(attempt, this.rules);

    if (result.valid) {
      this.reps += 1;
      this.feedback = "Good rep";
      this.depthStatus = "good";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        deepestKneeAngle: attempt.deepestKneeAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    if (attempt.sawDescending && attempt.reachedValidDepth) {
      this.invalidReps += 1;
      this.feedback = result.feedback;
      this.depthStatus = attempt.sawFlight ? "too_shallow" : "no_jump";
      this.invalidFeedbackUntil = Date.now() + 2500;
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: false,
        deepestKneeAngle: attempt.deepestKneeAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.feedback = "Ready";
    this.depthStatus = "waiting";
  }

  private updateLiveFeedback(metrics: SquatJumpMetrics): void {
    if (Date.now() < this.invalidFeedbackUntil) return;

    this.coachingMessage = getSquatJumpFormFeedback(metrics, this.phase, this.rules);
    if (this.coachingMessage && this.phase !== "standing") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(
    from: SquatJumpPhase,
    to: SquatJumpPhase,
    kneeAngle: number,
  ): void {
    const transition: SquatJumpStateTransition = {
      from,
      to,
      timestamp: Date.now(),
      kneeAngle,
    };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-MAX_TRANSITION_LOG);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: SquatJumpPhase): string {
    switch (phase) {
      case "standing":
        return "Ready";
      case "descending":
        return "Going down";
      case "bottom":
        return "Hold depth";
      case "ascending":
        return "Explode up";
      case "flight":
        return "In the air";
      case "landing":
        return "Land soft";
    }
  }

  private buildAnalysis(
    metrics: SquatJumpMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedKneeAngle: number | null = null,
  ): SquatJumpAnalysis {
    return {
      exerciseId: "squat-jump",
      exerciseName: "Squat jump",
      trackingQuality,
      phase: this.phase,
      metrics,
      smoothedKneeAngle,
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

export function formatSquatJumpPhase(phase: SquatJumpPhase): string {
  return SQUAT_JUMP_PHASE_LABELS[phase];
}

export function formatSquatJumpDepthStatus(status: SquatJumpDepthStatus): string {
  return SQUAT_JUMP_DEPTH_LABELS[status];
}
