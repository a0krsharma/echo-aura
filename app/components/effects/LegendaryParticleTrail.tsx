'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleTrailProps {
  count?: number;
  color?: string;
  radius?: number;
}

export function LegendaryParticleTrail({
  count = 40,
  color = '#fbbf24',
  radius = 0.7,
}: ParticleTrailProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Initialize particle offsets, speeds, and phases
  const [positions, initialAngles, speeds, yOffsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    const spd = new Float32Array(count);
    const yOff = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      spd[i] = 0.8 + Math.random() * 1.2;
      yOff[i] = (Math.random() - 0.5) * 1.2;

      pos[i * 3] = Math.cos(angles[i]) * radius;
      pos[i * 3 + 1] = yOff[i];
      pos[i * 3 + 2] = Math.sin(angles[i]) * radius;
    }
    return [pos, angles, spd, yOff];
  }, [count, radius]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Helix orbital rotation
      initialAngles[i] += speeds[i] * delta;
      const currentRadius = radius + Math.sin(state.clock.elapsedTime * 2 + i) * 0.08;

      arr[i * 3] = Math.cos(initialAngles[i]) * currentRadius;
      // Drift upward and loop back
      arr[i * 3 + 1] += speeds[i] * delta * 0.25;
      if (arr[i * 3 + 1] > 0.8) arr[i * 3 + 1] = -0.6;
      arr[i * 3 + 2] = Math.sin(initialAngles[i]) * currentRadius;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
