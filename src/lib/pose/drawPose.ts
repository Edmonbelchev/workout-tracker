import { PoseLandmarker } from "@mediapipe/tasks-vision";

import type { Pose, Point } from "@/lib/pose/types";

const CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS;

const LANDMARK_RADIUS = 5;
const CONNECTION_WIDTH = 3;
const LANDMARK_COLOR = "#22d3ee";
const CONNECTION_COLOR = "#34d399";
const LOW_CONFIDENCE_COLOR = "#64748b";

function getPosePoints(pose: Pose): Point[] {
  return Object.values(pose).filter((point): point is Point => point !== undefined);
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = CONNECTION_COLOR;
  ctx.lineWidth = CONNECTION_WIDTH;
  ctx.lineCap = "round";

  const landmarks = poseLandmarksInOrder(pose);

  for (const connection of CONNECTIONS) {
    const a = landmarks[connection.start];
    const b = landmarks[connection.end];

    if (!a || !b) continue;
    if (a.confidence < 0.5 || b.confidence < 0.5) continue;

    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }
}

/** Returns landmarks indexed 0–32 matching MediaPipe order (sparse where missing). */
function poseLandmarksInOrder(pose: Pose): (Point | undefined)[] {
  return [
    pose.nose,
    undefined, // left eye inner
    pose.leftEye,
    undefined, // left eye outer
    undefined, // right eye inner
    pose.rightEye,
    undefined, // right eye outer
    pose.leftEar,
    pose.rightEar,
    undefined, // mouth left
    undefined, // mouth right
    pose.leftShoulder,
    pose.rightShoulder,
    pose.leftElbow,
    pose.rightElbow,
    pose.leftWrist,
    pose.rightWrist,
    undefined, // left pinky
    undefined, // right pinky
    undefined, // left index
    undefined, // right index
    undefined, // left thumb
    undefined, // right thumb
    pose.leftHip,
    pose.rightHip,
    pose.leftKnee,
    pose.rightKnee,
    pose.leftAnkle,
    pose.rightAnkle,
    pose.leftHeel,
    pose.rightHeel,
    pose.leftFootIndex,
    pose.rightFootIndex,
  ];
}

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  width: number,
  height: number,
): void {
  for (const point of getPosePoints(pose)) {
    ctx.beginPath();
    ctx.fillStyle =
      point.confidence >= 0.5 ? LANDMARK_COLOR : LOW_CONFIDENCE_COLOR;
    ctx.arc(point.x * width, point.y * height, LANDMARK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  pose: Pose | null,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);

  if (!pose) return;

  drawConnections(ctx, pose, width, height);
  drawLandmarks(ctx, pose, width, height);
}

export function drawDebugLandmarks(
  ctx: CanvasRenderingContext2D,
  pose: Pose | null,
  width: number,
  height: number,
): void {
  if (!pose) return;

  ctx.font = "10px monospace";
  ctx.fillStyle = "#fbbf24";

  const labels: [keyof Pose, string][] = [
    ["leftShoulder", "L.Sh"],
    ["rightShoulder", "R.Sh"],
    ["leftHip", "L.Hip"],
    ["rightHip", "R.Hip"],
    ["leftKnee", "L.Kn"],
    ["rightKnee", "R.Kn"],
    ["leftAnkle", "L.An"],
    ["rightAnkle", "R.An"],
  ];

  for (const [key, label] of labels) {
    const point = pose[key];
    if (!point) continue;

    const x = point.x * width;
    const y = point.y * height;
    ctx.fillText(`${label} ${(point.confidence * 100).toFixed(0)}%`, x + 6, y - 6);
  }
}
