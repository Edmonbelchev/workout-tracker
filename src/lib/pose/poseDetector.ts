import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

import { assessTrackingQuality, normalizeMediaPipeLandmarks } from "./normalizePose";
import type { PoseDetectionResult } from "./types";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface PoseDetector {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => PoseDetectionResult;
  close: () => void;
}

/**
 * Initializes MediaPipe Pose Landmarker in VIDEO mode for webcam frames.
 *
 * VIDEO mode uses detectForVideo() with monotonically increasing timestamps.
 * This is the current web API for continuous camera input (LIVE_STREAM is not
 * exposed in the JS package — VIDEO + detectForVideo is equivalent).
 */
export async function createPoseDetector(): Promise<PoseDetector> {
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return {
    detectForVideo(video: HTMLVideoElement, timestampMs: number): PoseDetectionResult {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return { pose: null, trackingQuality: "poor", timestamp: timestampMs };
      }

      let result: PoseLandmarkerResult;
      try {
        result = landmarker.detectForVideo(video, timestampMs);
      } catch {
        return { pose: null, trackingQuality: "poor", timestamp: timestampMs };
      }

      const rawLandmarks = result.landmarks[0];
      if (!rawLandmarks) {
        return { pose: null, trackingQuality: "poor", timestamp: timestampMs };
      }

      const pose = normalizeMediaPipeLandmarks(rawLandmarks);
      const trackingQuality = assessTrackingQuality(pose);

      return { pose, trackingQuality, timestamp: timestampMs };
    },

    close() {
      landmarker.close();
    },
  };
}

/** Skeleton connections exported by MediaPipe — used for overlay drawing. */
export { PoseLandmarker };
