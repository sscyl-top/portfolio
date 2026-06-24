"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
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

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.y = clock.elapsedTime * 0.015;
    pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.12) * 0.02;
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

const METEOR_TAIL_LENGTH = 28;
const MAX_METEORS = 2;
const METEOR_INTERVAL_MIN = 11;
const METEOR_INTERVAL_MAX = 16;

interface MeteorState {
  active: boolean;
  progress: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
}

function MeteorField() {
  const pointsRef = useRef<Points>(null);
  const meteorStates = useRef<MeteorState[]>([]);
  const nextSpawn = useRef<number>(2);
  const positions = useMemo(() => {
    return new Float32Array(MAX_METEORS * METEOR_TAIL_LENGTH * 3);
  }, []);
  const opacities = useMemo(() => {
    return new Float32Array(MAX_METEORS * METEOR_TAIL_LENGTH);
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return;
    }

    const time = clock.elapsedTime;

    if (meteorStates.current.length < MAX_METEORS) {
      for (let m = meteorStates.current.length; m < MAX_METEORS; m++) {
        meteorStates.current.push({
          active: false,
          progress: 0,
          startX: 0,
          startY: 0,
          angle: 0,
          speed: 0,
        });
      }
    }

    if (time >= nextSpawn.current) {
      const inactiveIdx = meteorStates.current.findIndex((m) => !m.active);
      if (inactiveIdx >= 0) {
        const meteor = meteorStates.current[inactiveIdx];
        meteor.active = true;
        meteor.progress = 0;
        meteor.startX = 4.5 + pseudoRandom(inactiveIdx, 99) * 2.5;
        meteor.startY = 2.5 + pseudoRandom(inactiveIdx, 77) * 1.5;
        meteor.angle = -Math.PI * (0.22 + pseudoRandom(inactiveIdx, 55) * 0.12);
        meteor.speed = 5.5 + pseudoRandom(inactiveIdx, 33) * 2.5;
        nextSpawn.current = time + METEOR_INTERVAL_MIN + pseudoRandom(Math.floor(time), 44) * (METEOR_INTERVAL_MAX - METEOR_INTERVAL_MIN);
      }
    }

    let activeCount = 0;
    for (let m = 0; m < MAX_METEORS; m++) {
      const meteor = meteorStates.current[m];
      if (!meteor.active) {
        for (let p = 0; p < METEOR_TAIL_LENGTH; p++) {
          const idx = (m * METEOR_TAIL_LENGTH + p) * 3;
          opacities[m * METEOR_TAIL_LENGTH + p] = 0;
        }
        continue;
      }
      activeCount++;

      meteor.progress += 0.016 * meteor.speed / 6;
      if (meteor.progress > 1.3) {
        meteor.active = false;
        for (let p = 0; p < METEOR_TAIL_LENGTH; p++) {
          opacities[m * METEOR_TAIL_LENGTH + p] = 0;
        }
        continue;
      }

      const dirX = Math.cos(meteor.angle);
      const dirY = Math.sin(meteor.angle);
      const travelDist = meteor.progress * 14;

      for (let p = 0; p < METEOR_TAIL_LENGTH; p++) {
        const offset = (p / (METEOR_TAIL_LENGTH - 1)) * 2.2;
        const px = meteor.startX + dirX * (travelDist - offset);
        const py = meteor.startY + dirY * (travelDist - offset);
        const pz = (pseudoRandom(m * 100 + p, 13) - 0.5) * 0.15 - 0.8;
        const idx = (m * METEOR_TAIL_LENGTH + p) * 3;
        positions[idx] = px;
        positions[idx + 1] = py;
        positions[idx + 2] = pz;

        const fade = 1 - p / METEOR_TAIL_LENGTH;
        const lifeFade = meteor.progress < 0.08 ? meteor.progress / 0.08 : (meteor.progress > 0.85 ? (1 - (meteor.progress - 0.85) / 0.45) : 1);
        opacities[m * METEOR_TAIL_LENGTH + p] = Math.max(0, fade * lifeFade * 0.95);
      }
    }

    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    (geo.attributes as any).aOpacity.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aOpacity" args={[opacities, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={meteorVertexShader}
        fragmentShader={meteorFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const meteorVertexShader = `
  attribute float aOpacity;
  varying float vOpacity;
  void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(38.0 / max(-mvPosition.z, 0.1), 3.0, 16.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const meteorFragmentShader = `
  varying float vOpacity;
  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
    if (distanceFromCenter > 0.5) {
      discard;
    }
    float core = smoothstep(0.5, 0.15, distanceFromCenter);
    float halo = smoothstep(0.5, 0.25, distanceFromCenter) * 0.4;
    float alpha = (core + halo) * vOpacity;
    vec3 color = mix(vec3(1.0, 0.92, 0.72), vec3(0.75, 0.92, 1.0), distanceFromCenter);
    gl_FragColor = vec4(color, alpha);
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
        <MeteorField />
      </Canvas>
    </div>
  );
}
