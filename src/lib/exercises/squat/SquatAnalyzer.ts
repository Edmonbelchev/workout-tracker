import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createRepAttempt,
  evaluateCompletedRep,
  getDepthStatusDuringRep,
  getFormFeedback,
  updateRepAttempt,
  type RepAttempt,
} from "@/lib/exercises/squat/squatFormFeedback";
import {
  calculateSquatMetrics,
  type SquatMetrics,
} from "@/lib/exercises/squat/squatMetrics";
import {
  DEFAULT_SQUAT_RULES,
  DEPTH_STATUS_LABELS,
  SQUAT_PHASE_LABELS,
  type DepthStatus,
  type SquatPhase,
  type SquatRules,
} from "@/lib/exercises/squat/squatRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface StateTransition {
  from: SquatPhase;
  to: SquatPhase;
  timestamp: number;
  kneeAngle: number | null;
}

export interface RepCompleteEvent {
  repNumber: number;
  valid: boolean;
  deepestKneeAngle: number;
  timestamp: number;
}

export interface SquatAnalysis {
  exerciseId: "squat";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: SquatPhase;
  metrics: SquatMetrics;
  smoothedKneeAngle: number | null;
  reps: number;
  invalidReps: number;
  depthStatus: DepthStatus;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: StateTransition | null;
  transitionLog: StateTransition[];
  lastRepComplete: RepCompleteEvent | null;
}

export const EMPTY_SQUAT_ANALYSIS: SquatAnalysis = {
  exerciseId: "squat",
  exerciseName: "Squat",
  trackingQuality: "poor",
  phase: "standing",
  metrics: {
    cameraView: "unknown",
    leftKneeAngle: null,
    rightKneeAngle: null,
    leftHipAngle: null,
    rightHipAngle: null,
    torsoInclination: null,
    hipAnkleGap: null,
    averageKneeAngle: null,
    flexionAngle: null,
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

export interface SquatAnalyzerOptions {
  rules?: SquatRules;
  onTransition?: (transition: StateTransition) => void;
  onRepComplete?: (event: RepCompleteEvent) => void;
}

/**
 * Stateful squat analyzer: phase detection, rep counting, and depth validation.
 */
export class SquatAnalyzer implements ExerciseAnalyzer<SquatAnalysis> {
  readonly exerciseId = "squat" as const;
  readonly exerciseName = "Squat";

  private phase: SquatPhase = "standing";
  private rules: SquatRules;
  private onTransition?: (transition: StateTransition) => void;
  private onRepComplete?: (event: RepCompleteEvent) => void;
  private kneeAngleSmoother = new ExponentialMovingAverage(0.25);
  private lastTransition: StateTransition | null = null;
  private transitionLog: StateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: RepAttempt | null = null;
  private depthStatus: DepthStatus = "waiting";
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: RepCompleteEvent | null = null;
  private shallowFeedbackUntil = 0;

  constructor(options: SquatAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_SQUAT_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality: TrackingQuality = "poor"): SquatAnalysis {
    const metrics = calculateSquatMetrics(pose);

    if (trackingQuality === "poor" || metrics.flexionAngle === null) {
      this.kneeAngleSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(
        metrics,
        trackingQuality,
        "Move so your full body is visible",
      );
    }

    const smoothedKneeAngle = this.kneeAngleSmoother.update(metrics.flexionAngle);
    this.updatePhase(smoothedKneeAngle, metrics);

    return this.buildAnalysis(metrics, trackingQuality, this.feedback, smoothedKneeAngle);
  }

  reset(): void {
    this.phase = "standing";
    this.kneeAngleSmoother.reset();
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

  private updatePhase(kneeAngle: number, metrics: SquatMetrics): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "standing":
        if (kneeAngle < this.rules.descendingKneeAngleMax) {
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
        if (kneeAngle > this.rules.bottomKneeAngleMin) {
          next = "ascending";
        }
        break;

      case "ascending":
        if (kneeAngle < this.rules.bottomKneeAngleMax) {
          next = "bottom";
        } else if (kneeAngle > this.rules.standingReturnKneeAngleMin) {
          next = "standing";
        }
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, kneeAngle, metrics);
      this.recordTransition(previous, next, kneeAngle);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updateRepAttempt(
        this.repAttempt,
        kneeAngle,
        this.phase,
        this.rules,
      );
      this.depthStatus = getDepthStatusDuringRep(this.repAttempt, this.phase);
      this.updateLiveFeedback(metrics);
    }
  }

  private handleTransition(
    from: SquatPhase,
    to: SquatPhase,
    kneeAngle: number,
    metrics: SquatMetrics,
  ): void {
    if (from === "standing" && to === "descending") {
      this.repAttempt = {
        ...createRepAttempt(),
        startedFromStanding: true,
      };
      this.depthStatus = "waiting";
      this.feedback = "Going down";
      this.coachingMessage = null;
      return;
    }

    if (from === "descending" && to === "standing") {
      this.repAttempt = null;
      this.depthStatus = "waiting";
      this.feedback = "Ready";
      this.coachingMessage = null;
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updateRepAttempt(this.repAttempt, kneeAngle, to, this.rules);
    }

    if (from === "ascending" && to === "standing" && this.repAttempt) {
      this.completeRep(this.repAttempt);
      this.repAttempt = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.updateLiveFeedback(metrics);
    if (this.repAttempt) {
      this.depthStatus = getDepthStatusDuringRep(this.repAttempt, to);
    }
  }

  private completeRep(attempt: RepAttempt): void {
    const result = evaluateCompletedRep(attempt, this.rules);

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
        deepestKneeAngle: attempt.deepestKneeAngle,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.feedback = "Ready";
    this.depthStatus = "waiting";
  }

  private updateLiveFeedback(metrics: SquatMetrics): void {
    if (Date.now() < this.shallowFeedbackUntil) {
      this.coachingMessage = "Go slightly deeper";
      return;
    }

    this.coachingMessage = getFormFeedback(
      metrics,
      this.phase,
      this.rules,
      this.repAttempt,
    );

    if (this.coachingMessage && this.phase !== "standing") {
      this.feedback = this.coachingMessage;
    }
  }

  private recordTransition(from: SquatPhase, to: SquatPhase, kneeAngle: number): void {
    const transition: StateTransition = {
      from,
      to,
      timestamp: Date.now(),
      kneeAngle,
    };

    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-MAX_TRANSITION_LOG);
    this.onTransition?.(transition);

    if (from === "ascending" && to === "standing" && this.lastRepComplete) {
      const label = this.lastRepComplete.valid ? "REP COMPLETE" : "REP INVALID";
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Squat] ${label} — total: ${this.reps}, deepest: ${this.lastRepComplete.deepestKneeAngle.toFixed(1)}°`,
        );
      }
    }
  }

  private feedbackForPhase(phase: SquatPhase): string {
    switch (phase) {
      case "standing":
        return "Ready";
      case "descending":
        return "Going down";
      case "bottom":
        return "Hold depth";
      case "ascending":
        return "Drive up";
    }
  }

  private buildAnalysis(
    metrics: SquatMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
    smoothedKneeAngle: number | null = null,
  ): SquatAnalysis {
    return {
      exerciseId: "squat",
      exerciseName: "Squat",
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

export function formatSquatPhase(phase: SquatPhase): string {
  return SQUAT_PHASE_LABELS[phase];
}

export function formatDepthStatus(status: DepthStatus): string {
  return DEPTH_STATUS_LABELS[status];
}
