import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createPullupRepAttempt,
  evaluatePullupRep,
  getPullupFormFeedback,
  getPullupHeightStatus,
  updatePullupRepAttempt,
  type PullupRepAttempt,
} from "@/lib/exercises/pullup/pullupFormFeedback";
import {
  assessPullupTrackingQuality,
  calculatePullupMetrics,
  isAtTop,
  isOutOfTop,
  type PullupMetrics,
} from "@/lib/exercises/pullup/pullupMetrics";
import {
  DEFAULT_PULLUP_RULES,
  PULLUP_HEIGHT_LABELS,
  PULLUP_PHASE_LABELS,
  type PullupHeightStatus,
  type PullupPhase,
  type PullupRules,
} from "@/lib/exercises/pullup/pullupRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PullupStateTransition {
  from: PullupPhase;
  to: PullupPhase;
  timestamp: number;
  elbowAngle: number | null;
}

export interface PullupRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  peakElbowAngle: number;
  timestamp: number;
}

export interface PullupAnalysis {
  exerciseId: "pull-up";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: PullupPhase;
  metrics: PullupMetrics;
  smoothedElbowAngle: number | null;
  reps: number;
  invalidReps: number;
  heightStatus: PullupHeightStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: PullupStateTransition | null;
  transitionLog: PullupStateTransition[];
  lastRepComplete: PullupRepCompleteEvent | null;
}

export const EMPTY_PULLUP_ANALYSIS: PullupAnalysis = {
  exerciseId: "pull-up",
  exerciseName: "Pull-up",
  trackingQuality: "poor",
  phase: "hanging",
  metrics: {
    cameraView: "unknown",
    leftElbowAngle: null,
    rightElbowAngle: null,
    averageElbowAngle: null,
    flexionAngle: null,
    wristClearance: null,
  },
  smoothedElbowAngle: null,
  reps: 0,
  invalidReps: 0,
  heightStatus: "waiting",
  feedback: "Ready",
  coachingMessage: null,
  lastTransition: null,
  transitionLog: [],
  lastRepComplete: null,
};

const MAX_TRANSITION_LOG = 12;

export interface PullupAnalyzerOptions {
  rules?: PullupRules;
  onTransition?: (transition: PullupStateTransition) => void;
  onRepComplete?: (event: PullupRepCompleteEvent) => void;
}

export class PullupAnalyzer implements ExerciseAnalyzer<PullupAnalysis> {
  readonly exerciseId = "pull-up" as const;
  readonly exerciseName = "Pull-up";

  private phase: PullupPhase = "hanging";
  private rules: PullupRules;
  private onTransition?: (transition: PullupStateTransition) => void;
  private onRepComplete?: (event: PullupRepCompleteEvent) => void;
  private elbowSmoother = new ExponentialMovingAverage(0.25);
  private lastTransition: PullupStateTransition | null = null;
  private transitionLog: PullupStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: PullupRepAttempt | null = null;
  private heightStatus: PullupHeightStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: PullupRepCompleteEvent | null = null;
  private invalidFeedbackUntil = 0;

  constructor(options: PullupAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_PULLUP_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): PullupAnalysis {
    const metrics = calculatePullupMetrics(pose);
    const quality = trackingQuality ?? assessPullupTrackingQuality(pose);

    if (quality === "poor" || metrics.flexionAngle === null) {
      this.elbowSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(
        metrics,
        quality,
        "Show shoulders, arms, and hands overhead",
      );
    }

    const smoothedElbow = this.elbowSmoother.update(metrics.flexionAngle);
    this.updatePhase(smoothedElbow, metrics);

    return this.buildAnalysis(metrics, quality, this.feedback, smoothedElbow);
  }

  reset(): void {
    this.phase = "hanging";
    this.elbowSmoother.reset();
    this.lastTransition = null;
    this.transitionLog = [];
    this.reps = 0;
    this.invalidReps = 0;
    this.repAttempt = null;
    this.heightStatus = "waiting";
    this.feedback = "Ready";
    this.coachingMessage = null;
    this.lastRepComplete = null;
    this.invalidFeedbackUntil = 0;
  }

