import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createAbsRepAttempt,
  evaluateAbsRep,
  getAbsDepthStatus,
  getAbsFormFeedback,
  updateAbsRepAttempt,
  type AbsRepAttempt,
} from "@/lib/exercises/abs/absFormFeedback";
import {
  assessAbsTrackingQuality,
  calculateAbsMetrics,
  type AbsMetrics,
} from "@/lib/exercises/abs/absMetrics";
import {
  ABS_DEPTH_LABELS,
  ABS_PHASE_LABELS,
  DEFAULT_ABS_RULES,
  type AbsDepthStatus,
  type AbsPhase,
  type AbsRules,
} from "@/lib/exercises/abs/absRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface AbsStateTransition {
  from: AbsPhase;
  to: AbsPhase;
  timestamp: number;
  hipAngle: number | null;
}

export interface AbsRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  peakHipAngle: number;
  timestamp: number;
}

export interface AbsAnalysis {
  exerciseId: "abs";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: AbsPhase;
  metrics: AbsMetrics;
  smoothedHipAngle: number | null;
  reps: number;
  invalidReps: number;
  depthStatus: AbsDepthStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: AbsStateTransition | null;
  transitionLog: AbsStateTransition[];
  lastRepComplete: AbsRepCompleteEvent | null;
}

export const EMPTY_ABS_ANALYSIS: AbsAnalysis = {
  exerciseId: "abs",
  exerciseName: "Abs",
  trackingQuality: "poor",
  phase: "flat",
  metrics: { leftHipFlexion: null, rightHipFlexion: null, averageHipFlexion: null },
  smoothedHipAngle: null,
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

export interface AbsAnalyzerOptions {
  rules?: AbsRules;
  onTransition?: (transition: AbsStateTransition) => void;
  onRepComplete?: (event: AbsRepCompleteEvent) => void;
}

export class AbsAnalyzer implements ExerciseAnalyzer<AbsAnalysis> {
  readonly exerciseId = "abs" as const;
  readonly exerciseName = "Abs";

  private phase: AbsPhase = "flat";
  private rules: AbsRules;
  private onTransition?: (transition: AbsStateTransition) => void;
  private onRepComplete?: (event: AbsRepCompleteEvent) => void;
  private hipSmoother = new ExponentialMovingAverage(0.25);
  private lastTransition: AbsStateTransition | null = null;
  private transitionLog: AbsStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: AbsRepAttempt | null = null;
  private depthStatus: AbsDepthStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: AbsRepCompleteEvent | null = null;
  private invalidFeedbackUntil = 0;

  constructor(options: AbsAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_ABS_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): AbsAnalysis {
    const metrics = calculateAbsMetrics(pose);
    const quality = trackingQuality ?? assessAbsTrackingQuality(pose);

    if (quality === "poor" || metrics.averageHipFlexion === null) {
      this.hipSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(
        metrics,
        quality,
        "Show shoulders, hips, and knees from the side",
      );
    }

    const smoothedHip = this.hipSmoother.update(metrics.averageHipFlexion);
    this.updatePhase(smoothedHip);

    return this.buildAnalysis(metrics, quality, this.feedback, smoothedHip);
  }

  reset(): void {
    this.phase = "flat";
    this.hipSmoother.reset();
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

  private updatePhase(hipAngle: number): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "flat":
        if (hipAngle < this.rules.curlingHipAngleMax) next = "curling";
        break;
      case "curling":
        if (hipAngle > this.rules.flatHipAngleMin) next = "flat";
        else if (hipAngle < this.rules.peakHipAngleMax) next = "peak";
        break;
      case "peak":
        if (hipAngle > this.rules.peakHipAngleMin) next = "lowering";
        break;
      case "lowering":
        if (hipAngle < this.rules.peakHipAngleMax) next = "peak";
        else if (hipAngle > this.rules.flatReturnHipAngleMin) next = "flat";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, hipAngle);
      this.recordTransition(previous, next, hipAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updateAbsRepAttempt(
        this.repAttempt,
        hipAngle,
        this.phase,
        this.rules,
      );
      this.depthStatus = getAbsDepthStatus(this.repAttempt, this.phase);
      this.updateLiveFeedback();
    }
  }

  private handleTransition(
    from: AbsPhase,
    to: AbsPhase,
    hipAngle: number,
  ): void {
    if (from === "flat" && to === "curling") {
      this.repAttempt = { ...createAbsRepAttempt(), startedFromFlat: true };
      this.depthStatus = "waiting";
      this.feedback = "Curl up";
      return;
    }

    if (from === "curling" && to === "flat") {
      this.repAttempt = null;
      this.depthStatus = "waiting";
      this.feedback = "Ready";
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updateAbsRepAttempt(
        this.repAttempt,
        hipAngle,
        to,
        this.rules,
      );
    }

    if (from === "lowering" && to === "flat" && this.repAttempt) {
      this.completeRep(this.repAttempt);
      this.repAttempt = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.updateLiveFeedback();
    if (this.repAttempt) {
      this.depthStatus = getAbsDepthStatus(this.repAttempt, to);
    }
  }

  private completeRep(attempt: AbsRepAttempt): void {
    const result = evaluateAbsRep(attempt, this.rules);

    if (result.valid) {
      this.reps += 1;
      this.feedback = "Good rep";
      this.depthStatus = "good";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        peakHipAngle: attempt.peakHipAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    if (attempt.sawCurling && attempt.peakHipAngle <= this.rules.minimumCurlHipAngleMax) {
      this.invalidReps += 1;
      this.feedback = result.feedback;
      this.depthStatus = "too_shallow";
      this.invalidFeedbackUntil = Date.now() + 2500;
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: false,
        peakHipAngle: attempt.peakHipAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.feedback = "Ready";
    this.depthStatus = "waiting";
  }

  private updateLiveFeedback(): void {
    if (Date.now() < this.invalidFeedbackUntil) return;

    this.coachingMessage = getAbsFormFeedback(this.phase, this.repAttempt, this.rules);
    if (this.coachingMessage && this.phase !== "flat") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(from: AbsPhase, to: AbsPhase, hipAngle: number): void {
    const transition: AbsStateTransition = {
      from,
      to,
      timestamp: Date.now(),
      hipAngle,
    };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-MAX_TRANSITION_LOG);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: AbsPhase): string {
    switch (phase) {
      case "flat":
        return "Ready";
      case "curling":
        return "Curl up";
      case "peak":
        return "Hold";
      case "lowering":
        return "Lower slow";
    }
  }

  private buildAnalysis(
    metrics: AbsMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedHipAngle: number | null = null,
  ): AbsAnalysis {
    return {
      exerciseId: "abs",
      exerciseName: "Abs",
      trackingQuality,
      phase: this.phase,
      metrics,
      smoothedHipAngle,
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

export function formatAbsPhase(phase: AbsPhase): string {
  return ABS_PHASE_LABELS[phase];
}

export function formatAbsDepthStatus(status: AbsDepthStatus): string {
  return ABS_DEPTH_LABELS[status];
}
