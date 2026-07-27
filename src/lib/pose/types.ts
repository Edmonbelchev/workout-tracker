/**
 * Internal pose representation — decoupled from MediaPipe.
 * Coordinates are normalized 0–1 relative to the video frame (x = width, y = height).
 */

export interface Point {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface Pose {
  nose?: Point;
  leftEye?: Point;
  rightEye?: Point;
  leftEar?: Point;
  rightEar?: Point;
  leftShoulder?: Point;
  rightShoulder?: Point;
  leftElbow?: Point;
  rightElbow?: Point;
  leftWrist?: Point;
  rightWrist?: Point;
  leftHip?: Point;
  rightHip?: Point;
  leftKnee?: Point;
  rightKnee?: Point;
  leftAnkle?: Point;
  rightAnkle?: Point;
  leftHeel?: Point;
  rightHeel?: Point;
  leftFootIndex?: Point;
  rightFootIndex?: Point;
}

export type TrackingQuality = "good" | "poor";

/** Landmarks required for full-body squat tracking (used in later phases). */
export const REQUIRED_LANDMARK_KEYS: (keyof Pose)[] = [
  "leftShoulder",
  "rightShoulder",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
];

export const MIN_LANDMARK_CONFIDENCE = 0.5;

export interface PoseDetectionResult {
  pose: Pose | null;
  trackingQuality: TrackingQuality;
  timestamp: number;
}
