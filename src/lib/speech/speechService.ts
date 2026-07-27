const ONES = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty"];

export function repCountToSpeech(count: number): string {
  if (count <= 0) return "Zero";
  if (count < 20) return ONES[count] ?? String(count);

  const tens = Math.floor(count / 10);
  const ones = count % 10;
  const tensWord = TENS[tens] ?? String(tens * 10);

  return ones === 0 ? tensWord : `${tensWord} ${ONES[ones].toLowerCase()}`;
}

export type SpeechPriority = "rep" | "coaching";

export interface SpeechOptions {
  priority?: SpeechPriority;
}

const COACHING_COOLDOWN_MS = 5000;

/**
 * Browser SpeechSynthesis wrapper with coaching cooldown and rep priority.
 */
export class SpeechService {
  private lastCoachingMessage: string | null = null;
  private lastCoachingTime = 0;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }

  speak(text: string, options: SpeechOptions = {}): void {
    if (!this.enabled || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const priority = options.priority ?? "coaching";

    if (priority === "coaching" && !this.canSpeakCoaching(text)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = priority === "rep" ? 1.05 : 0.95;
    utterance.pitch = 1;

    if (priority === "coaching") {
      this.lastCoachingMessage = text;
      this.lastCoachingTime = Date.now();
    }

    window.speechSynthesis.speak(utterance);
  }

  speakRepCount(count: number): void {
    this.speak(repCountToSpeech(count), { priority: "rep" });
  }

  canSpeakCoaching(message: string): boolean {
    const now = Date.now();
    if (
      this.lastCoachingMessage === message &&
      now - this.lastCoachingTime < COACHING_COOLDOWN_MS
    ) {
      return false;
    }
    return true;
  }

  resetCooldowns(): void {
    this.lastCoachingMessage = null;
    this.lastCoachingTime = 0;
  }
}

export const speechService = new SpeechService();
