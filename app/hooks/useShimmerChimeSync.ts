'use client';

import { useRef, useCallback } from 'react';
import { chimeSynth } from '../utils/proceduralChimeSynth';

/**
 * useShimmerChimeSync
 * -------------------
 * Detects when the GLSL shimmer wave phase crosses 0.5 (center of mesh)
 * and fires the procedural chime exactly once per wave cycle.
 *
 * The GLSL formula being mirrored:
 *   wave = fract((pos.y * 1.6 + pos.x * 0.8) - uTime * uShimmerSpeed * 0.25)
 * We track uTime progress to detect cycle boundaries.
 */
export function useShimmerChimeSync({
  shimmerSpeed = 2.5,
  enabled = true,
}: { shimmerSpeed?: number; enabled?: boolean } = {}) {
  const lastCycleRef = useRef<number>(-1);

  const checkShimmerPhase = useCallback(
    (elapsedTime: number) => {
      if (!enabled) return;
      const progress     = elapsedTime * shimmerSpeed * 0.25;
      const cycleIndex   = Math.floor(progress);
      const phase        = progress % 1.0;

      if (phase >= 0.5 && lastCycleRef.current !== cycleIndex) {
        lastCycleRef.current = cycleIndex;
        chimeSynth.playGlintSparkle();
      }
    },
    [shimmerSpeed, enabled]
  );

  return { checkShimmerPhase };
}
