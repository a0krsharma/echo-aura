'use client';

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

export const ShimmerMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#d97706'),      // Rich 24K Gold base
    uShimmerColor: new THREE.Color('#fef08a'),   // Intense white-yellow glint
    uFresnelColor: new THREE.Color('#ffffff'),   // Glancing rim glow
    uFresnelPower: 2.2,
    uShimmerBandWidth: 0.12,
    uShimmerSpeed: 2.2,
  },
  // --- Vertex Shader ---
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vPosition = worldPos.xyz;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // --- Fragment Shader ---
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform vec3 uShimmerColor;
    uniform vec3 uFresnelColor;
    uniform float uFresnelPower;
    uniform float uShimmerBandWidth;
    uniform float uShimmerSpeed;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // 1. Optical Fresnel Rim Calculation
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
      vec3 fresnelGlow = uFresnelColor * fresnel * 0.9;

      // 2. Diagonal Sweeping Shimmer Wave
      float wave = fract((vPosition.y * 1.6 + vPosition.x * 0.8) - uTime * uShimmerSpeed * 0.25);
      float shimmerBand = smoothstep(0.5 - uShimmerBandWidth, 0.5, wave) - 
                          smoothstep(0.5, 0.5 + uShimmerBandWidth, wave);
      shimmerBand = clamp(shimmerBand, 0.0, 1.0);

      // 3. Blinn-Phong High-Gloss Specular
      vec3 lightDir = normalize(vec3(1.0, 2.0, 1.5));
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 48.0) * 1.5;

      // Composite Shimmer + Specular + Base + Fresnel
      vec3 color = uBaseColor;
      color += uShimmerColor * (shimmerBand * 2.0 + spec);
      color += fresnelGlow;

      gl_FragColor = vec4(color, 1.0);
    }
  `
);

// Register with R3F JSX typing
extend({ ShimmerMaterial });
