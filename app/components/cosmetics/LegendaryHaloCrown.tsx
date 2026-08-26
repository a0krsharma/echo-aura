'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '@/app/shaders/ShimmerMaterial';
import { LegendaryParticleTrail } from '@/app/components/effects/LegendaryParticleTrail';

export function LegendaryHaloCrown() {
  const haloRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<any>(null);

  useFrame((state, delta) => {
    // 1. Advance Shader Glint Time
    if (shaderRef.current) {
      shaderRef.current.uTime = state.clock.elapsedTime;
    }

    // 2. Dynamic Float & Rotation
    if (haloRef.current) {
      haloRef.current.rotation.y += delta * 1.2;
      haloRef.current.position.y = 0.95 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Golden Swirling Aura Motes */}
      <LegendaryParticleTrail count={35} color="#fef08a" radius={0.65} />

      {/* Floating Crown Mesh */}
      <group ref={haloRef} position={[0, 0.95, 0]}>
        {/* Shimmering Halo Torus */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.045, 16, 48]} />
          {/* @ts-ignore */}
          <shimmerMaterial
            ref={shaderRef}
            uBaseColor={new THREE.Color('#d97706')}
            uShimmerColor={new THREE.Color('#ffffff')}
            uFresnelColor={new THREE.Color('#fef08a')}
            uFresnelPower={2.0}
            uShimmerSpeed={2.8}
          />
        </mesh>

        {/* Crown Crystal Spikes */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <mesh
            key={idx}
            position={[Math.cos(angle) * 0.55, 0.08, Math.sin(angle) * 0.55]}
            rotation={[0, -angle, 0]}
          >
            <coneGeometry args={[0.06, 0.2, 8]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#f59e0b"
              emissiveIntensity={2.5}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
