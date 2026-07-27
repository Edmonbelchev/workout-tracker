"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "active" | "error";

export interface UseCameraOptions {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    stop();
    setStatus("requesting");
    setError(null);

    const constraints: MediaStreamConstraints = {
      ...DEFAULT_CONSTRAINTS,
      video: {
        facingMode: options.facingMode ?? "user",
        width: { ideal: options.width ?? 1280 },
        height: { ideal: options.height ?? 720 },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Video element is not mounted.");
      }

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await video.play();
      setStatus("active");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to access the camera.";
      setError(message);
      setStatus("error");
    }
  }, [options.facingMode, options.height, options.width, stop]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, status, error, start, stop };
}
