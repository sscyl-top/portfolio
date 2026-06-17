"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Points } from "three";

import { resume } from "@/data/portfolio";

type CapabilityBandsProps = {
  strengths: string[];
};

type StrengthSlide = {
  kicker: string;
  title: string;
  outline: string;
  body: string;
};

const slides: StrengthSlide[] = [
  {
    kicker: "01 / Core strengths",
    title: "5年+经验",
    outline: "GLOBAL BRAND",
    body: "曾作为年销亿级全球全产业链品牌「极克 Jetfly」的唯一首席设计师，以一人设计团队模式独立构建并落地品牌全链路视觉体系。",
  },
  {
    kicker: "02 / Full-stack visual",
    title: "全栈视觉闭环",
    outline: "VISUAL SYSTEM",
    body: "精通品牌 VI、电商 UX、产品 ID、空间 SI、包装工程，具备从 0 到 1 搭建全链路品牌视觉体系落地的能力。",
  },
  {
    kicker: "03 / AI workflow",
    title: "技术驱动设计",
    outline: "AIGC FLOW",
    body: "深度掌握 AIGC 技术，熟练搭建 AI 设计工作流，运用 AI 工具输出多版本设计方案，实现设计产出效率 200% 提升。",
  },
  {
    kicker: "04 / Web delivery",
    title: "跨部门协同与落地",
    outline: "WEB + MOTION",
    body: "具备 Web 视觉设计与落地能力，可进行 vibe coding 式页面搭建与设计实现，同时具备短视频剪辑与动效表达能力。",
  },
  {
    kicker: "05 / Brand practice",
    title: "品牌推广实战",
    outline: "TEAM VALUE",
    body: "曾主导多项大型活动全案视觉与团队统筹，将创意转化为可量化的品牌价值，适应高强度设计节奏。",
  },
];

