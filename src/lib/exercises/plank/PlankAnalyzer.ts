import type { ExerciseAnalyzer } from "@/lib/exercises/types";
import {
  getPlankFormFeedback,
  isPlankPosition,
} from "@/lib/exercises/plank/plankFormFeedback";
import {
  assessPlankTrackingQuality,
  calculatePlankMetrics,
  EMPTY_PLANK_METRICS,
  type PlankMetrics,
} from "@/lib/exercises/plank/plankMetrics";
import {
  DEFAULT_PLANK_RULES,
  PLANK_FORM_LABELS,
  PLANK_PHASE_LABELS,
  type PlankFormStatus,
  type PlankPhase,
  type PlankRules,
} from "@/lib/exercises/plank/plankRules";
import { ExponentialMovingAverage } from "@/lib/geometry/smoothing";
import type { Pose, TrackingQuality } from "@/lib/pose/types";

export interface PlankAnalysis {
  exerciseId: "plank";
  exerciseName: string;
  trackingQuality: TrackingQuality;
  phase: PlankPhase;
  metrics: PlankMetrics;
  /** Current hold duration in seconds. */
  holdSeconds: number;
  bestHoldSeconds: number;
  formStatus: PlankFormStatus;
  feedback: string;
  coachingMessage: string | null;
}

export interface PlankAnalyzerOptions {
  rules?: PlankRules;
}

export class PlankAnalyzer implements ExerciseAnalyzer<PlankAnalysis> {
  readonly exerciseId = "plank" as const;
  readonly exerciseName = "Plank";

  private phase: PlankPhase = "idle";
  private rules: PlankRules;
  private bodyLineSmoother = new ExponentialMovingAverage(0.2);
  private holdStartMs: number | null = null;
  private bestHoldSeconds = 0;
  private lastMilestone = 0;
  private formStatus: PlankFormStatus = "waiting";
  private feedback = "Get into plank position";
  private coachingMessage: string | null = null;

  constructor(options: PlankAnalyzerOptions = {}) {
    this.rules = options.rules ?? DEFAULT_PLANK_RULES;
  }

  analyze(pose: Pose | null, trackingQuality?: TrackingQuality): PlankAnalysis {
    const metrics = calculatePlankMetrics(pose);
    const quality = trackingQuality ?? assessPlankTrackingQuality(pose);

    if (quality === "poor" || metrics.bodyLineAngle === null) {
      this.bodyLineSmoother.reset();
      this.endHold(false);
      this.coachingMessage = null;
      return this.buildAnalysis(metrics, quality, "Show shoulders, arms, and hips");
    }

    const smoothedBodyLine = this.bodyLineSmoother.update(metrics.bodyLineAngle);
    const inPlank = isPlankPosition(
      { ...metrics, bodyLineAngle: smoothedBodyLine },
      this.rules,
    );

    this.updatePhase(inPlank, { ...metrics, bodyLineAngle: smoothedBodyLine });
    return this.buildAnalysis({ ...metrics, bodyLineAngle: smoothedBodyLine }, quality, this.feedback);
  }

  reset(): void {
    this.phase = "idle";
    this.bodyLineSmoother.reset();
    this.holdStartMs = null;
    this.bestHoldSeconds = 0;
    this.lastMilestone = 0;
    this.formStatus = "waiting";
    this.feedback = "Get into plank position";
    this.coachingMessage = null;
  }

  private updatePhase(inPlank: boolean, metrics: PlankMetrics): void {
    const now = Date.now();

    if (this.phase === "idle" || this.phase === "rest") {
      if (inPlank) {
        this.phase = "holding";
        this.holdStartMs = now;
        this.formStatus = "good";
        this.feedback = "Hold steady";
        this.coachingMessage = null;
      } else {
        this.feedback = this.phase === "rest" ? "Ready" : "Get into plank position";
      }
      return;
    }

    if (this.phase === "holding") {
      if (!inPlank) {
        this.endHold(true);
        return;
      }

      const holdSeconds = this.getHoldSeconds(now);
      this.feedback = `Hold steady — ${holdSeconds}s`;

      if (
        metrics.bodyLineAngle !== null &&
        metrics.bodyLineAngle < this.rules.minHoldBodyLineAngle
      ) {
        this.formStatus = "sagging";
      } else {
        this.formStatus = "good";
      }

      this.coachingMessage = getPlankFormFeedback(metrics, this.phase, this.rules);
      if (this.coachingMessage) {
        this.feedback = this.coachingMessage;
      }

      if (
        holdSeconds > 0 &&
        holdSeconds % this.rules.milestoneIntervalSec === 0 &&
        holdSeconds !== this.lastMilestone
      ) {
        this.lastMilestone = holdSeconds;
        this.coachingMessage = `${holdSeconds} seconds`;
      }
    }
  }

  private endHold(completed: boolean): void {
    if (this.holdStartMs !== null && completed) {
      const seconds = this.getHoldSeconds(Date.now());
      this.bestHoldSeconds = Math.max(this.bestHoldSeconds, seconds);
    }

    this.holdStartMs = null;
    this.phase = completed ? "rest" : "idle";
    this.formStatus = "waiting";
    this.lastMilestone = 0;
    this.feedback = completed ? `Rest — best ${this.bestHoldSeconds}s` : "Get into plank position";
    this.coachingMessage = null;
  }

  private getHoldSeconds(now: number): number {
    if (this.holdStartMs === null) return 0;
    return Math.floor((now - this.holdStartMs) / 1000);
  }

  private buildAnalysis(
    metrics: PlankMetrics,
    trackingQuality: TrackingQuality,
    feedback: string,
  ): PlankAnalysis {
    const holdSeconds = this.getHoldSeconds(Date.now());

    return {
      exerciseId: "plank",
      exerciseName: "Plank",
      trackingQuality,
      phase: this.phase,
      metrics,
      holdSeconds,
      bestHoldSeconds: this.bestHoldSeconds,
      formStatus: this.formStatus,
      feedback,
      coachingMessage: this.coachingMessage,
    };
  }
}

export function formatPlankPhase(phase: PlankPhase): string {
  return PLANK_PHASE_LABELS[phase];
}

export function formatPlankFormStatus(status: PlankFormStatus): string {
  return PLANK_FORM_LABELS[status];
}

export { EMPTY_PLANK_METRICS };
