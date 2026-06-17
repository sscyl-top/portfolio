"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Points } from "three";

function ParticleField() {
  const pointsRef = useRef<Points>(null);
  const positions = useMemo(() => {
    const count = 520;
    const values = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (pseudoRandom(i, 3) - 0.5) * 12;
      values[i * 3 + 1] = (pseudoRandom(i, 7) - 0.5) * 7;
      values[i * 3 + 2] = (pseudoRandom(i, 11) - 0.5) * 5;
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
      <pointsMaterial
        color="#d8d5cc"
        size={0.018}
        transparent
        opacity={0.62}
        sizeAttenuation
      />
    </points>
  );
}

function pseudoRandom(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

export function AmbientParticles() {
  return (
    <div className="absolute inset-0 opacity-70 max-md:opacity-30">
      <Canvas camera={{ position: [0, 0, 5], fov: 55 }} dpr={[1, 1.5]}>
        <ParticleField />
      </Canvas>
    </div>
  );
}
