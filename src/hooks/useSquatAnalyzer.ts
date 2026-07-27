"use client";

import { useEffect, useRef, useState } from "react";

import {
  EMPTY_SQUAT_ANALYSIS,
  SquatAnalyzer,
  type SquatAnalysis,
  type StateTransition,
} from "@/lib/exercises/squat/SquatAnalyzer";
import { assessTrackingQuality } from "@/lib/pose/normalizePose";
import type { Pose } from "@/lib/pose/types";

const UI_UPDATE_INTERVAL_MS = 100;

export interface UseSquatAnalyzerOptions {
  enabled: boolean;
  poseRef: React.RefObject<Pose | null>;
  debug?: boolean;
}

export function useSquatAnalyzer({
  enabled,
  poseRef,
  debug = false,
}: UseSquatAnalyzerOptions): SquatAnalysis {
  const analyzerRef = useRef<SquatAnalyzer | null>(null);
  const debugRef = useRef(debug);
  const [analysis, setAnalysis] = useState<SquatAnalysis>(EMPTY_SQUAT_ANALYSIS);

  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);

  useEffect(() => {
    analyzerRef.current = new SquatAnalyzer({
      onTransition: (transition: StateTransition) => {
        if (debugRef.current) {
          console.log(
            `[Squat] ${transition.from.toUpperCase()} → ${transition.to.toUpperCase()} (knee: ${transition.kneeAngle?.toFixed(1)}°)`,
          );
        }
      },
    });

    return () => {
      analyzerRef.current?.reset();
      analyzerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let lastUpdate = 0;
    let rafId: number;

    const tick = (now: number) => {
      if (now - lastUpdate >= UI_UPDATE_INTERVAL_MS) {
        const pose = poseRef.current;
        const trackingQuality = assessTrackingQuality(pose);
        const result = analyzerRef.current!.analyze(pose, trackingQuality);
        setAnalysis(result);
        lastUpdate = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      analyzerRef.current?.reset();
    };
  }, [enabled, poseRef]);

  if (!enabled) {
    return EMPTY_SQUAT_ANALYSIS;
  }

  return analysis;
}
