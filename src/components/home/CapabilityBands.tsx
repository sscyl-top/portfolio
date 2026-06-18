"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Points } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import { resume } from "@/data/portfolio";

type CapabilityBandsProps = {
  strengths: string[];
};

type StrengthSlide = {
  kicker: string;
  title: string;
  outline: string;
  body: string;
  shapeLabel: string;
};

type Point2 = readonly [number, number];

const slides: StrengthSlide[] = [
  {
    kicker: "01 / Core strengths",
    title: "5年+经验",
    outline: "GLOBAL BRAND",
    body: "曾作为年销亿级全球全产业链品牌「极克 Jetfly」的唯一首席设计师，以一人设计团队模式独立构建并落地品牌全链路视觉体系。",
    shapeLabel: "Particle rocket",
  },
  {
    kicker: "02 / Full-stack visual",
    title: "全栈视觉闭环",
    outline: "VISUAL SYSTEM",
    body: "精通品牌 VI、电商 UX、产品 ID、空间 SI、包装工程，具备从 0 到 1 搭建全链路品牌视觉体系落地的能力。",
    shapeLabel: "Particle satellite",
  },
  {
    kicker: "03 / AI workflow",
    title: "技术驱动设计",
    outline: "AIGC FLOW",
    body: "深度掌握 AIGC 技术，熟练搭建 AI 设计工作流，运用 AI 工具输出多版本设计方案，实现设计产出效率 200% 提升。",
    shapeLabel: "Particle earth map",
  },
  {
    kicker: "04 / Web delivery",
    title: "跨部门协同与落地",
    outline: "WEB + MOTION",
    body: "具备 Web 视觉设计与落地能力，可进行 vibe coding 式页面搭建与设计实现，同时具备短视频剪辑与动效表达能力。",
    shapeLabel: "Particle astronaut",
  },
  {
    kicker: "05 / Brand practice",
    title: "品牌推广实战",
    outline: "TEAM VALUE",
    body: "曾主导多项大型活动全案视觉与团队统筹，将创意转化为可量化的品牌价值，适应高强度设计节奏。",
    shapeLabel: "Particle brand orbit",
  },
];

const rocketOutline: Point2[] = [
  [0, 2.18],
  [0.42, 1.26],
  [0.48, -0.74],
  [0.9, -1.22],
  [0.34, -1.1],
  [0.18, -1.6],
  [0, -2.12],
  [-0.18, -1.6],
  [-0.34, -1.1],
  [-0.9, -1.22],
  [-0.48, -0.74],
  [-0.42, 1.26],
  [0, 2.18],
];

const satellitePanelLeft: Point2[] = [
  [-2.45, -0.72],
  [-0.66, -0.52],
  [-0.58, 0.52],
  [-2.32, 0.76],
  [-2.45, -0.72],
];

const satellitePanelRight: Point2[] = [
  [0.66, -0.52],
  [2.45, -0.72],
  [2.32, 0.76],
  [0.58, 0.52],
  [0.66, -0.52],
];

const satelliteBody: Point2[] = [
  [-0.48, -0.38],
  [0.48, -0.38],
  [0.48, 0.38],
  [-0.48, 0.38],
  [-0.48, -0.38],
];

const astronautContour: Point2[] = [
  [0, 1.7],
  [0.5, 1.5],
  [0.62, 1.02],
  [0.48, 0.62],
  [0.62, 0.22],
  [1.2, -0.58],
  [0.72, -0.76],
  [0.38, -0.38],
  [0.28, -1.5],
  [-0.08, -1.68],
  [-0.32, -0.52],
  [-0.72, -1.52],
  [-1.04, -1.3],
  [-0.52, -0.32],
  [-1.18, -0.74],
  [-1.36, -0.42],
  [-0.58, 0.28],
  [-0.48, 0.72],
  [-0.62, 1.06],
  [-0.5, 1.5],
  [0, 1.7],
];

const brandOrbit: Point2[] = [
  [-1.8, -0.82],
  [-1.12, -0.1],
  [-0.34, 0.42],
  [0.5, 0.72],
  [1.42, 0.86],
  [1.95, 0.72],
];

const polylineCache = new WeakMap<
  readonly Point2[],
  { lengths: number[]; total: number }
>();