export function CapabilityBands({ strengths }: CapabilityBandsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cursor, setCursor] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const next = Math.min(100, Math.round((elapsed / 1200) * 100));
      setProgress(next);

      if (next < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        const timeout = window.setTimeout(() => setIsLoaded(true), 260);
        return () => window.clearTimeout(timeout);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const update = () => {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const raw = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const next = Math.min(slides.length - 1, Math.floor(raw * slides.length));
      setActiveIndex(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative border-t border-white/10 bg-black"
      onMouseMove={(event) => setCursor({ x: event.clientX, y: event.clientY })}
      onMouseLeave={() => setCursor({ x: -200, y: -200 })}
    >
      <Loader progress={progress} hidden={isLoaded} />

      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_46%,rgba(139,215,205,0.08),transparent_32%),radial-gradient(circle_at_28%_66%,rgba(201,162,127,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
        <ParticleStage activeIndex={activeIndex} />
        <div
          className="pointer-events-none fixed z-40 hidden h-20 w-20 rounded-full bg-white/12 mix-blend-screen backdrop-blur-sm transition-transform duration-150 ease-out md:block"
          style={{
            transform: `translate3d(${cursor.x - 40}px, ${cursor.y - 40}px, 0)`,
          }}
        >
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>

      <div className="relative z-10 -mt-[100vh]">
        {slides.map((slide, index) => (
          <StrengthPanel
            key={slide.kicker}
            slide={slide}
            index={index}
            active={index === activeIndex}
          />
        ))}

        <section className="relative min-h-screen px-5 py-24 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 pt-24 lg:grid-cols-4">
            {resume.expertise.map((group) => (
              <div
                key={group.title}
                className="rounded-lg border border-white/10 bg-black/50 p-6 backdrop-blur"
              >
                <h3 className="font-mono text-sm uppercase text-cyan/75">
                  {group.title}
                </h3>
                <div className="mt-6 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/62"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <span className="sr-only">{strengths.join(" ")}</span>
    </section>
  );
}

function Loader({ progress, hidden }: { progress: number; hidden: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-black transition-opacity duration-700 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center font-mono text-white">
        <p className="text-sm uppercase text-white/42">Loading visual system</p>
        <p className="mt-4 text-5xl font-semibold tracking-[-0.02em]">
          SSCYL {progress}%
        </p>
      </div>
    </div>
  );
}

function StrengthPanel({
  slide,
  index,
  active,
}: {
  slide: StrengthSlide;
  index: number;
  active: boolean;
}) {
  return (
    <section className="relative flex min-h-screen items-center px-5 py-24 md:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
        <div
          className={`max-w-2xl transition duration-700 ${
            active ? "translate-y-0 opacity-100" : "translate-y-8 opacity-36"
          }`}
        >
          <p className="font-mono text-xs uppercase text-copper">
            {slide.kicker}
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-[0.88] text-white md:text-8xl">
            {slide.title}
            <span className="mt-4 block text-4xl text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.58)] md:text-7xl">
              {slide.outline}
            </span>
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-9 text-white/66">
            {slide.body}
          </p>
          <div className="mt-8 flex items-center gap-4 font-mono text-xs text-white/38">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span className="h-px w-24 bg-white/18" />
            <span>{String(slides.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ParticleStage({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 48 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.35} />
        <ParticleMorph activeIndex={activeIndex} />
      </Canvas>
    </div>
  );
}

function ParticleMorph({ activeIndex }: { activeIndex: number }) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const stateRef = useRef({
    active: activeIndex,
    lastPointerX: 0,
    lastPointerY: 0,
    scatter: 0,
  });

  const { positions, targets, colors, sizes, phases } = useMemo(() => {
    const count = 6200;
    const current = new Float32Array(count * 3);
    const targetSets = Array.from({ length: slides.length }, () =>
      new Float32Array(count * 3),
    );
    const colorValues = new Float32Array(count * 3);
    const sizeValues = new Float32Array(count);
    const phaseValues = new Float32Array(count);
    const palette = [
      new THREE.Color("#5f91ff"),
      new THREE.Color("#85c7ff"),
      new THREE.Color("#cfeeff"),
      new THREE.Color("#f1bd63"),
      new THREE.Color("#ffd777"),
      new THREE.Color("#fff2c3"),
    ];

    for (let i = 0; i < count; i += 1) {
      for (let shape = 0; shape < targetSets.length; shape += 1) {
        const point = shapePoint(i, count, shape);
        targetSets[shape][i * 3] = point.x;
        targetSets[shape][i * 3 + 1] = point.y;
        targetSets[shape][i * 3 + 2] = point.z;
      }

      current[i * 3] = targetSets[0][i * 3];
      current[i * 3 + 1] = targetSets[0][i * 3 + 1];
      current[i * 3 + 2] = targetSets[0][i * 3 + 2];

      const colorPick = pseudoRandom(i, 12);
      const color =
        colorPick < 0.72
          ? palette[Math.floor(pseudoRandom(i, 13) * 3)].clone()
          : palette[3 + Math.floor(pseudoRandom(i, 14) * 3)].clone();
      color.lerp(new THREE.Color("#ffffff"), pseudoRandom(i, 15) * 0.06);
      colorValues[i * 3] = color.r;
      colorValues[i * 3 + 1] = color.g;
      colorValues[i * 3 + 2] = color.b;
      sizeValues[i] = 0.28 + pseudoRandom(i, 18) * 0.92;
      phaseValues[i] = pseudoRandom(i, 19) * Math.PI * 2;
    }

    return {
      positions: current,
      targets: targetSets,
      colors: colorValues,
      sizes: sizeValues,
      phases: phaseValues,
    };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: {
        value:
          typeof window === "undefined"
            ? 1
            : Math.min(window.devicePixelRatio || 1, 1.8),
      },
    }),
    [],
  );

  useEffect(() => {
    stateRef.current.active = activeIndex;
  }, [activeIndex]);

  useFrame(({ pointer, clock }) => {
    const points = pointsRef.current;

    if (!points) {
      return;
    }

    const geometry = points.geometry;
    const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const active = stateRef.current.active;
    const target = targets[active];
    const time = clock.elapsedTime;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }
    const pointerSpeed = Math.hypot(
      pointer.x - stateRef.current.lastPointerX,
      pointer.y - stateRef.current.lastPointerY,
    );
    stateRef.current.lastPointerX = pointer.x;
    stateRef.current.lastPointerY = pointer.y;
    stateRef.current.scatter = Math.min(
      1,
      stateRef.current.scatter * 0.965 + pointerSpeed * 3.2,
    );
    const scatter = stateRef.current.scatter;
    const localMouseX = pointer.x * 4.1 - 1.25;
    const localMouseY = pointer.y * 2.55;
    const repelRadius = 1.35 + scatter * 0.72;

    for (let i = 0; i < array.length; i += 3) {
      const index = i / 3;
      const wave = Math.sin(time * 0.42 + index * 0.01) * 0.02;
      const dx = array[i] - localMouseX;
      const dy = array[i + 1] - localMouseY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const repel =
        distance < repelRadius
          ? ((1 - distance / repelRadius) ** 2) * (0.18 + scatter * 0.3)
          : 0;
      const swirl = repel * 0.28;
      const disperse =
        scatter *
        0.38 *
        Math.sin(time * 0.52 + index * 0.29 + active * 1.7);
      const targetX =
        target[i] + wave + dx * repel - dy * swirl + disperse * 0.12;
      const targetY =
        target[i + 1] + wave + dy * repel + dx * swirl + disperse * 0.08;
      const targetZ = target[i + 2] + disperse * 0.24;
      const morphSpeed = 0.012 + scatter * 0.006;

      array[i] += (targetX - array[i]) * morphSpeed;
      array[i + 1] += (targetY - array[i + 1]) * morphSpeed;
      array[i + 2] += (targetZ - array[i + 2]) * morphSpeed;
    }

    attribute.needsUpdate = true;
    points.rotation.y = pointer.x * 0.16 + Math.sin(time * 0.065) * 0.055;
    points.rotation.x = pointer.y * 0.11 + Math.sin(time * 0.04) * 0.025;
  });

  return (
    <points ref={pointsRef} position={[1.72, 0.45, 0]} scale={0.82}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const particleVertexShader = `
  attribute float size;
  attribute float phase;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColor = color;
    vTwinkle = 0.62 + 0.38 * sin(uTime * (1.2 + phase * 0.12) + phase);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio * (0.78 + vTwinkle * 0.42) * (17.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(uv);
    float core = smoothstep(0.5, 0.02, distanceFromCenter);
    float halo = smoothstep(0.5, 0.24, distanceFromCenter) * 0.16;
    float alpha = (core * 0.72 + halo) * (0.28 + vTwinkle * 0.32);

    if (alpha < 0.02) {
      discard;
    }

    gl_FragColor = vec4(vColor * (0.72 + vTwinkle * 0.36), alpha);
  }
`;

function shapePoint(index: number, count: number, shape: number) {
  const t = index / count;
  const noise = pseudoRandom(index, shape + 1) - 0.5;
  const part = pseudoRandom(index, shape + 30);
  const isAtmosphere = pseudoRandom(index, shape + 130) > 0.9;
  const point =
    isAtmosphere
      ? ambientDustPoint(index, t, shape)
      : shape === 0
        ? rocketPoint(index, part)
        : shape === 1
          ? satellitePoint(index, part)
          : shape === 2
            ? earthMapPoint(index, part)
            : shape === 3
              ? astronautPoint(index, part)
              : brandNebulaPoint(index, part, t);

  const rotated = rotatePoint(point.x, point.y, shape === 0 ? -0.48 : 0);

  return {
    x: rotated.x + noise * (isAtmosphere ? 0.16 : 0.07),
    y: rotated.y + noise * (isAtmosphere ? 0.16 : 0.07),
    z: point.z + noise * (isAtmosphere ? 0.9 : 0.45),
  };
}

function ambientDustPoint(index: number, t: number, shape: number) {
  const angle = t * Math.PI * 8 + pseudoRandom(index, 140) * Math.PI;
  const radius = 0.8 + pseudoRandom(index, 141) * 2.4;

  return {
    x: Math.cos(angle) * radius + Math.sin(t * 12 + shape) * 0.55,
    y: Math.sin(angle * 0.76) * radius * 0.72,
    z: (pseudoRandom(index, 142) - 0.5) * 2.6,
  };
}

function rocketPoint(index: number, part: number) {
  if (part < 0.48) {
    return sampleEllipse(index, 0, 0.1, 0.42, 1.45, 1);
  }

  if (part < 0.66) {
    const p = sampleTriangle(index, -0.45, 1.25, 0.45, 1.25, 0, 2.05);
    return { ...p, z: 0.06 };
  }

  if (part < 0.8) {
    const left = part < 0.73;
    return sampleTriangle(
      index,
      left ? -0.38 : 0.38,
      -0.82,
      left ? -1.0 : 1.0,
      -1.35,
      left ? -0.38 : 0.38,
      -1.3,
    );
  }

  if (part < 0.9) {
    return sampleEllipse(index, 0, 0.34, 0.18, 0.18, 4);
  }

  const flame = sampleTriangle(index, -0.27, -1.2, 0.27, -1.2, 0, -2.05);
  return { ...flame, z: 0.18 };
}

function satellitePoint(index: number, part: number) {
  if (part < 0.2) {
    return sampleRect(index, -0.45, -0.38, 0.45, 0.38, 0.1);
  }

  if (part < 0.47) {
    return sampleRect(index, -2.35, -0.54, -0.62, 0.54, -0.05);
  }

  if (part < 0.74) {
    return sampleRect(index, 0.62, -0.54, 2.35, 0.54, -0.05);
  }

  if (part < 0.86) {
    return sampleLine(index, -0.62, 0, 0.62, 0, 0.02);
  }

  if (part < 0.94) {
    return sampleLine(index, 0.25, 0.34, 1.0, 1.1, 0.12);
  }

  return sampleEllipse(index, 1.18, 1.26, 0.22, 0.12, 0.15);
}

function earthMapPoint(index: number, part: number) {
  const band = pseudoRandom(index, 46);
  const cluster =
    part < 0.2
      ? sampleEllipse(index, -1.0, 0.48, 0.62, 0.32, 0.1)
      : part < 0.42
        ? sampleEllipse(index, -0.35, -0.08, 0.78, 0.38, 0.1)
        : part < 0.62
          ? sampleEllipse(index, 0.72, 0.38, 0.66, 0.28, 0.1)
          : part < 0.82
            ? sampleEllipse(index, 0.95, -0.38, 0.46, 0.28, 0.1)
            : sampleEllipse(index, 0.05, -0.72, 0.7, 0.18, 0.1);

  return {
    x: cluster.x * 1.2,
    y: cluster.y,
    z: Math.sin(cluster.x * 1.4 + band * Math.PI) * 0.36,
  };
}

function astronautPoint(index: number, part: number) {
  if (part < 0.24) {
    return sampleEllipse(index, 0, 1.05, 0.58, 0.58, 0.22);
  }

  if (part < 0.34) {
    return sampleEllipse(index, 0, 1.02, 0.34, 0.22, 0.34);
  }

  if (part < 0.58) {
    return sampleRect(index, -0.48, -0.62, 0.48, 0.48, 0.05);
  }

  if (part < 0.7) {
    return sampleLine(index, -0.46, 0.2, -1.12, -0.62, 0.08);
  }

  if (part < 0.82) {
    return sampleLine(index, 0.46, 0.2, 1.08, -0.5, 0.08);
  }

  if (part < 0.91) {
    return sampleLine(index, -0.2, -0.6, -0.56, -1.55, 0.1);
  }

  return sampleLine(index, 0.2, -0.6, 0.62, -1.55, 0.1);
}

function brandNebulaPoint(index: number, part: number, t: number) {
  const angle = t * Math.PI * 6.8;
  const radius = 0.35 + t * 2.4 + Math.sin(t * Math.PI * 10) * 0.18;

  if (part < 0.72) {
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle * 0.82) * radius * 0.68,
      z: (t - 0.5) * 3.8,
    };
  }

  return sampleLine(
    index,
    -1.7 + pseudoRandom(index, 71) * 0.2,
    -0.8,
    1.8,
    0.95,
    0.16,
  );
}

function sampleEllipse(
  index: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  z = 0,
) {
  const angle = pseudoRandom(index, 51) * Math.PI * 2;
  const radius = Math.sqrt(pseudoRandom(index, 52));

  return {
    x: cx + Math.cos(angle) * rx * radius,
    y: cy + Math.sin(angle) * ry * radius,
    z: z + (pseudoRandom(index, 53) - 0.5) * 0.18,
  };
}

function sampleRect(
  index: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z = 0,
) {
  return {
    x: x1 + (x2 - x1) * pseudoRandom(index, 61),
    y: y1 + (y2 - y1) * pseudoRandom(index, 62),
    z: z + (pseudoRandom(index, 63) - 0.5) * 0.18,
  };
}

function sampleLine(
  index: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  spread = 0.05,
) {
  const p = pseudoRandom(index, 81);
  const n = pseudoRandom(index, 82) - 0.5;

  return {
    x: x1 + (x2 - x1) * p + n * spread,
    y: y1 + (y2 - y1) * p + n * spread,
    z: (pseudoRandom(index, 83) - 0.5) * 0.2,
  };
}

function sampleTriangle(
  index: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
) {
  let u = pseudoRandom(index, 91);
  let v = pseudoRandom(index, 92);

  if (u + v > 1) {
    u = 1 - u;
    v = 1 - v;
  }

  return {
    x: ax + u * (bx - ax) + v * (cx - ax),
    y: ay + u * (by - ay) + v * (cy - ay),
    z: (pseudoRandom(index, 93) - 0.5) * 0.24,
  };
}

function rotatePoint(x: number, y: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function pseudoRandom(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}
