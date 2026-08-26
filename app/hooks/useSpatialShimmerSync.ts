'use client';

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { spatialChimeSynth } from '../utils/proceduralSpatialChime';

/**
 * useSpatialShimmerSync
 * ----------------------
 * Projects the avatar's world position onto the screen X-axis,
 * then biases the stereo pan range so the chime appears to emanate
 * from wherever the robot is on screen (even after OrbitControls rotation).
 */
export function useSpatialShimmerSync({
  shimmerSpeed = 2.5,
  enabled = true,
}: { shimmerSpeed?: number; enabled?: boolean } = {}) {
  const lastCycleRef = useRef<number>(-1);

  const checkSpatialShimmer = useCallback(
    (
      elapsedTime: number,
      avatarWorldPosition?: THREE.Vector3,
      camera?: THREE.Camera
    ) => {
      if (!enabled) return;

      const progress   = elapsedTime * shimmerSpeed * 0.25;
      const cycleIndex = Math.floor(progress);
      const phase      = progress % 1.0;

      if (phase >= 0.5 && lastCycleRef.current !== cycleIndex) {
        lastCycleRef.current = cycleIndex;

        let leftPan  = -0.75;
        let rightPan =  0.75;

        if (avatarWorldPosition && camera) {
          const proj   = avatarWorldPosition.clone().project(camera);
          const screenX = Math.max(-0.6, Math.min(0.6, proj.x));
          leftPan  = Math.max(-1.0, screenX - 0.5);
          rightPan = Math.min(1.0, screenX + 0.5);
        }

        spatialChimeSynth.playSpatialGlint(leftPan, rightPan);
      }
    },
    [shimmerSpeed, enabled]
  );

  return { checkSpatialShimmer };
}
