import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createPushupRepAttempt,
  evaluatePushupRep,
  getPushupDepthStatus,
  getPushupFormFeedback,
  updatePushupRepAttempt,
  type PushupRepAttempt,
} from "@/lib/exercises/pushup/pushupFormFeedback";
import {
  calculatePushupMetrics,
  assessPushupTrackingQuality,
  EMPTY_PUSHUP_METRICS,
  type PushupMetrics,
} from "@/lib/exercises/pushup/pushupMetrics";
import {
  DEFAULT_PUSHUP_RULES,
  PUSHUP_DEPTH_LABELS,
  PUSHUP_PHASE_LABELS,
  type PushupDepthStatus,
  type PushupPhase,
  type PushupRules,
} from "@/lib/exercises/pushup/pushupRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PushupStateTransition {
  from: PushupPhase;
  to: PushupPhase;
  timestamp: number;
  elbowAngle: number | null;
}

export interface PushupRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  deepestElbowAngle: number;
  timestamp: number;
}

export interface PushupAnalysis {
  exerciseId: "push-up";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: PushupPhase;
  metrics: PushupMetrics;
  smoothedElbowAngle: number | null;
  reps: number;
  invalidReps: number;
  depthStatus: PushupDepthStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: PushupStateTransition | null;
  transitionLog: PushupStateTransition[];
  lastRepComplete: PushupRepCompleteEvent | null;
}

export const EMPTY_PUSHUP_ANALYSIS: PushupAnalysis = {
  exerciseId: "push-up",
  exerciseName: "Push-up",
  trackingQuality: "poor",
  phase: "plank",
  metrics: EMPTY_PUSHUP_METRICS,
  smoothedElbowAngle: null,
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

export interface PushupAnalyzerOptions {
  rules?: PushupRules;
  onTransition?: (transition: PushupStateTransition) => void;
  onRepComplete?: (event: PushupRepCompleteEvent) => void;
}

export class PushupAnalyzer implements ExerciseAnalyzer<PushupAnalysis> {
  readonly exerciseId = "push-up" as const;
  readonly exerciseName = "Push-up";

  private phase: PushupPhase = "plank";
  private rules: PushupRules;
  private onTransition?: (transition: PushupStateTransition) => void;
  private onRepComplete?: (event: PushupRepCompleteEvent) => void;
  private elbowSmoother = new ExponentialMovingAverage(0.25);
  private lastTransition: PushupStateTransition | null = null;
  private transitionLog: PushupStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: PushupRepAttempt | null = null;
  private depthStatus: PushupDepthStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: PushupRepCompleteEvent | null = null;
  private shallowFeedbackUntil = 0;

  constructor(options: PushupAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_PUSHUP_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): PushupAnalysis {
    const metrics = calculatePushupMetrics(pose);
    const quality = trackingQuality ?? assessPushupTrackingQuality(pose);

    if (quality === "poor" || metrics.averageElbowAngle === null) {
      this.elbowSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(
        metrics,
        quality,
        "Show shoulders, arms, and hips to the camera",
      );
    }

    const smoothedElbow = this.elbowSmoother.update(metrics.averageElbowAngle);
    this.updatePhase(smoothedElbow, metrics);

    return this.buildAnalysis(metrics, quality, this.feedback, smoothedElbow);
  }

  reset(): void {
    this.phase = "plank";
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

  private updatePhase(elbowAngle: number, metrics: PushupMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "plank":
        if (elbowAngle < this.rules.descendingElbowAngleMax) next = "descending";
        break;
      case "descending":
        if (elbowAngle > this.rules.plankElbowAngleMin) next = "plank";
        else if (elbowAngle < this.rules.bottomElbowAngleMax) next = "bottom";
        break;
      case "bottom":
        if (elbowAngle > this.rules.bottomElbowAngleMin) next = "ascending";
        break;
      case "ascending":
        if (elbowAngle < this.rules.bottomElbowAngleMax) next = "bottom";
        else if (elbowAngle > this.rules.plankReturnElbowAngleMin) next = "plank";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, elbowAngle, metrics);
      this.recordTransition(previous, next, elbowAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updatePushupRepAttempt(
        this.repAttempt,
        elbowAngle,
        this.phase,
        this.rules,
      );
      this.depthStatus = getPushupDepthStatus(this.repAttempt, this.phase);
      this.updateLiveFeedback(metrics);
    }
  }

  private handleTransition(
    from: PushupPhase,
    to: PushupPhase,
    elbowAngle: number,
    metrics: PushupMetrics,
  ): void {
    if (from === "plank" && to === "descending") {
      this.repAttempt = { ...createPushupRepAttempt(), startedFromPlank: true };
      this.depthStatus = "waiting";
      this.feedback = "Going down";
      this.coachingMessage = null;
      return;
    }

    if (from === "descending" && to === "plank") {
      this.repAttempt = null;
      this.depthStatus = "waiting";
      this.feedback = "Ready";
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updatePushupRepAttempt(
        this.repAttempt,
        elbowAngle,
        to,
        this.rules,
      );
    }

    if (from === "ascending" && to === "plank" && this.repAttempt) {
      this.completeRep(this.repAttempt);
      this.repAttempt = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.updateLiveFeedback(metrics);
    if (this.repAttempt) {
      this.depthStatus = getPushupDepthStatus(this.repAttempt, to);
    }
  }

  private completeRep(attempt: PushupRepAttempt): void {
    const result = evaluatePushupRep(attempt, this.rules);

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

  private updateLiveFeedback(metrics: PushupMetrics): void {
    if (Date.now() < this.shallowFeedbackUntil) {
      this.coachingMessage = "Go slightly lower";
      return;
    }

    this.coachingMessage = getPushupFormFeedback(
      metrics,
      this.phase,
      this.rules,
      this.repAttempt,
    );

    if (this.coachingMessage && this.phase !== "plank") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(
    from: PushupPhase,
    to: PushupPhase,
    elbowAngle: number,
  ): void {
    const transition: PushupStateTransition = {
      from,
      to,
      timestamp: Date.now(),
      elbowAngle,
    };

    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-MAX_TRANSITION_LOG);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: PushupPhase): string {
    switch (phase) {
      case "plank":
        return "Ready";
      case "descending":
        return "Going down";
      case "bottom":
        return "Hold bottom";
      case "ascending":
        return "Push up";
    }
  }

  private buildAnalysis(
    metrics: PushupMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedElbowAngle: number | null = null,
  ): PushupAnalysis {
    return {
      exerciseId: "push-up",
      exerciseName: "Push-up",
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

export function formatPushupPhase(phase: PushupPhase): string {
  return PUSHUP_PHASE_LABELS[phase];
}

export function formatPushupDepthStatus(status: PushupDepthStatus): string {
  return PUSHUP_DEPTH_LABELS[status];
}
