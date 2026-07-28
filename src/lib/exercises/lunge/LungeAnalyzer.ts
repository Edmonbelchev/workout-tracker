import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createLungeRepAttempt,
  evaluateLungeRep,
  getLungeDepthStatus,
  getLungeFormFeedback,
  legLabel,
  updateLungeRepAttempt,
  type LungeRepAttempt,
} from "@/lib/exercises/lunge/lungeFormFeedback";
import {
  assessLungeTrackingQuality,
  calculateLungeMetrics,
  EMPTY_LUNGE_METRICS,
  type LungeMetrics,
} from "@/lib/exercises/lunge/lungeMetrics";
import {
  DEFAULT_LUNGE_RULES,
  LUNGE_DEPTH_LABELS,
  LUNGE_PHASE_LABELS,
  type LungeDepthStatus,
  type LungeLeg,
  type LungePhase,
  type LungeRules,
} from "@/lib/exercises/lunge/lungeRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface LungeStateTransition {
  from: LungePhase;
  to: LungePhase;
  timestamp: number;
  kneeAngle: number | null;
}

export interface LungeRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  leg: LungeLeg;
  deepestKneeAngle: number;
  timestamp: number;
}

export interface LungeAnalysis {
  exerciseId: "lunge";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: LungePhase;
  activeLeg: LungeLeg | null;
  metrics: LungeMetrics;
  smoothedKneeAngle: number | null;
  reps: number;
  invalidReps: number;
  depthStatus: LungeDepthStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: LungeStateTransition | null;
  transitionLog: LungeStateTransition[];
  lastRepComplete: LungeRepCompleteEvent | null;
}

const MAX_TRANSITION_LOG = 12;

export interface LungeAnalyzerOptions {
  rules?: LungeRules;
  onTransition?: (transition: LungeStateTransition) => void;
  onRepComplete?: (event: LungeRepCompleteEvent) => void;
}

export class LungeAnalyzer implements ExerciseAnalyzer<LungeAnalysis> {
  readonly exerciseId = "lunge" as const;
  readonly exerciseName = "Lunge";

  private phase: LungePhase = "standing";
  private lockedLeg: LungeLeg | null = null;
  private rules: LungeRules;
  private onTransition?: (transition: LungeStateTransition) => void;
  private onRepComplete?: (event: LungeRepCompleteEvent) => void;
  private kneeSmoother = new ExponentialMovingAverage(0.25);
  private lastTransition: LungeStateTransition | null = null;
  private transitionLog: LungeStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: LungeRepAttempt | null = null;
  private depthStatus: LungeDepthStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: LungeRepCompleteEvent | null = null;
  private shallowFeedbackUntil = 0;

  constructor(options: LungeAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_LUNGE_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): LungeAnalysis {
    const metrics = calculateLungeMetrics(pose, this.lockedLeg);
    const quality = trackingQuality ?? assessLungeTrackingQuality(pose);

    if (quality === "poor" || metrics.flexionAngle === null) {
      this.kneeSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(metrics, quality, "Show your full legs in frame");
    }

    const smoothed = this.kneeSmoother.update(metrics.flexionAngle);
    this.updatePhase(smoothed, metrics);

    return this.buildAnalysis(metrics, quality, this.feedback, smoothed);
  }

  reset(): void {
    this.phase = "standing";
    this.lockedLeg = null;
    this.kneeSmoother.reset();
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

  private updatePhase(kneeAngle: number, metrics: LungeMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "standing":
        if (
          metrics.activeLeg &&
          kneeAngle < this.rules.descendingKneeAngleMax &&
          (metrics.rearKneeAngle === null ||
            metrics.rearKneeAngle >= this.rules.rearKneeAngleMin - 10)
        ) {
          this.lockedLeg = metrics.activeLeg;
          next = "descending";
        }
        break;
      case "descending":
        if (kneeAngle > this.rules.standingKneeAngleMin) {
          next = "standing";
        } else if (kneeAngle < this.rules.bottomKneeAngleMax) {
          next = "bottom";
        }
        break;
      case "bottom":
        if (kneeAngle > this.rules.bottomKneeAngleMin) next = "ascending";
        break;
      case "ascending":
        if (kneeAngle < this.rules.bottomKneeAngleMax) next = "bottom";
        else if (kneeAngle > this.rules.standingReturnKneeAngleMin) next = "standing";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, kneeAngle, metrics);
      this.recordTransition(previous, next, kneeAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updateLungeRepAttempt(this.repAttempt, kneeAngle, this.phase, this.rules);
      this.depthStatus = getLungeDepthStatus(this.repAttempt, this.phase);
      this.updateLiveFeedback(metrics);
    }
  }

