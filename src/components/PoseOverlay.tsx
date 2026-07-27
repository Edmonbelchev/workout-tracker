"use client";

import { useEffect, useRef } from "react";

import { drawDebugLandmarks, drawPoseOverlay } from "@/lib/pose/drawPose";
import type { Pose } from "@/lib/pose/types";

interface PoseOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  poseRef: React.RefObject<Pose | null>;
  debug?: boolean;
}

/**
 * Canvas overlay aligned to the video element.
 *
 * Coordinate alignment strategy:
 * - Canvas internal resolution matches video.videoWidth × video.videoHeight
 * - CSS sizes canvas identically to the video (both fill the same container)
 * - Landmarks use normalized 0–1 coords → multiply by canvas pixel dimensions
 *
 * The parent container applies scaleX(-1) for mirror mode so both video and
 * skeleton appear as a natural mirror without transforming coordinates.
 */
export function PoseOverlay({ videoRef, poseRef, debug = false }: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const syncCanvasSize = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    const video = videoRef.current;
    video?.addEventListener("loadedmetadata", syncCanvasSize);
    window.addEventListener("resize", syncCanvasSize);

    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawPoseOverlay(ctx, poseRef.current, canvas.width, canvas.height);
          if (debug) {
            drawDebugLandmarks(ctx, poseRef.current, canvas.width, canvas.height);
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      video?.removeEventListener("loadedmetadata", syncCanvasSize);
      window.removeEventListener("resize", syncCanvasSize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [debug, poseRef, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      aria-hidden
    />
  );
}
