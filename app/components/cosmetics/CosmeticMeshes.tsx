'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// 1. Angular Cyberpunk Sunglasses / Visor Shades
export function CyberShades() {
  return (
    <group position={[0, 0.08, 0.62]}>
      {/* Black Tinted Lens Bar */}
      <RoundedBox args={[1.05, 0.28, 0.06]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color="#000000" metalness={0.95} roughness={0.05} />
      </RoundedBox>

      {/* Neon Top Edge Frame */}
      <mesh position={[0, 0.13, 0.02]}>
        <boxGeometry args={[1.08, 0.04, 0.08]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.5} />
      </mesh>

      {/* Side Arm Mounts */}
      <mesh position={[-0.53, 0, -0.15]} rotation={[0, Math.PI / 12, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.35]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
      <mesh position={[0.53, 0, -0.15]} rotation={[0, -Math.PI / 12, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.35]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
    </group>
  );
}

// 2. Holographic Floating Crown Halo
export function HaloCrown() {
  const haloRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (haloRef.current) {
      haloRef.current.rotation.y = state.clock.elapsedTime * 1.5;
      haloRef.current.position.y = 0.95 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group ref={haloRef} position={[0, 0.95, 0]}>
      {/* Floating Torus Halo */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.04, 16, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.0} />
      </mesh>

      {/* Floating Crown Spikes */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
        <mesh
          key={idx}
          position={[Math.cos(angle) * 0.55, 0.08, Math.sin(angle) * 0.55]}
          rotation={[0, -angle, 0]}
        >
          <coneGeometry args={[0.05, 0.16, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.0} />
        </mesh>
      ))}
    </group>
  );
}

// 3. Chroma DJ Studio Headphones
export function DJHeadphones() {
  return (
    <group position={[0, 0, 0]}>
      {/* Overhead Bridge Arc */}
      <mesh position={[0, 0.65, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.78, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Left RGB Ear Cup */}
      <group position={[-0.82, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.18, 32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        {/* Glowing Chroma Outer Ring */}
        <mesh position={[0, 0.09, 0]}>
          <torusGeometry args={[0.26, 0.03, 16, 32]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* Right RGB Ear Cup */}
      <group position={[0.82, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.18, 32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        {/* Glowing Chroma Outer Ring */}
        <mesh position={[0, -0.09, 0]}>
          <torusGeometry args={[0.26, 0.03, 16, 32]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.0} />
        </mesh>
      </group>
    </group>
  );
}

// 4. Tesla Horn Antennas
export function TeslaHorns() {
  return (
    <group position={[0, 0.6, 0]}>
      {/* Left Horn */}
      <group position={[-0.45, 0.25, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.02, 0.08, 0.45, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* Right Horn */}
      <group position={[0.45, 0.25, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.02, 0.08, 0.45, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={2.5} />
        </mesh>
      </group>
    </group>
  );
}
