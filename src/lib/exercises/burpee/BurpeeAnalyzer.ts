import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  createBurpeeRepAttempt,
  evaluateBurpeeRep,
  getBurpeeFormFeedback,
  updateBurpeeRepAttempt,
  type BurpeeRepAttempt,
} from "@/lib/exercises/burpee/burpeeFormFeedback";
import {
  assessBurpeeTrackingQuality,
  calculateBurpeeMetrics,
  EMPTY_BURPEE_METRICS,
  type BurpeeMetrics,
} from "@/lib/exercises/burpee/burpeeMetrics";
import {
  BURPEE_PHASE_LABELS,
  DEFAULT_BURPEE_RULES,
  type BurpeePhase,
  type BurpeeRules,
} from "@/lib/exercises/burpee/burpeeRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface BurpeeStateTransition {
  from: BurpeePhase;
  to: BurpeePhase;
  timestamp: number;
}

export interface BurpeeRepCompleteEvent {
  repNumber: number;
  valid: boolean;
  timestamp: number;
}

export interface BurpeeAnalysis {
  exerciseId: "burpee";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: BurpeePhase;
  metrics: BurpeeMetrics;
  reps: number;
  invalidReps: number;
  feedback: string;
  coachingMessage: string | null;
  lastTransition: BurpeeStateTransition | null;
  transitionLog: BurpeeStateTransition[];
  lastRepComplete: BurpeeRepCompleteEvent | null;
}

export interface BurpeeAnalyzerOptions {
  rules?: BurpeeRules;
  onTransition?: (transition: BurpeeStateTransition) => void;
  onRepComplete?: (event: BurpeeRepCompleteEvent) => void;
}

export class BurpeeAnalyzer implements ExerciseAnalyzer<BurpeeAnalysis> {
  readonly exerciseId = "burpee" as const;
  readonly exerciseName = "Burpee";

  private phase: BurpeePhase = "standing";
  private rules: BurpeeRules;
  private onTransition?: (transition: BurpeeStateTransition) => void;
  private onRepComplete?: (event: BurpeeRepCompleteEvent) => void;
  private previousHipMidY: number | null = null;
  private lastTransition: BurpeeStateTransition | null = null;
  private transitionLog: BurpeeStateTransition[] = [];

  private reps = 0;
  private invalidReps = 0;
  private repAttempt: BurpeeRepAttempt | null = null;
  private feedback = "Ready";
  private coachingMessage: string | null = null;
  private lastRepComplete: BurpeeRepCompleteEvent | null = null;
  private kneeSmoother = new ExponentialMovingAverage(0.25);
  private elbowSmoother = new ExponentialMovingAverage(0.25);

  constructor(options: BurpeeAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_BURPEE_RULES;
    this.onTransition = options.onTransition;
    this.onRepComplete = options.onRepComplete;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): BurpeeAnalysis {
    const metrics = calculateBurpeeMetrics(pose, this.previousHipMidY);
    const quality = trackingQuality ?? assessBurpeeTrackingQuality(pose);

    if (pose?.leftHip && pose?.rightHip) {
      this.previousHipMidY = (pose.leftHip.y + pose.rightHip.y) / 2;
    }

    if (quality === "poor" || metrics.kneeFlexion === null) {
      this.kneeSmoother.reset();
      this.elbowSmoother.reset();
      this.coachingMessage = null;
      return this.buildAnalysis(metrics, quality, "Show your full body in frame");
    }

    const knee = this.kneeSmoother.update(metrics.kneeFlexion);
    const elbow =
      metrics.elbowFlexion !== null
        ? this.elbowSmoother.update(metrics.elbowFlexion)
        : null;

    this.updatePhase(knee, elbow, metrics);
    return this.buildAnalysis(metrics, quality, this.feedback);
  }

  reset(): void {
    this.phase = "standing";
    this.previousHipMidY = null;
    this.kneeSmoother.reset();
    this.elbowSmoother.reset();
    this.lastTransition = null;
    this.transitionLog = [];
    this.reps = 0;
    this.invalidReps = 0;
    this.repAttempt = null;
    this.feedback = "Ready";
    this.coachingMessage = null;
    this.lastRepComplete = null;
  }

