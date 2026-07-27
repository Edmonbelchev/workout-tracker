/**
 * Exponential moving average for noisy numeric signals (angles, etc.).
 *
 * Why EMA over a simple moving average:
 * - Constant memory (no buffer of past frames)
 * - Low lag with alpha ~0.25–0.35 for interactive pose data
 * - Easy to reset when tracking is lost
 *
 * alpha = 0.3 means ~30% new sample, ~70% history — responsive but stable.
 */
export class ExponentialMovingAverage {
  private value: number | null = null;

  constructor(private readonly alpha: number = 0.3) {}

  update(sample: number): number {
    if (this.value === null) {
      this.value = sample;
      return sample;
    }

    this.value = this.alpha * sample + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

export function smoothNullable(
  smoother: ExponentialMovingAverage,
  sample: number | null,
): number | null {
  if (sample === null) {
    smoother.reset();
    return null;
  }

  return smoother.update(sample);
}