  private updatePhase(elbowAngle: number, metrics: PullupMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "hanging":
        if (elbowAngle < this.rules.pullingElbowAngleMax) next = "pulling";
        break;
      case "pulling":
        if (elbowAngle > this.rules.hangingElbowAngleMin) next = "hanging";
        else if (isAtTop(elbowAngle, metrics.wristClearance, this.rules)) next = "top";
        break;
      case "top":
        if (isOutOfTop(elbowAngle, metrics.wristClearance, this.rules)) next = "lowering";
        break;
      case "lowering":
        if (isAtTop(elbowAngle, metrics.wristClearance, this.rules)) next = "top";
        else if (elbowAngle > this.rules.hangingReturnElbowAngleMin) next = "hanging";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, elbowAngle, metrics);
      this.recordTransition(previous, next, elbowAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updatePullupRepAttempt(
        this.repAttempt,
        elbowAngle,
        metrics,
        this.phase,
        this.rules,
      );
      this.heightStatus = getPullupHeightStatus(this.repAttempt, this.phase);
      this.updateLiveFeedback(metrics, elbowAngle);
    }
  }

  private handleTransition(
    from: PullupPhase,
    to: PullupPhase,
    elbowAngle: number,
    metrics: PullupMetrics,
  ): void {
    if (from === "hanging" && to === "pulling") {
      this.repAttempt = { ...createPullupRepAttempt(), startedFromHang: true };
      this.heightStatus = "waiting";
      this.feedback = "Pull up";
      return;
    }

    if (from === "pulling" && to === "hanging") {
      this.repAttempt = null;
      this.heightStatus = "waiting";
      this.feedback = "Ready";
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updatePullupRepAttempt(
        this.repAttempt,
        elbowAngle,
        metrics,
        to,
        this.rules,
      );
    }

    if (from === "lowering" && to === "hanging" && this.repAttempt) {
      this.completeRep(this.repAttempt);
      this.repAttempt = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.updateLiveFeedback(metrics, elbowAngle);
    if (this.repAttempt) {
      this.heightStatus = getPullupHeightStatus(this.repAttempt, to);
    }
  }

  private completeRep(attempt: PullupRepAttempt): void {
    const result = evaluatePullupRep(attempt, this.rules);

    if (result.valid) {
      this.reps += 1;
      this.feedback = "Good rep";
      this.heightStatus = "good";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        peakElbowAngle: attempt.peakElbowAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    if (attempt.sawPulling && attempt.peakElbowAngle <= this.rules.minimumPullElbowAngleMax) {
      this.invalidReps += 1;
      this.feedback = result.feedback;
      this.heightStatus = "too_low";
      this.invalidFeedbackUntil = Date.now() + 2500;
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: false,
        peakElbowAngle: attempt.peakElbowAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.feedback = "Ready";
    this.heightStatus = "waiting";
  }

  private updateLiveFeedback(metrics: PullupMetrics, elbowAngle: number): void {
    if (Date.now() < this.invalidFeedbackUntil) return;

    this.coachingMessage = getPullupFormFeedback(
      metrics,
      this.phase,
      elbowAngle,
      this.rules,
    );
    if (this.coachingMessage && this.phase !== "hanging") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(
    from: PullupPhase,
    to: PullupPhase,
    elbowAngle: number,
  ): void {
    const transition: PullupStateTransition = {
      from,
      to,
      timestamp: Date.now(),
      elbowAngle,
    };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-MAX_TRANSITION_LOG);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: PullupPhase): string {
    switch (phase) {
      case "hanging":
        return "Ready";
      case "pulling":
        return "Pull up";
      case "top":
        return "At the top";
      case "lowering":
        return "Lower slow";
    }
  }

  private buildAnalysis(
    metrics: PullupMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedElbowAngle: number | null = null,
  ): PullupAnalysis {
    return {
      exerciseId: "pull-up",
      exerciseName: "Pull-up",
      trackingQuality,
      phase: this.phase,
      metrics,
      smoothedElbowAngle,
      reps: this.reps,
      invalidReps: this.invalidReps,
      heightStatus: this.heightStatus,
      feedback,
      coachingMessage: this.coachingMessage,
      lastTransition: this.lastTransition,
      transitionLog: [...this.transitionLog],
      lastRepComplete: this.lastRepComplete,
    };
  }
}

export function formatPullupPhase(phase: PullupPhase): string {
  return PULLUP_PHASE_LABELS[phase];
}

export function formatPullupHeightStatus(status: PullupHeightStatus): string {
  return PULLUP_HEIGHT_LABELS[status];
}