  private handleTransition(
    from: LungePhase,
    to: LungePhase,
    kneeAngle: number,
    metrics: LungeMetrics,
  ): void {
    if (from === "standing" && to === "descending" && this.lockedLeg) {
      this.repAttempt = {
        ...createLungeRepAttempt(this.lockedLeg),
        startedFromStanding: true,
      };
      this.depthStatus = "waiting";
      this.feedback = `${legLabel(this.lockedLeg)} lunge`;
      this.coachingMessage = null;
      return;
    }

    if (from === "descending" && to === "standing") {
      this.repAttempt = null;
      this.lockedLeg = null;
      this.depthStatus = "waiting";
      this.feedback = "Ready";
      this.coachingMessage = null;
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updateLungeRepAttempt(this.repAttempt, kneeAngle, to, this.rules);
    }

    if (from === "ascending" && to === "standing" && this.repAttempt) {
      this.completeRep(this.repAttempt);
      this.repAttempt = null;
      this.lockedLeg = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to, metrics.activeLeg ?? this.lockedLeg);
    this.updateLiveFeedback(metrics);
    if (this.repAttempt) {
      this.depthStatus = getLungeDepthStatus(this.repAttempt, to);
    }
  }

  private completeRep(attempt: LungeRepAttempt): void {
    const result = evaluateLungeRep(attempt, this.rules);

    if (result.valid) {
      this.reps += 1;
      this.feedback = "Good rep";
      this.depthStatus = "good";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        leg: attempt.leg,
        deepestKneeAngle: attempt.deepestKneeAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    if (
      attempt.sawDescending &&
      attempt.deepestKneeAngle <= this.rules.minimumDescentKneeAngleMax
    ) {
      this.invalidReps += 1;
      this.feedback = "Go slightly deeper";
      this.depthStatus = "too_shallow";
      this.shallowFeedbackUntil = Date.now() + 2500;
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: false,
        leg: attempt.leg,
        deepestKneeAngle: attempt.deepestKneeAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.feedback = "Ready";
    this.depthStatus = "waiting";
  }

  private updateLiveFeedback(metrics: LungeMetrics): void {
    if (Date.now() < this.shallowFeedbackUntil) {
      this.coachingMessage = "Go slightly deeper";
      return;
    }

    this.coachingMessage = getLungeFormFeedback(
      metrics,
      this.phase,
      this.rules,
      this.repAttempt,
    );

    if (this.coachingMessage && this.phase !== "standing") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(from: LungePhase, to: LungePhase, kneeAngle: number): void {
    const transition: LungeStateTransition = {
      from,
      to,
      timestamp: Date.now(),
      kneeAngle,
    };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-MAX_TRANSITION_LOG);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: LungePhase, leg: LungeLeg | null): string {
    const prefix = leg ? `${legLabel(leg)} — ` : "";
    switch (phase) {
      case "standing":
        return "Ready";
      case "descending":
        return `${prefix}Going down`;
      case "bottom":
        return `${prefix}Hold depth`;
      case "ascending":
        return `${prefix}Drive up`;
    }
  }

  private buildAnalysis(
    metrics: LungeMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedKneeAngle: number | null = null,
  ): LungeAnalysis {
    return {
      exerciseId: "lunge",
      exerciseName: "Lunge",
      trackingQuality,
      phase: this.phase,
      activeLeg: this.lockedLeg ?? metrics.activeLeg,
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

export function formatLungePhase(phase: LungePhase): string {
  return LUNGE_PHASE_LABELS[phase];
}

export function formatLungeDepthStatus(status: LungeDepthStatus): string {
  return LUNGE_DEPTH_LABELS[status];
}

export { EMPTY_LUNGE_METRICS };
