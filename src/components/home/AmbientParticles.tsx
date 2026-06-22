"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Points } from "three";

function ParticleField() {
  const pointsRef = useRef<Points>(null);
  const positions = useMemo(() => {
    const count = 1200;
    const values = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (pseudoRandom(i, 3) - 0.5) * 16;
      values[i * 3 + 1] = (pseudoRandom(i, 7) - 0.5) * 10;
      values[i * 3 + 2] = (pseudoRandom(i, 11) - 0.5) * 6;
    }

    return values;
  }, []);

  useFrame(({ pointer, clock }) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.y = pointer.x * 0.08 + clock.elapsedTime * 0.02;
    pointsRef.current.rotation.x = pointer.y * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={ambientParticleVertexShader}
        fragmentShader={ambientParticleFragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

const ambientParticleVertexShader = `
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(22.0 / max(-mvPosition.z, 0.1), 2.5, 10.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ambientParticleFragmentShader = `
  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));

    if (distanceFromCenter > 0.5) {
      discard;
    }

    float core = smoothstep(0.46, 0.24, distanceFromCenter);
    float edge = smoothstep(0.5, 0.34, distanceFromCenter) * 0.18;
    float alpha = core * 0.68 + edge;
    gl_FragColor = vec4(vec3(0.847, 0.835, 0.8), alpha);
  }
`;

function pseudoRandom(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

export function AmbientParticles() {
  return (
    <div className="absolute inset-0 opacity-70 max-md:opacity-50">
      <Canvas camera={{ position: [0, 0, 5], fov: 55 }} dpr={[1, 1.5]}>
        <ParticleField />
      </Canvas>
    </div>
  );
}