const particleModelUrls = [
  "/models/particles/earth.gltf",
  "/models/particles/astronaut.gltf",
];
const ambientParticleThreshold = 0.86;

export function CapabilityBands({ strengths }: CapabilityBandsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    let timeout = 0;

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const next = Math.min(100, Math.round((elapsed / 1200) * 100));
      setProgress(next);

      if (next < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        timeout = window.setTimeout(() => setIsLoaded(true), 120);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
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
      scrollProgressRef.current = raw;
      const next = Math.min(
        slides.length - 1,
        Math.floor(raw * slides.length + 0.68),
      );
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
      onMouseMove={(event) => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${event.clientX - 40}px, ${event.clientY - 40}px, 0)`;
        }
      }}
      onMouseLeave={() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = "translate3d(-200px, -200px, 0)";
        }
      }}
    >
      <Loader progress={progress} hidden={isLoaded} />

      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_46%,rgba(139,215,205,0.08),transparent_32%),radial-gradient(circle_at_28%_66%,rgba(201,162,127,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
        <ParticleStage
          activeIndex={activeIndex}
          scrollProgressRef={scrollProgressRef}
        />
        <div
          ref={cursorRef}
          className="pointer-events-none fixed z-40 hidden h-20 w-20 rounded-full bg-white/12 mix-blend-screen backdrop-blur-sm transition-transform duration-150 ease-out md:block"
          style={{ transform: "translate3d(-200px, -200px, 0)" }}
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
      className={`fixed inset-0 z-[60] grid place-items-center bg-black transition-opacity duration-500 ${
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
  const isReversed = index % 2 === 1;

  return (
    <section className="relative flex min-h-screen items-center px-5 py-24 md:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
        <div
          className={`max-w-2xl transition duration-700 ${
            isReversed ? "lg:col-start-2 lg:justify-self-end lg:text-right" : ""
          } ${
            active ? "translate-y-0 opacity-100" : "translate-y-6 opacity-48"
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
          <p
            className={`mt-8 max-w-xl text-lg leading-9 text-white/66 ${
              isReversed ? "lg:ml-auto" : ""
            }`}
          >
            {slide.body}
          </p>
          <div
            className={`mt-8 flex items-center gap-4 font-mono text-xs text-white/38 ${
              isReversed ? "lg:justify-end" : ""
            }`}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span className="h-px w-24 bg-white/18" />
            <span>{String(slides.length).padStart(2, "0")}</span>
          </div>
          <p className="mt-5 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-white/28">
            {slide.shapeLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

function ParticleStage({
  activeIndex,
  scrollProgressRef,
}: {
  activeIndex: number;
  scrollProgressRef: { current: number };
}) {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 48 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.35} />
        <Suspense fallback={null}>
          <ParticleMorph
            activeIndex={activeIndex}
            scrollProgressRef={scrollProgressRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

function ParticleMorph({
  activeIndex,
  scrollProgressRef,
}: {
  activeIndex: number;
  scrollProgressRef: { current: number };
}) {
  const [earthModel, astronautModel] = useLoader(
    GLTFLoader,
    particleModelUrls,
  );
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const stateRef = useRef({
    active: activeIndex,
    lastPointerX: 0,
    lastPointerY: 0,
    scatter: 0,
    side: activeIndex % 2 === 0 ? 1 : -1,
    mouseX: 50,
    mouseY: 50,
    hasPointer: false,
  });

  const { positions, targets, sizes, phases } = useMemo(() => {
    const count =
      typeof window !== "undefined" && window.innerWidth <= 768 ? 5600 : 9000;
    const current = new Float32Array(count * 3);
    const targetSets = Array.from({ length: slides.length }, () =>
      new Float32Array(count * 3),
    );
    const sizeValues = new Float32Array(count);
    const phaseValues = new Float32Array(count);
    const modelTargets: Array<Float32Array | null> = [
      null,
      null,
      sampleModelSurface(earthModel.scene, count, {
        mainMeshIndex: 0,
        rotation: new THREE.Euler(
          Math.PI * -0.65,
          Math.PI * -0.3,
          Math.PI * 0.1,
        ),
        fitWidth: 4.65,
        fitHeight: 4.1,
        fitDepth: 3.2,
      }),
      sampleModelSurface(astronautModel.scene, count, {
        mainMeshIndex: 4,
        rotation: new THREE.Euler(0, Math.PI * 0.1, Math.PI * -0.05),
        fitWidth: 3.1,
        fitHeight: 3.85,
        fitDepth: 2.2,
      }),
      null,
    ];

    for (let i = 0; i < count; i += 1) {
      for (let shape = 0; shape < targetSets.length; shape += 1) {
        const modelTarget = modelTargets[shape];
        const isAtmosphere =
          pseudoRandom(i, shape + 130) > ambientParticleThreshold;
        const point =
          modelTarget && !isAtmosphere
            ? {
                x: modelTarget[i * 3],
                y: modelTarget[i * 3 + 1],
                z: modelTarget[i * 3 + 2],
              }
            : shapePoint(i, count, shape);
        targetSets[shape][i * 3] = point.x;
        targetSets[shape][i * 3 + 1] = point.y;
        targetSets[shape][i * 3 + 2] = point.z;
      }

      current[i * 3] = targetSets[0][i * 3];
      current[i * 3 + 1] = targetSets[0][i * 3 + 1];
      current[i * 3 + 2] = targetSets[0][i * 3 + 2];

      sizeValues[i] = 0.34 + pseudoRandom(i, 18) * 1.06;
      phaseValues[i] = pseudoRandom(i, 19) * Math.PI * 2;
    }

    return {
      positions: current,
      targets: targetSets,
      sizes: sizeValues,
      phases: phaseValues,
    };
  }, [astronautModel.scene, earthModel.scene]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: {
        value:
          typeof window === "undefined"
            ? 1
            : Math.min(window.devicePixelRatio || 1, 1.8),
      },
      uCursor: { value: new THREE.Vector2(50, 50) },
      uMouseForce: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    stateRef.current.active = activeIndex;
    stateRef.current.side = activeIndex % 2 === 0 ? 1 : -1;
  }, [activeIndex]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      if (!stateRef.current.hasPointer) {
        stateRef.current.lastPointerX = x;
        stateRef.current.lastPointerY = y;
      }

      stateRef.current.mouseX = x;
      stateRef.current.mouseY = y;
      stateRef.current.hasPointer = true;
    };
    const onPointerLeave = () => {
      stateRef.current.mouseX = 50;
      stateRef.current.mouseY = 50;
      stateRef.current.hasPointer = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  useFrame(({ clock }) => {
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
    const side = stateRef.current.side;
    const travel = scrollProgressRef.current * slides.length;
    const travelX = Math.cos(travel * Math.PI) * 1.72;
    const travelY = 0.42 + Math.sin(travel * Math.PI) * 0.22;
    const hasPointer = stateRef.current.hasPointer;
    const pointerX = hasPointer ? stateRef.current.mouseX : 0;
    const pointerY = hasPointer ? stateRef.current.mouseY : 0;
    const pointerSpeed = hasPointer
      ? Math.hypot(
          pointerX - stateRef.current.lastPointerX,
          pointerY - stateRef.current.lastPointerY,
        )
      : 0;
    stateRef.current.lastPointerX = pointerX;
    stateRef.current.lastPointerY = pointerY;
    stateRef.current.scatter = Math.min(
      1,
      stateRef.current.scatter * 0.986 + pointerSpeed * 5.4,
    );
    const scatter = stateRef.current.scatter;
    const localMouseX = hasPointer
      ? pointerX * 5.15 - points.position.x
      : 50;
    const localMouseY = hasPointer ? pointerY * 3.0 - 0.45 : 50;
    const repelRadius = 1.62 + scatter * 1.05;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uCursor.value.set(localMouseX, localMouseY);
      materialRef.current.uniforms.uMouseForce.value = scatter;
    }

    for (let i = 0; i < array.length; i += 3) {
      const index = i / 3;
      const wave =
        Math.sin(time * 0.42 + index * 0.01) * 0.028 +
        Math.cos(time * 0.23 + index * 0.017) * 0.018;
      const dx = array[i] - localMouseX;
      const dy = array[i + 1] - localMouseY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const repel =
        distance < repelRadius
          ? ((1 - distance / repelRadius) ** 2) * (0.26 + scatter * 0.56)
          : 0;
      const swirl = repel * (0.44 + scatter * 0.28);
      const disperse =
        scatter *
        0.62 *
        Math.sin(time * 0.52 + index * 0.29 + active * 1.7);
      const targetX =
        target[i] + wave + dx * repel - dy * swirl + disperse * 0.18;
      const targetY =
        target[i + 1] + wave + dy * repel + dx * swirl + disperse * 0.13;
      const targetZ = target[i + 2] + disperse * 0.38;
      const morphSpeed = 0.014 + scatter * 0.004;

      array[i] += (targetX - array[i]) * morphSpeed;
      array[i + 1] += (targetY - array[i + 1]) * morphSpeed;
      array[i + 2] += (targetZ - array[i + 2]) * morphSpeed;
    }

    attribute.needsUpdate = true;
    points.position.x += (travelX - points.position.x) * 0.055;
    points.position.y += (travelY - points.position.y) * 0.055;
    points.rotation.y =
      pointerX * 0.22 +
      Math.sin(time * 0.065) * 0.075 +
      scatter * side * 0.08;
    points.rotation.x = pointerY * 0.14 + Math.sin(time * 0.04) * 0.035;
  });

  return (
    <points ref={pointsRef} position={[1.68, 0.45, 0]} scale={0.86}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
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
  varying float vTwinkle;
  varying float vFlow;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uCursor;
  uniform float uMouseForce;

  void main() {
    float mouseDistance = distance(position.xy, uCursor);
    float mouseGlow = (1.0 - smoothstep(0.0, 2.2, mouseDistance)) * uMouseForce;
    vTwinkle = 0.52 + 0.48 * sin(uTime * (1.55 + phase * 0.16) + phase);
    float snakeX = sin(
      position.x * 0.76 +
      sin(position.y * 1.15 + uTime * 0.19) * 1.4 -
      uTime * 0.16
    );
    float snakeY = sin(
      position.y * 0.61 +
      sin(position.x * 0.92 - uTime * 0.13) * 1.15 +
      uTime * 0.12
    );
    float flowSignal = 0.5 + 0.5 * (snakeX * 0.58 + snakeY * 0.42);
    vFlow = pow(smoothstep(0.34, 0.94, flowSignal), 4.0);
    vec3 displaced = position;
    displaced.x += snakeY * vFlow * 0.012;
    displaced.y += snakeX * vFlow * 0.01;
    displaced.z += mouseGlow * 0.36 * sin(uTime * 1.4 + phase);
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vPosition = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    float pulse = 0.84 + vTwinkle * 0.44 + vFlow * 0.24 + mouseGlow * 1.65;
    gl_PointSize = size * uPixelRatio * pulse * (19.5 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying float vTwinkle;
  varying float vFlow;
  varying vec3 vPosition;
  uniform float uTime;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float valueNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 local = fract(p);
    local = local * local * (3.0 - 2.0 * local);

    float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, local.x);
    float nx10 = mix(n010, n110, local.x);
    float nx01 = mix(n001, n101, local.x);
    float nx11 = mix(n011, n111, local.x);
    float nxy0 = mix(nx00, nx10, local.y);
    float nxy1 = mix(nx01, nx11, local.y);

    return mix(nxy0, nxy1, local.z);
  }

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(uv);
    float core = smoothstep(0.46, 0.02, distanceFromCenter);
    float halo = smoothstep(0.5, 0.16, distanceFromCenter) * 0.2;
    float alpha =
      (core * 0.7 + halo) *
      (0.22 + vTwinkle * 0.28 + vFlow * 0.07);

    if (alpha < 0.02) {
      discard;
    }

    vec3 fieldBase = vPosition * vec3(0.48, 0.5, 0.38);
    float warpA = valueNoise(
      fieldBase * 0.72 + vec3(0.0, uTime * 0.025, 1.7)
    );
    float warpB = valueNoise(
      fieldBase * 0.94 + vec3(-uTime * 0.021, 3.1, 0.0)
    );
    vec3 fieldPosition = fieldBase;
    fieldPosition.x += sin(
      fieldBase.y * 1.3 + warpA * 4.5 + uTime * 0.09
    ) * 0.48;
    fieldPosition.y += sin(
      fieldBase.x * 0.85 + warpB * 5.2 - uTime * 0.07
    ) * 0.42;
    fieldPosition += vec3(
      uTime * 0.035,
      -uTime * 0.022,
      uTime * 0.016
    );
    float cluster = valueNoise(fieldPosition);
    float detail = valueNoise(fieldPosition * 2.05 + vec3(4.7, 1.3, 8.1));
    float goldRegion = smoothstep(0.64, 0.76, cluster + vFlow * 0.018);

    vec3 blueDark = vec3(0.06, 0.39, 0.72);
    vec3 blueLight = vec3(0.22, 0.72, 1.0);
    vec3 goldDark = vec3(0.68, 0.39, 0.08);
    vec3 goldLight = vec3(1.0, 0.68, 0.18);
    vec3 blue = mix(blueDark, blueLight, 0.2 + detail * 0.8);
    vec3 gold = mix(goldDark, goldLight, 0.16 + detail * 0.84);
    vec3 fieldColor = mix(blue, gold, goldRegion);
    vec3 glowColor = mix(fieldColor, vec3(1.0), 0.008 + vTwinkle * 0.012);

    gl_FragColor = vec4(
      glowColor * (0.58 + vTwinkle * 0.22 + vFlow * 0.12),
      alpha
    );
  }
`;

type ModelSurfaceOptions = {
  mainMeshIndex: number;
  rotation: THREE.Euler;
  fitWidth: number;
  fitHeight: number;
  fitDepth: number;
};

function sampleModelSurface(
  scene: THREE.Object3D,
  count: number,
  options: ModelSurfaceOptions,
) {
  const meshes: THREE.Mesh<THREE.BufferGeometry>[] = [];
  const sampled = new Float32Array(count * 3);

  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh<THREE.BufferGeometry>;

    if (mesh.isMesh && mesh.geometry?.getAttribute("position")) {
      meshes.push(mesh);
    }
  });

  if (meshes.length === 0) {
    return sampled;
  }

  const mainMeshIndex = Math.min(options.mainMeshIndex, meshes.length - 1);
  const secondaryCount =
    meshes.length > 1 ? Math.floor((count * 0.3) / (meshes.length - 1)) : 0;
  const mainCount = count - secondaryCount * (meshes.length - 1);
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    options.rotation,
  );
  const point = new THREE.Vector3();
  let cursor = 0;

  meshes.forEach((sourceMesh, meshIndex) => {
    const geometry = sourceMesh.geometry.clone();
    geometry.applyMatrix4(sourceMesh.matrixWorld);
    geometry.applyMatrix4(rotationMatrix);
    const samplingMesh = new THREE.Mesh(geometry);
    const sampler = new MeshSurfaceSampler(samplingMesh).build();
    const meshPointCount = meshIndex === mainMeshIndex ? mainCount : secondaryCount;

    for (let index = 0; index < meshPointCount; index += 1) {
      sampler.sample(point);
      sampled[cursor * 3] = point.x;
      sampled[cursor * 3 + 1] = point.y;
      sampled[cursor * 3 + 2] = point.z;
      cursor += 1;
    }

    geometry.dispose();
  });

  fitPointCloud(sampled, options);

  return sampled;
}

function fitPointCloud(points: Float32Array, options: ModelSurfaceOptions) {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  for (let index = 0; index < points.length; index += 3) {
    min.x = Math.min(min.x, points[index]);
    min.y = Math.min(min.y, points[index + 1]);
    min.z = Math.min(min.z, points[index + 2]);
    max.x = Math.max(max.x, points[index]);
    max.y = Math.max(max.y, points[index + 1]);
    max.z = Math.max(max.z, points[index + 2]);
  }

  const center = min.clone().add(max).multiplyScalar(0.5);
  const size = max.clone().sub(min);
  const scale = Math.min(
    options.fitWidth / Math.max(size.x, 0.001),
    options.fitHeight / Math.max(size.y, 0.001),
    options.fitDepth / Math.max(size.z, 0.001),
  );

  for (let index = 0; index < points.length; index += 3) {
    points[index] = (points[index] - center.x) * scale;
    points[index + 1] = (points[index + 1] - center.y) * scale;
    points[index + 2] = (points[index + 2] - center.z) * scale;
  }
}

function shapePoint(index: number, count: number, shape: number) {
  const t = index / count;
  const noise = pseudoRandom(index, shape + 1) - 0.5;
  const part = pseudoRandom(index, shape + 30);
  const isAtmosphere =
    pseudoRandom(index, shape + 130) > ambientParticleThreshold;
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

  const shapeX = shape === 0 && !isAtmosphere ? point.x * 1.35 : point.x;
  const rotated = rotatePoint(shapeX, point.y, shape === 0 ? -0.52 : 0);

  return {
    x: rotated.x + noise * (isAtmosphere ? 0.18 : 0.045),
    y: rotated.y + noise * (isAtmosphere ? 0.18 : 0.045),
    z: point.z + noise * (isAtmosphere ? 0.9 : 0.34),
  };
}

function ambientDustPoint(index: number, t: number, shape: number) {
  const x = (pseudoRandom(index, 140) - 0.5) * 12.8;
  const lane = (pseudoRandom(index, 141) - 0.5) * 6.6;
  const bend = Math.sin(x * 0.58 + shape * 1.7 + t * Math.PI * 2) * 0.42;

  return {
    x: x + Math.sin(t * 9.0 + shape) * 0.28,
    y: lane + bend,
    z: (pseudoRandom(index, 142) - 0.5) * 3.8,
  };
}

function rocketPoint(index: number, part: number) {
  if (part < 0.48) {
    return samplePolyline(index, rocketOutline, 0.035, 0.18, 211);
  }

  if (part < 0.62) {
    return sampleEllipse(index, 0, 0.05, 0.28, 1.18, 0.45);
  }

  if (part < 0.72) {
    const p = sampleTriangle(index, -0.36, 1.26, 0.36, 1.26, 0, 2.02);
    return { ...p, z: 0.06 };
  }

  if (part < 0.82) {
    return sampleLine(index, -0.34, -1.08, 0.34, -1.08, 0.04);
  }

  if (part < 0.91) {
    return sampleEllipseRing(index, 0, 0.34, 0.22, 0.22, 1.2, 0.03);
  }

  const flame = sampleTriangle(index, -0.27, -1.2, 0.27, -1.2, 0, -2.05);
  return { ...flame, z: 0.18 };
}

function satellitePoint(index: number, part: number) {
  if (part < 0.18) {
    return samplePolyline(index, satelliteBody, 0.03, 0.12, 221);
  }

  if (part < 0.42) {
    return samplePolyline(index, satellitePanelLeft, 0.045, -0.05, 222);
  }

  if (part < 0.66) {
    return samplePolyline(index, satellitePanelRight, 0.045, -0.05, 223);
  }

  if (part < 0.78) {
    const left = part < 0.72;
    const x = left ? -1.46 : 1.46;
    const y = -0.55 + pseudoRandom(index, 90) * 1.1;
    return { x, y, z: -0.03 };
  }

  if (part < 0.89) {
    return sampleLine(index, -0.62, 0, 0.62, 0, 0.02);
  }

  if (part < 0.96) {
    return sampleLine(index, 0.25, 0.34, 1.06, 1.12, 0.08);
  }

  return sampleEllipseRing(index, 1.18, 1.26, 0.24, 0.14, 0.15, 0.02);
}

function earthMapPoint(index: number, part: number) {
  const band = pseudoRandom(index, 46);
  if (part < 0.26) {
    return sampleEllipseRing(index, 0, -0.05, 1.82, 1.08, 0.02, 0.02);
  }

  if (part < 0.36) {
    return sampleLine(index, -1.58, 0.08, 1.52, 0.2, 0.08);
  }

  if (part < 0.45) {
    return sampleLine(index, -1.2, -0.54, 1.28, -0.44, 0.08);
  }

  const cluster =
    part < 0.58
      ? sampleEllipse(index, -1.0, 0.48, 0.62, 0.32, 0.1)
      : part < 0.72
        ? sampleEllipse(index, -0.35, -0.08, 0.78, 0.38, 0.1)
        : part < 0.84
          ? sampleEllipse(index, 0.72, 0.38, 0.66, 0.28, 0.1)
          : part < 0.94
            ? sampleEllipse(index, 0.95, -0.38, 0.46, 0.28, 0.1)
            : sampleEllipse(index, 0.05, -0.72, 0.7, 0.18, 0.1);

  return {
    x: cluster.x * 1.22,
    y: cluster.y,
    z: Math.sin(cluster.x * 1.4 + band * Math.PI) * 0.36,
  };
}

function astronautPoint(index: number, part: number) {
  if (part < 0.32) {
    return samplePolyline(index, astronautContour, 0.04, 0.08, 231);
  }

  if (part < 0.48) {
    return sampleEllipseRing(index, 0, 1.05, 0.58, 0.58, 0.22, 0.04);
  }

  if (part < 0.58) {
    return sampleEllipseRing(index, 0, 1.02, 0.34, 0.22, 0.34, 0.03);
  }

  if (part < 0.72) {
    return sampleRectOutline(index, -0.5, -0.62, 0.5, 0.48, 0.05);
  }

  if (part < 0.82) {
    return sampleLine(index, -0.46, 0.2, -1.22, -0.72, 0.07);
  }

  if (part < 0.92) {
    return sampleLine(index, 0.46, 0.2, 1.18, -0.58, 0.07);
  }

  if (part < 0.96) {
    return sampleLine(index, -0.2, -0.58, -0.62, -1.6, 0.08);
  }

  return sampleLine(index, 0.2, -0.58, 0.68, -1.58, 0.08);
}

function brandNebulaPoint(index: number, part: number, t: number) {
  const angle = t * Math.PI * 6.8;
  const radius = 0.35 + t * 2.4 + Math.sin(t * Math.PI * 10) * 0.18;

  if (part < 0.24) {
    return samplePolyline(index, brandOrbit, 0.06, 0.12, 241);
  }

  if (part < 0.76) {
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

function sampleEllipseRing(
  index: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  z = 0,
  spread = 0.04,
) {
  const angle = pseudoRandom(index, 54) * Math.PI * 2;
  const jitter = (pseudoRandom(index, 55) - 0.5) * spread;

  return {
    x: cx + Math.cos(angle) * (rx + jitter),
    y: cy + Math.sin(angle) * (ry + jitter),
    z: z + (pseudoRandom(index, 56) - 0.5) * 0.16,
  };
}

function sampleRectOutline(
  index: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z = 0,
) {
  const side = Math.floor(pseudoRandom(index, 64) * 4);
  const p = pseudoRandom(index, 65);
  const jitter = (pseudoRandom(index, 66) - 0.5) * 0.05;

  if (side === 0) {
    return { x: x1 + (x2 - x1) * p, y: y1 + jitter, z };
  }

  if (side === 1) {
    return { x: x2 + jitter, y: y1 + (y2 - y1) * p, z };
  }

  if (side === 2) {
    return { x: x2 - (x2 - x1) * p, y: y2 + jitter, z };
  }

  return { x: x1 + jitter, y: y2 - (y2 - y1) * p, z };
}

function samplePolyline(
  index: number,
  points: readonly Point2[],
  spread = 0.04,
  z = 0,
  salt = 101,
) {
  let metadata = polylineCache.get(points);

  if (!metadata) {
    const lengths = points.slice(1).map(([x, y], pointIndex) => {
      const [prevX, prevY] = points[pointIndex];

      return Math.hypot(x - prevX, y - prevY);
    });
    metadata = {
      lengths,
      total: lengths.reduce((sum, length) => sum + length, 0),
    };
    polylineCache.set(points, metadata);
  }

  const { lengths, total } = metadata;
  let pick = pseudoRandom(index, salt) * total;
  let segment = 0;

  while (segment < lengths.length - 1 && pick > lengths[segment]) {
    pick -= lengths[segment];
    segment += 1;
  }

  const [x1, y1] = points[segment];
  const [x2, y2] = points[segment + 1];
  const segmentLength = Math.max(0.001, lengths[segment]);
  const p = pick / segmentLength;
  const nx = -(y2 - y1) / segmentLength;
  const ny = (x2 - x1) / segmentLength;
  const jitter = (pseudoRandom(index, salt + 1) - 0.5) * spread;

  return {
    x: x1 + (x2 - x1) * p + nx * jitter,
    y: y1 + (y2 - y1) * p + ny * jitter,
    z: z + (pseudoRandom(index, salt + 2) - 0.5) * 0.18,
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
