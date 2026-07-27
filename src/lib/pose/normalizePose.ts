import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import { PoseLandmarkIndex } from "./landmarkIndices";
import {
  MIN_LANDMARK_CONFIDENCE,
  REQUIRED_LANDMARK_KEYS,
  type Point,
  type Pose,
  type TrackingQuality,
} from "./types";

function toPoint(landmark: NormalizedLandmark | undefined): Point | undefined {
  if (!landmark) return undefined;

  const confidence = landmark.visibility ?? 0;
  if (confidence < MIN_LANDMARK_CONFIDENCE) return undefined;

  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    confidence,
  };
}

function pick(
  landmarks: NormalizedLandmark[],
  index: number,
): Point | undefined {
  return toPoint(landmarks[index]);
}

/**
 * Converts MediaPipe normalized landmarks into our internal Pose shape.
 */
export function normalizeMediaPipeLandmarks(
  landmarks: NormalizedLandmark[],
): Pose {
  return {
    nose: pick(landmarks, PoseLandmarkIndex.NOSE),
    leftEye: pick(landmarks, PoseLandmarkIndex.LEFT_EYE),
    rightEye: pick(landmarks, PoseLandmarkIndex.RIGHT_EYE),
    leftEar: pick(landmarks, PoseLandmarkIndex.LEFT_EAR),
    rightEar: pick(landmarks, PoseLandmarkIndex.RIGHT_EAR),
    leftShoulder: pick(landmarks, PoseLandmarkIndex.LEFT_SHOULDER),
    rightShoulder: pick(landmarks, PoseLandmarkIndex.RIGHT_SHOULDER),
    leftElbow: pick(landmarks, PoseLandmarkIndex.LEFT_ELBOW),
    rightElbow: pick(landmarks, PoseLandmarkIndex.RIGHT_ELBOW),
    leftWrist: pick(landmarks, PoseLandmarkIndex.LEFT_WRIST),
    rightWrist: pick(landmarks, PoseLandmarkIndex.RIGHT_WRIST),
    leftHip: pick(landmarks, PoseLandmarkIndex.LEFT_HIP),
    rightHip: pick(landmarks, PoseLandmarkIndex.RIGHT_HIP),
    leftKnee: pick(landmarks, PoseLandmarkIndex.LEFT_KNEE),
    rightKnee: pick(landmarks, PoseLandmarkIndex.RIGHT_KNEE),
    leftAnkle: pick(landmarks, PoseLandmarkIndex.LEFT_ANKLE),
    rightAnkle: pick(landmarks, PoseLandmarkIndex.RIGHT_ANKLE),
    leftHeel: pick(landmarks, PoseLandmarkIndex.LEFT_HEEL),
    rightHeel: pick(landmarks, PoseLandmarkIndex.RIGHT_HEEL),
    leftFootIndex: pick(landmarks, PoseLandmarkIndex.LEFT_FOOT_INDEX),
    rightFootIndex: pick(landmarks, PoseLandmarkIndex.RIGHT_FOOT_INDEX),
  };
}

export function assessTrackingQuality(pose: Pose | null): TrackingQuality {
  if (!pose) return "poor";

  const visibleRequired = REQUIRED_LANDMARK_KEYS.filter(
    (key) => pose[key] !== undefined,
  ).length;

  return visibleRequired >= REQUIRED_LANDMARK_KEYS.length - 1 ? "good" : "poor";
}