  private updatePhase(
    knee: number,
    elbow: number | null,
    metrics: BurpeeMetrics,
  ): void {
    const previous = this.phase;
    let next = this.phase;

    switch (this.phase) {
      case "standing":
        if (knee < this.rules.squatKneeAngleMax) next = "squat";
        break;
      case "squat":
        if (knee > this.rules.standingKneeAngleMin) next = "standing";
        else if (metrics.handsDown && (elbow === null || elbow > this.rules.plankElbowAngleMin)) {
          next = "plank";
        }
        break;
      case "plank":
        if (elbow !== null && elbow < this.rules.pushDownElbowAngleMax) next = "chest_down";
        else if (knee > this.rules.standingKneeAngleMin && !metrics.handsDown) next = "standing";
        break;
      case "chest_down":
        if (elbow !== null && elbow > this.rules.pushUpElbowAngleMin) next = "chest_up";
        break;
      case "chest_up":
        if (metrics.handsDown && elbow !== null && elbow > this.rules.plankElbowAngleMin) {
          next = "plank";
        } else if (knee < this.rules.squatKneeAngleMax) {
          next = "squat";
        } else if (this.detectJump(knee, metrics)) {
          next = "jump";
        } else if (knee > this.rules.standingKneeAngleMin) {
          next = "standing";
        }
        break;
      case "jump":
        if (knee > this.rules.standingKneeAngleMin) next = "standing";
        break;
    }

    if (next !== previous) {
      this.handleTransition(previous, next, metrics, elbow);
      this.recordTransition(previous, next);
      this.phase = next;
    } else if (this.repAttempt) {
      this.repAttempt = updateBurpeeRepAttempt(this.repAttempt, this.phase, elbow);
      this.coachingMessage = getBurpeeFormFeedback(this.phase, metrics);
      if (this.coachingMessage) this.feedback = this.coachingMessage;
    }
  }

  private detectJump(knee: number, metrics: BurpeeMetrics): boolean {
    if (knee < this.rules.jumpKneeAngleMin) return false;
    if (metrics.hipDeltaY === null) return false;
    return metrics.hipDeltaY <= this.rules.flightHipDeltaThreshold;
  }

  private handleTransition(
    from: BurpeePhase,
    to: BurpeePhase,
    metrics: BurpeeMetrics,
    elbow: number | null,
  ): void {
    if (from === "standing" && to === "squat") {
      this.repAttempt = createBurpeeRepAttempt();
      this.feedback = "Squat down";
      this.coachingMessage = null;
      return;
    }

    if (from === "squat" && to === "standing") {
      this.repAttempt = null;
      this.feedback = "Ready";
      return;
    }

    if (this.repAttempt) {
      this.repAttempt = updateBurpeeRepAttempt(this.repAttempt, to, elbow);
    }

    if ((from === "jump" && to === "standing") || (from === "chest_up" && to === "standing")) {
      if (this.repAttempt) this.completeRep(this.repAttempt);
      this.repAttempt = null;
      return;
    }

    this.feedback = this.feedbackForPhase(to);
    this.coachingMessage = getBurpeeFormFeedback(to, metrics);
  }

  private completeRep(attempt: BurpeeRepAttempt): void {
    const result = evaluateBurpeeRep(attempt);

    if (result.valid) {
      this.reps += 1;
      this.feedback = "Good rep";
      this.lastRepComplete = {
        repNumber: this.reps,
        valid: true,
        timestamp: Date.now(),
      };
      this.onRepComplete?.(this.lastRepComplete);
      return;
    }

    this.invalidReps += 1;
    this.feedback = result.feedback;
    this.lastRepComplete = {
      repNumber: this.reps,
      valid: false,
      timestamp: Date.now(),
    };
    this.onRepComplete?.(this.lastRepComplete);
  }

  private recordTransition(from: BurpeePhase, to: BurpeePhase): void {
    const transition: BurpeeStateTransition = { from, to, timestamp: Date.now() };
    this.lastTransition = transition;
    this.transitionLog = [...this.transitionLog, transition].slice(-12);
    this.onTransition?.(transition);
  }

  private feedbackForPhase(phase: BurpeePhase): string {
    switch (phase) {
      case "standing":
        return "Ready";
      case "squat":
        return "Squat down";
      case "plank":
        return "Plank";
      case "chest_down":
        return "Chest down";
      case "chest_up":
        return "Press up";
      case "jump":
        return "Jump!";
    }
  }

  private buildAnalysis(
    metrics: BurpeeMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
  ): BurpeeAnalysis {
    return {
      exerciseId: "burpee",
      exerciseName: "Burpee",
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

export function formatBurpeePhase(phase: BurpeePhase): string {
  return BURPEE_PHASE_LABELS[phase];
}

export { EMPTY_BURPEE_METRICS };
