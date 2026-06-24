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

const METEOR_TAIL_LENGTH = 18;
const MAX_METEORS = 2;
const METEOR_INTERVAL_MIN = 11;
const METEOR_INTERVAL_MAX = 16;
const METEOR_TRAVEL_DISTANCE = 10;
const METEOR_TAIL_LENGTH_UNITS = 1.4;

interface MeteorState {
  active: boolean;
  progress: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  z: number;
}

function MeteorField() {
  const pointsRef = useRef<Points>(null);
  const meteorStates = useRef<MeteorState[]>([]);
  const nextSpawn = useRef<number>(3.5);
  const positions = useMemo(() => {
    return new Float32Array(MAX_METEORS * METEOR_TAIL_LENGTH * 3);
  }, []);
  const opacities = useMemo(() => {
    return new Float32Array(MAX_METEORS * METEOR_TAIL_LENGTH);
  }, []);
  const sizes = useMemo(() => {
    return new Float32Array(MAX_METEORS * METEOR_TAIL_LENGTH);
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return;
    }

    const time = clock.elapsedTime;
    const delta = 0.016;

    if (meteorStates.current.length < MAX_METEORS) {
      for (let m = meteorStates.current.length; m < MAX_METEORS; m++) {
        meteorStates.current.push({
          active: false,
          progress: 0,
          startX: 0,
          startY: 0,
          angle: 0,
          speed: 0,
          z: 0,
        });
      }
    }

    if (time >= nextSpawn.current) {
      const inactiveIdx = meteorStates.current.findIndex((m) => !m.active);
      if (inactiveIdx >= 0) {
        const meteor = meteorStates.current[inactiveIdx];
        meteor.active = true;
        meteor.progress = 0;
        meteor.startX = 4.0 + pseudoRandom(inactiveIdx + Math.floor(time / 10), 99) * 2.0;
        meteor.startY = 2.2 + pseudoRandom(inactiveIdx + Math.floor(time / 10), 77) * 1.0;
        meteor.angle = -Math.PI * (0.24 + pseudoRandom(inactiveIdx + Math.floor(time / 10), 55) * 0.1);
        meteor.speed = 2.2 + pseudoRandom(inactiveIdx + Math.floor(time / 10), 33) * 0.8;
        meteor.z = -0.3 + pseudoRandom(inactiveIdx, 22) * 0.6;
        nextSpawn.current = time + METEOR_INTERVAL_MIN + pseudoRandom(Math.floor(time), 44) * (METEOR_INTERVAL_MAX - METEOR_INTERVAL_MIN);
      }
    }

    for (let m = 0; m < MAX_METEORS; m++) {
      const meteor = meteorStates.current[m];
      if (!meteor.active) {
        for (let p = 0; p < METEOR_TAIL_LENGTH; p++) {
          opacities[m * METEOR_TAIL_LENGTH + p] = 0;
        }
        continue;
      }

      meteor.progress += delta * meteor.speed / METEOR_TRAVEL_DISTANCE;
      if (meteor.progress > 1.2) {
        meteor.active = false;
        for (let p = 0; p < METEOR_TAIL_LENGTH; p++) {
          opacities[m * METEOR_TAIL_LENGTH + p] = 0;
        }
        continue;
      }

      const dirX = Math.cos(meteor.angle);
      const dirY = Math.sin(meteor.angle);
      const travelDist = meteor.progress * METEOR_TRAVEL_DISTANCE;

      const lifeFade = meteor.progress < 0.1 
        ? meteor.progress / 0.1 
        : (meteor.progress > 0.88 ? (1 - (meteor.progress - 0.88) / 0.32) : 1);

      for (let p = 0; p < METEOR_TAIL_LENGTH; p++) {
        const t = p / (METEOR_TAIL_LENGTH - 1);
        const offset = t * METEOR_TAIL_LENGTH_UNITS;
        const spread = (pseudoRandom(m * 100 + p + Math.floor(time * 60) % 1000, 13) - 0.5) * 0.04 * t;
        const px = meteor.startX + dirX * (travelDist - offset) + spread * -dirY;
        const py = meteor.startY + dirY * (travelDist - offset) + spread * dirX;
        const idx = (m * METEOR_TAIL_LENGTH + p) * 3;
        positions[idx] = px;
        positions[idx + 1] = py;
        positions[idx + 2] = meteor.z + (pseudoRandom(m * 100 + p, 19) - 0.5) * 0.08;

        const fade = Math.pow(1 - t, 1.8);
        opacities[m * METEOR_TAIL_LENGTH + p] = Math.max(0, fade * lifeFade);
        sizes[m * METEOR_TAIL_LENGTH + p] = p === 0 ? 1.0 : (0.15 + (1 - t) * 0.6);
      }
    }

    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes as any).aOpacity.needsUpdate = true;
    (geo.attributes as any).aSize.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aOpacity" args={[opacities, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
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
  attribute float aSize;
  varying float vOpacity;
  varying float vSize;
  void main() {
    vOpacity = aOpacity;
    vSize = aSize;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float baseSize = mix(8.0, 28.0, aSize);
    gl_PointSize = baseSize / max(-mvPosition.z, 0.1);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const meteorFragmentShader = `
  varying float vOpacity;
  varying float vSize;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    if (dist > 0.5) {
      discard;
    }
    float isHead = smoothstep(0.7, 1.0, vSize);
    float core = smoothstep(0.5, 0.08, dist);
    float glow = smoothstep(0.5, 0.2, dist) * 0.5;
    float outerGlow = smoothstep(0.5, 0.35, dist) * 0.2;
    float alpha = (core + glow + outerGlow) * vOpacity;
    
    vec3 headColor = vec3(1.0, 0.98, 0.92);
    vec3 tailColor = vec3(0.72, 0.88, 1.0);
    vec3 warmMid = vec3(1.0, 0.86, 0.62);
    
    vec3 color = mix(tailColor, warmMid, vSize * 0.6);
    color = mix(color, headColor, isHead);
    
    gl_FragColor = vec4(color, alpha * 1.1);
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
