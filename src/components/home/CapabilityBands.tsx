"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ArrowUpRight, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Points } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import { resume } from "@/data/portfolio";

import {
  allocateSatelliteMeshSamples,
  findActivePanelIndex,
  getParticleSceneRole,
  getParticleStageX,
  getSaturnParticleRegion,
  getPointerInteraction,
} from "./particleMotion";

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
    shapeLabel: "Particle saturn",
  },
  {
    kicker: "05 / Brand practice",
    title: "品牌推广实战",
    outline: "TEAM VALUE",
    body: "曾主导多项大型活动全案视觉与团队统筹，将创意转化为可量化的品牌价值，适应高强度设计节奏。",
    shapeLabel: "Particle astronaut",
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

const polylineCache = new WeakMap<
  readonly Point2[],
  { lengths: number[]; total: number }
>();

const particleModelUrls = [
  "/models/particles/rocket.glb",
  "/models/particles/satellite.glb",
  "/models/particles/earth.gltf",
  "/models/particles/astronaut.gltf",
];
const ambientParticleThreshold = 0.86;
let hasShownCapabilityLoaderThisDocument = false;

export function CapabilityBands({ strengths }: CapabilityBandsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shouldShowLoader] = useState(() => {
    const shouldShow = !hasShownCapabilityLoaderThisDocument;
    hasShownCapabilityLoaderThisDocument = true;
    return shouldShow;
  });
  const [progress, setProgress] = useState(() => (shouldShowLoader ? 0 : 100));
  const [isLoaded, setIsLoaded] = useState(() => !shouldShowLoader);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);
  const entryProgressRef = useRef(0);

  useEffect(() => {
    if (!shouldShowLoader) {
      return;
    }

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
  }, [shouldShowLoader]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const update = () => {
      const panels = Array.from(
        section.querySelectorAll<HTMLElement>("[data-strength-panel]"),
      );
      const firstPanelRect = panels[0]?.getBoundingClientRect();
      const secondPanelRect = panels[1]?.getBoundingClientRect();
      const panelStep =
        firstPanelRect && secondPanelRect
          ? secondPanelRect.top - firstPanelRect.top
          : window.innerHeight;
      const panelTravel = firstPanelRect
        ? Math.min(
            slides.length - 1,
            Math.max(0, -firstPanelRect.top / Math.max(panelStep, 1)),
          )
        : 0;
      scrollProgressRef.current = panelTravel / (slides.length - 1);
      entryProgressRef.current = firstPanelRect
        ? Math.min(
            1,
            Math.max(
              0,
              (window.innerHeight - firstPanelRect.top) /
                Math.max(window.innerHeight * 0.84, 1),
            ),
          )
        : 0;
      const next = findActivePanelIndex(
        panels.map((panel) => panel.getBoundingClientRect()),
        window.innerHeight,
      );

      if (next >= 0) {
        setActiveIndex(next);
      }
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
      className="relative bg-black"
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-44 -translate-y-full bg-gradient-to-b from-transparent via-black/60 to-black" />
      {shouldShowLoader ? <Loader progress={progress} hidden={isLoaded} /> : null}

      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_46%,rgba(139,215,205,0.08),transparent_32%),radial-gradient(circle_at_28%_66%,rgba(201,162,127,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:88px_88px] opacity-20" />
        <ParticleStage
          activeIndex={activeIndex}
          scrollProgressRef={scrollProgressRef}
          entryProgressRef={entryProgressRef}
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
        {slides.slice(0, -1).map((slide, index) => (
          <StrengthPanel
            key={slide.kicker}
            slide={slide}
            index={index}
            active={index === activeIndex}
          />
        ))}

        <FinalContactPanel active={activeIndex === slides.length - 1} />
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
      <div className="text-center font-sans text-white">
        <p className="text-3xl font-light leading-none tracking-[0.035em] md:text-5xl">
          hello@sscyl.top {progress}%
        </p>
      </div>
    </div>
  );
}

function FinalContactPanel({ active }: { active: boolean }) {
  return (
    <section
      id="strength-5"
      className="relative flex min-h-[100svh] px-4 pb-4 pt-22 md:px-8 md:pt-28 md:pb-6"
      data-strength-panel
    >
      <div className="mx-auto flex w-full max-w-[1500px] flex-col">
        <div
          className={`flex flex-1 items-center justify-center transition duration-700 ${
            active ? "translate-y-0 opacity-100" : "translate-y-8 opacity-40"
          }`}
        >
          <div className="flex w-fit max-w-full flex-col items-start">
            <p className="text-base font-light text-white">
              期待一起共事：
            </p>
            <a
              href="mailto:hello@sscyl.top"
              className="mt-3 whitespace-nowrap text-4xl font-light leading-none tracking-[0.035em] text-white md:text-7xl xl:text-[7.5rem]"
            >
              hello@sscyl.top
            </a>
          </div>
        </div>

        <div className="relative z-20 mt-8">
          <div
            id="home-cta"
            className="mx-auto flex max-w-3xl flex-row items-center justify-center gap-2 md:gap-6"
          >
            <Link
              href="/works"
              className="group inline-flex min-h-10 items-center justify-between gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-black transition hover:bg-cyan md:min-h-12 md:px-6 md:text-sm md:w-52"
            >
              浏览作品
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
            <Link
              href="/resume"
              className="inline-flex min-h-10 items-center justify-between gap-1.5 rounded-full border border-white/15 bg-black/45 px-3.5 text-xs text-white/78 backdrop-blur transition hover:border-white/35 hover:text-white md:min-h-12 md:px-6 md:text-sm md:w-48"
            >
              查看简历
              <FileText aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/resume#hiring-contact"
              className="inline-flex min-h-10 items-center justify-between gap-1.5 rounded-full border border-white/15 bg-black/45 px-3.5 text-xs text-white/78 backdrop-blur transition hover:border-copper/60 hover:text-white md:min-h-12 md:px-6 md:text-sm md:w-48"
            >
              聘用联系
              <Mail aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mx-auto mt-7 grid max-w-[1420px] gap-5 lg:grid-cols-4">
            {resume.expertise.map((group) => (
              <div
                key={group.title}
                className="min-h-28 rounded-lg border border-white/10 bg-black/55 px-5 py-4 backdrop-blur"
              >
                <h3 className="font-mono text-xs uppercase text-cyan/75">
                  {group.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/62"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 font-mono text-[0.65rem] uppercase text-white/30">
            © 2026 SSCYL Portfolio
          </p>
        </div>
      </div>
    </section>
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
    <section
      id={`strength-${index + 1}`}
      className="relative flex min-h-screen items-center px-4 py-14 md:px-8 md:py-24"
      data-strength-panel
    >
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
          <h2 className="mt-5 text-5xl font-semibold leading-[1.04] text-white md:text-8xl md:leading-[0.98]">
            {slide.title}
            <span className="mt-3 block text-4xl leading-[1.05] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.58)] md:mt-8 md:text-7xl">
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
  entryProgressRef,
}: {
  activeIndex: number;
  scrollProgressRef: { current: number };
  entryProgressRef: { current: number };
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 48 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true }}
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={0.35} />
        <Suspense fallback={null}>
          <ParticleMorph
            activeIndex={activeIndex}
            scrollProgressRef={scrollProgressRef}
            entryProgressRef={entryProgressRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

function ParticleMorph({
  activeIndex,
  scrollProgressRef,
  entryProgressRef,
}: {
  activeIndex: number;
  scrollProgressRef: { current: number };
  entryProgressRef: { current: number };
}) {
  const [rocketModel, satelliteModel, earthModel, astronautModel] = useLoader(
    GLTFLoader,
    particleModelUrls,
  );
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const stateRef = useRef({
    active: activeIndex,
    lastPointerX: 0,
    lastPointerY: 0,
    lastScrollProgress: 0,
    pointerEnergy: 0,
    scrollScatter: 0,
    mousePresence: 0,
    pointerVelocityX: 0,
    pointerVelocityY: 0,
    side: activeIndex % 2 === 0 ? 1 : -1,
    mouseX: 50,
    mouseY: 50,
    hasPointer: false,
    pointerInteraction: {
      radial: 0,
      tangential: 0,
      wake: 0,
      proximity: 0,
    },
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
      sampleModelSurface(rocketModel.scene, count, {
        mainMeshIndex: 0,
        mainMeshShare: 0.42,
        mirrorX: true,
        rotation: new THREE.Euler(
          Math.PI * -0.08,
          Math.PI * 0.08,
          Math.PI * -0.25,
        ),
        fitWidth: 4.6,
        fitHeight: 5.15,
        fitDepth: 2.65,
        edgeShare: 0.07,
        featureProfile: "rocket",
      }),
      sampleModelSurface(satelliteModel.scene, count, {
        mainMeshIndex: null,
        rotation: new THREE.Euler(
          Math.PI * -0.08,
          Math.PI * 0.06,
          Math.PI * 0.04,
        ),
        fitWidth: 5.35,
        fitHeight: 3.35,
        fitDepth: 2.8,
        edgeShare: 0.09,
        featureProfile: "satellite",
      }),
      sampleModelSurface(earthModel.scene, count, {
        mainMeshIndex: 0,
        mainMeshShare: 0.76,
        rotation: new THREE.Euler(
          Math.PI * -0.65,
          Math.PI * -0.3,
          Math.PI * 0.1,
        ),
        fitWidth: 6.98,
        fitHeight: 6.15,
        fitDepth: 4.8,
        edgeShare: 0.11,
      }),
      null,
      sampleModelSurface(astronautModel.scene, count, {
        mainMeshIndex: 4,
        mainMeshShare: 0.42,
        secondaryDistribution: "equal",
        rotation: new THREE.Euler(0, Math.PI * 0.1, Math.PI * -0.05),
        fitWidth: 3.8,
        fitHeight: 4.8,
        fitDepth: 2.6,
        edgeShare: 0.12,
      }),
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

      const introSeed = pseudoRandom(i, 316) * Math.PI * 2;
      const introRadius = 0.4 + pseudoRandom(i, 317) * 1.1;
      current[i * 3] =
        targetSets[0][i * 3] * 1.28 + Math.cos(introSeed) * introRadius;
      current[i * 3 + 1] =
        targetSets[0][i * 3 + 1] * 1.28 +
        Math.sin(introSeed) * introRadius * 0.74;
      current[i * 3 + 2] =
        targetSets[0][i * 3 + 2] + (pseudoRandom(i, 318) - 0.5) * 1.4;

      const sizeSeed = pseudoRandom(i, 18);
      sizeValues[i] = 0.5 + sizeSeed ** 1.8 * 1.15;
      phaseValues[i] = pseudoRandom(i, 19) * Math.PI * 2;
    }

    return {
      positions: current,
      targets: targetSets,
      sizes: sizeValues,
      phases: phaseValues,
    };
  }, [
    astronautModel.scene,
    earthModel.scene,
    rocketModel.scene,
    satelliteModel.scene,
  ]);

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
    const time = clock.elapsedTime;
    const side = stateRef.current.side;
    const shapeTravel = scrollProgressRef.current * (slides.length - 1);
    const shapeFrom = Math.min(slides.length - 1, Math.floor(shapeTravel));
    const shapeTo = Math.min(slides.length - 1, shapeFrom + 1);
    const shapeMixRaw = shapeTravel - shapeFrom;
    const shapeMixWindow = Math.min(
      1,
      Math.max(0, (shapeMixRaw - 0.08) / 0.7),
    );
    const shapeMix =
      shapeMixWindow * shapeMixWindow * (3 - 2 * shapeMixWindow);
    const targetFrom = targets[shapeFrom];
    const targetTo = targets[shapeTo];
    const entryProgress = Math.min(1, Math.max(0, entryProgressRef.current));
    const entryEase = entryProgress * entryProgress * (3 - 2 * entryProgress);
    const entryScatter = (1 - entryEase) * 0.72;
    const travel = shapeTravel;
    const scrollDelta = Math.abs(
      scrollProgressRef.current - stateRef.current.lastScrollProgress,
    );
    stateRef.current.lastScrollProgress = scrollProgressRef.current;
    const travelX = getParticleStageX(travel, slides.length - 1);
    const travelY = 0.42 + Math.sin(travel * Math.PI) * 0.22;
    const hasPointer = stateRef.current.hasPointer;
    const pointerX = hasPointer ? stateRef.current.mouseX : 0;
    const pointerY = hasPointer ? stateRef.current.mouseY : 0;
    const pointerDeltaX = hasPointer
      ? pointerX - stateRef.current.lastPointerX
      : 0;
    const pointerDeltaY = hasPointer
      ? pointerY - stateRef.current.lastPointerY
      : 0;
    const pointerSpeed = Math.hypot(pointerDeltaX, pointerDeltaY);
    stateRef.current.lastPointerX = pointerX;
    stateRef.current.lastPointerY = pointerY;
    const pointerEnergyTarget = Math.min(1, pointerSpeed * 30);
    const pointerEnergyEase =
      pointerEnergyTarget > stateRef.current.pointerEnergy ? 0.38 : 0.055;
    stateRef.current.pointerEnergy +=
      (pointerEnergyTarget - stateRef.current.pointerEnergy) *
      pointerEnergyEase;
    stateRef.current.pointerVelocityX +=
      (pointerDeltaX - stateRef.current.pointerVelocityX) * 0.28;
    stateRef.current.pointerVelocityY +=
      (pointerDeltaY - stateRef.current.pointerVelocityY) * 0.28;
    stateRef.current.scrollScatter = Math.min(
      1,
      stateRef.current.scrollScatter * 0.91 + scrollDelta * 18,
    );
    stateRef.current.mousePresence +=
      ((hasPointer ? 1 : 0) - stateRef.current.mousePresence) * 0.12;
    const mousePresence = stateRef.current.mousePresence;
    const transitionSine = Math.sin(shapeMixWindow * Math.PI);
    const transitionEnvelope = transitionSine * transitionSine * transitionSine;
    const transitionScatter = transitionEnvelope * 0.34;
    const scrollScatter = Math.min(
      1,
      stateRef.current.scrollScatter + transitionScatter,
    );
    const pointerEnergy = stateRef.current.pointerEnergy;
    const localMouseX = hasPointer
      ? pointerX * 5.15 - points.position.x
      : 50;
    const localMouseY = hasPointer ? pointerY * 3.0 - 0.45 : 50;
    const repelRadius = 1.72 + pointerEnergy * 0.24;
    const pointerVelocityLength = Math.max(
      0.0001,
      Math.hypot(
        stateRef.current.pointerVelocityX,
        stateRef.current.pointerVelocityY,
      ),
    );
    const pointerDirectionX =
      stateRef.current.pointerVelocityX / pointerVelocityLength;
    const pointerDirectionY =
      stateRef.current.pointerVelocityY / pointerVelocityLength;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uCursor.value.set(localMouseX, localMouseY);
      materialRef.current.uniforms.uMouseForce.value = Math.max(
        pointerEnergy * 0.48,
        mousePresence * 0.18,
      );
    }

    for (let i = 0; i < array.length; i += 3) {
      const index = i / 3;
      const wave =
        Math.sin(time * 0.42 + index * 0.01) * 0.028 +
        Math.cos(time * 0.23 + index * 0.017) * 0.018;
      const dx = array[i] - localMouseX;
      const dy = array[i + 1] - localMouseY;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const pointerInteraction = getPointerInteraction(
        distance,
        repelRadius,
        mousePresence,
        pointerEnergy,
        stateRef.current.pointerInteraction,
      );
      const radialX = (dx / distance) * pointerInteraction.radial;
      const radialY = (dy / distance) * pointerInteraction.radial;
      const swirlX = (-dy / distance) * pointerInteraction.tangential;
      const swirlY = (dx / distance) * pointerInteraction.tangential;
      const wakeX = pointerDirectionX * pointerInteraction.wake;
      const wakeY = pointerDirectionY * pointerInteraction.wake;
      const disperse =
        scrollScatter *
        0.62 *
        Math.sin(time * 0.52 + index * 0.29 + active * 1.7);
      const transitionSeed = pseudoRandom(index, active + 281) * Math.PI * 2;
      const blendedX = targetFrom[i] + (targetTo[i] - targetFrom[i]) * shapeMix;
      const blendedY =
        targetFrom[i + 1] + (targetTo[i + 1] - targetFrom[i + 1]) * shapeMix;
      const blendedZ =
        targetFrom[i + 2] + (targetTo[i + 2] - targetFrom[i + 2]) * shapeMix;
      const introSeed = pseudoRandom(index, 319) * Math.PI * 2;
      const introRadius = entryScatter * (0.62 + pseudoRandom(index, 320) * 1.42);
      const entryX =
        shapeFrom === 0
          ? Math.cos(introSeed + time * 0.16) * introRadius
          : 0;
      const entryY =
        shapeFrom === 0
          ? Math.sin(introSeed * 1.18 - time * 0.12) * introRadius * 0.72
          : 0;
      const entryZ =
        shapeFrom === 0
          ? (pseudoRandom(index, 321) - 0.5) * entryScatter * 1.2
          : 0;
      const transitionExpansion =
        1 + transitionEnvelope * (0.46 + sizes[index] * 0.14);
      const transitionDrift =
        scrollScatter * (0.2 + pseudoRandom(index, 282) * 0.34);
      const orbitX =
        Math.cos(transitionSeed + time * 0.8 + active) * transitionDrift;
      const orbitY =
        Math.sin(transitionSeed * 1.23 - time * 0.62) * transitionDrift * 0.72;
      const orbitZ =
        Math.sin(transitionSeed * 1.71 + time * 0.52) * transitionDrift * 0.58;
      const targetX =
        blendedX * transitionExpansion +
        entryX +
        wave +
        radialX +
        swirlX +
        wakeX +
        disperse * 0.14 +
        orbitX;
      const targetY =
        blendedY * transitionExpansion +
        entryY +
        wave +
        radialY +
        swirlY +
        wakeY +
        disperse * 0.1 +
        orbitY;
      const targetZ =
        blendedZ * transitionExpansion + entryZ + disperse * 0.3 + orbitZ;
      const arrivalRaw = Math.min(
        1,
        Math.max(0, (shapeMixRaw - 0.42) / 0.36),
      );
      const arrivalEase = arrivalRaw * arrivalRaw * (3 - 2 * arrivalRaw);
      const morphSpeed =
        0.018 +
        arrivalEase * 0.064 +
        (1 - transitionScatter) * 0.01 +
        entryEase * (shapeFrom === 0 ? 0.025 : 0);

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
      pointerEnergy * side * 0.045;
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
  varying float vScale;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uCursor;
  uniform float uMouseForce;

  void main() {
    float mouseDistance = distance(position.xy, uCursor);
    float mouseGlow = (1.0 - smoothstep(0.0, 1.55, mouseDistance)) * uMouseForce;
    vTwinkle = 0.52 + 0.48 * sin(uTime * (1.55 + phase * 0.16) + phase);
    vScale = clamp((size - 0.5) / 1.15, 0.0, 1.0);
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
    displaced.x += snakeY * vFlow * 0.015 + mouseGlow * 0.018 * sin(phase + uTime);
    displaced.y += snakeX * vFlow * 0.013 + mouseGlow * 0.016 * cos(phase * 1.3 - uTime * 0.8);
    displaced.z += mouseGlow * 0.08 * sin(uTime * 1.4 + phase);
    vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
    vPosition = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    float pulse = 0.92 + vTwinkle * 0.32 + vFlow * 0.14 + mouseGlow * 0.48;
    gl_PointSize = size * uPixelRatio * pulse * (22.5 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying float vTwinkle;
  varying float vFlow;
  varying float vScale;
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
    float core = smoothstep(0.48, 0.2, distanceFromCenter);
    float halo =
      smoothstep(0.5, 0.32, distanceFromCenter) *
      (0.08 + vScale * 0.08);
    float alpha =
      core * (0.7 + vTwinkle * 0.25) +
      halo * (0.32 + vFlow * 0.16);

    if (alpha < 0.02) {
      discard;
    }

    vec3 fieldBase = vPosition * vec3(0.54, 0.55, 0.42);
    float warpA = valueNoise(
      fieldBase * 0.72 + vec3(0.0, uTime * 0.12, 1.7)
    );
    float warpB = valueNoise(
      fieldBase * 0.94 + vec3(-uTime * 0.105, 3.1, 0.0)
    );
    vec3 fieldPosition = fieldBase;
    fieldPosition.x += sin(
      fieldBase.y * 1.3 + warpA * 4.5 + uTime * 0.22
    ) * 0.48;
    fieldPosition.y += sin(
      fieldBase.x * 0.85 + warpB * 5.2 - uTime * 0.19
    ) * 0.42;
    fieldPosition += vec3(
      uTime * 0.16,
      -uTime * 0.11,
      uTime * 0.08
    );
    float cluster = valueNoise(fieldPosition);
    float detail = valueNoise(fieldPosition * 2.05 + vec3(4.7, 1.3, 8.1));
    float sparkle = valueNoise(fieldPosition * 3.4 + vec3(9.1, uTime * 0.16, 2.4));
    float paletteRibbon = 0.5 + 0.5 * sin(
      vPosition.x * 0.88 +
      sin(vPosition.y * 0.72 + uTime * 0.18) * 2.1 -
      uTime * 0.22
    );
    float goldSignal =
      cluster * 0.42 +
      detail * 0.33 +
      paletteRibbon * 0.25;
    float goldRegion = smoothstep(0.44, 0.61, goldSignal);
    float goldPocket = smoothstep(0.56, 0.78, detail + vFlow * 0.2);
    float stablePartition = 0.5 + 0.5 * sin(
      vPosition.x * 1.36 + sin(vPosition.y * 0.72) * 1.18
    );
    goldRegion = mix(goldRegion, goldPocket, 0.18);
    goldRegion = mix(
      goldRegion,
      smoothstep(0.38, 0.62, stablePartition),
      0.32
    );
    float pearlRegion = smoothstep(0.72, 0.9, sparkle + detail * 0.14);

    vec3 blueDark = vec3(0.035, 0.3, 0.68);
    vec3 blueLight = vec3(0.08, 0.76, 1.0);
    vec3 goldDark = vec3(0.78, 0.43, 0.06);
    vec3 goldLight = vec3(1.0, 0.78, 0.16);
    vec3 blue = mix(blueDark, blueLight, 0.3 + detail * 0.7);
    vec3 gold = mix(goldDark, goldLight, 0.32 + detail * 0.68);
    vec3 fieldColor = mix(blue, gold, clamp(goldRegion, 0.0, 1.0));
    fieldColor = mix(fieldColor, vec3(0.78, 0.9, 0.96), pearlRegion * 0.24);
    vec3 glowColor = mix(fieldColor, vec3(1.0), 0.012 + vTwinkle * 0.016);

    gl_FragColor = vec4(
      glowColor * (0.8 + vTwinkle * 0.22 + vFlow * 0.08),
      alpha
    );
  }
`;

type ModelSurfaceOptions = {
  edgeShare?: number;
  featureProfile?: "rocket" | "satellite";
  mainMeshIndex?: number | null;
  mainMeshShare?: number;
  mirrorX?: boolean;
  secondaryDistribution?: "area" | "equal";
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

  const mainMeshIndex =
    options.mainMeshIndex === null
      ? null
      : Math.min(
          options.mainMeshIndex ?? getLargestMeshIndex(meshes),
          meshes.length - 1,
        );
  const mainShare = Math.min(0.9, Math.max(0.1, options.mainMeshShare ?? 0.7));
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    options.rotation,
  );
  const point = new THREE.Vector3();
  let cursor = 0;
  const preparedMeshes = meshes.map((sourceMesh) => {
    const geometry = sourceMesh.geometry.clone();
    geometry.applyMatrix4(sourceMesh.matrixWorld);
    geometry.applyMatrix4(rotationMatrix);

    return {
      area: getGeometrySurfaceArea(geometry),
      geometry,
      name: sourceMesh.name,
      parentName: sourceMesh.parent?.name ?? "",
      sampler: new MeshSurfaceSampler(new THREE.Mesh(geometry)).build(),
    };
  });
  const edgeShare = Math.min(0.18, Math.max(0, options.edgeShare ?? 0));
  const edgePointCount = Math.round(count * edgeShare);
  const surfacePointCount = count - edgePointCount;
  const meshPointCounts =
    options.featureProfile === "satellite"
      ? allocateSatelliteMeshSamples(
          preparedMeshes.map(({ area, name, parentName }) => ({
            area,
            name,
            parentName,
          })),
          surfacePointCount,
        )
      : allocateSurfaceSamples(
          preparedMeshes.map(({ area }) => area),
          surfacePointCount,
          mainMeshIndex,
          mainShare,
          options.secondaryDistribution ?? "area",
        );

  preparedMeshes.forEach(({ sampler }, meshIndex) => {
    const meshPointCount = meshPointCounts[meshIndex];

    for (let index = 0; index < meshPointCount; index += 1) {
      sampler.sample(point);
      sampled[cursor * 3] = point.x;
      sampled[cursor * 3 + 1] = point.y;
      sampled[cursor * 3 + 2] = point.z;
      cursor += 1;
    }

  });

  if (edgePointCount > 0) {
    cursor = sampleModelEdges(
      preparedMeshes.map(({ geometry }) => geometry),
      sampled,
      cursor,
      edgePointCount,
    );
  }

  preparedMeshes.forEach(({ geometry }) => geometry.dispose());

  fitPointCloud(sampled, options);

  if (options.featureProfile === "rocket") {
    addRocketFinParticles(sampled);
  }

  return sampled;
}

function sampleModelEdges(
  geometries: THREE.BufferGeometry[],
  sampled: Float32Array,
  cursor: number,
  count: number,
) {
  const segments: Array<{
    a: THREE.Vector3;
    b: THREE.Vector3;
    end: number;
  }> = [];
  let totalLength = 0;

  geometries.forEach((geometry) => {
    const edges = new THREE.EdgesGeometry(geometry, 24);
    const position = edges.getAttribute("position") as THREE.BufferAttribute;

    for (let index = 0; index < position.count; index += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(position, index);
      const b = new THREE.Vector3().fromBufferAttribute(position, index + 1);
      const length = a.distanceTo(b);

      if (length > 0.000001) {
        totalLength += length;
        segments.push({ a, b, end: totalLength });
      }
    }

    edges.dispose();
  });

  if (segments.length === 0 || totalLength === 0) {
    return cursor;
  }

  for (let index = 0; index < count; index += 1) {
    const distance = pseudoRandom(index, 447) * totalLength;
    let low = 0;
    let high = segments.length - 1;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (segments[middle].end < distance) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    const segment = segments[low];
    const start = low === 0 ? 0 : segments[low - 1].end;
    const mix = (distance - start) / Math.max(segment.end - start, 0.000001);
    sampled[cursor * 3] = THREE.MathUtils.lerp(segment.a.x, segment.b.x, mix);
    sampled[cursor * 3 + 1] = THREE.MathUtils.lerp(
      segment.a.y,
      segment.b.y,
      mix,
    );
    sampled[cursor * 3 + 2] = THREE.MathUtils.lerp(
      segment.a.z,
      segment.b.z,
      mix,
    );
    cursor += 1;
  }

  return cursor;
}

function addRocketFinParticles(points: Float32Array) {
  const count = Math.floor(points.length / 3);
  const finCount = Math.floor(count * 0.04);
  const fins = [
    { x: 1.2, y: -0.68, z: 0.24 },
    { x: 1.2, y: 0.1, z: -0.24 },
    { x: 1.74, y: -0.56, z: 0.34 },
    { x: 1.74, y: 0.0, z: -0.34 },
  ];

  for (let index = 0; index < finCount; index += 1) {
    const pointIndex = count - finCount + index;
    const fin = fins[index % fins.length];
    const along = pseudoRandom(index, 503);
    const spread = pseudoRandom(index, 504);
    points[pointIndex * 3] = fin.x + along * 0.48;
    points[pointIndex * 3 + 1] = fin.y + (spread - 0.5) * 0.18;
    points[pointIndex * 3 + 2] = fin.z + (pseudoRandom(index, 505) - 0.5) * 0.16;
  }
}

function allocateSurfaceSamples(
  areas: number[],
  count: number,
  mainMeshIndex: number | null,
  mainShare: number,
  secondaryDistribution: "area" | "equal",
) {
  const weights = areas.map((area) => Math.pow(Math.max(area, 0.000001), 0.72));

  if (mainMeshIndex !== null && areas.length > 1) {
    const mainCount = Math.round(count * mainShare);
    const secondaryWeights = weights.map((weight, index) =>
      index === mainMeshIndex
        ? 0
        : secondaryDistribution === "equal"
          ? 1
          : weight,
    );
    const counts = distributeSamples(secondaryWeights, count - mainCount);
    counts[mainMeshIndex] = mainCount;
    return counts;
  }

  return distributeSamples(weights, count);
}

function distributeSamples(weights: number[], count: number) {
  const minimum = Math.min(12, Math.floor(count / Math.max(weights.length, 1)));
  const reserved = minimum * weights.length;
  const available = Math.max(0, count - reserved);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const exact = weights.map((weight) => (weight / totalWeight) * available);
  const counts = exact.map((value) => minimum + Math.floor(value));
  const remainder = count - counts.reduce((sum, value) => sum + value, 0);
  const fractionalOrder = exact
    .map((value, index) => ({ fraction: value - Math.floor(value), index }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let index = 0; index < remainder; index += 1) {
    counts[fractionalOrder[index % fractionalOrder.length].index] += 1;
  }

  return counts;
}

function getGeometrySurfaceArea(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const index = geometry.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let area = 0;
  const triangleCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3);

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const aIndex = index ? index.getX(offset) : offset;
    const bIndex = index ? index.getX(offset + 1) : offset + 1;
    const cIndex = index ? index.getX(offset + 2) : offset + 2;
    a.fromBufferAttribute(position, aIndex);
    b.fromBufferAttribute(position, bIndex);
    c.fromBufferAttribute(position, cIndex);
    area += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
  }

  return area;
}

function getLargestMeshIndex(meshes: THREE.Mesh<THREE.BufferGeometry>[]) {
  let largestIndex = 0;
  let largestCount = 0;

  meshes.forEach((mesh, index) => {
    const position = mesh.geometry.getAttribute("position");
    const count = position?.count ?? 0;

    if (count > largestCount) {
      largestCount = count;
      largestIndex = index;
    }
  });

  return largestIndex;
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
    const mirror = options.mirrorX ? -1 : 1;
    points[index] = (points[index] - center.x) * scale * mirror;
    points[index + 1] = (points[index + 1] - center.y) * scale;
    points[index + 2] = (points[index + 2] - center.z) * scale;
  }
}

function shapePoint(index: number, count: number, shape: number) {
  const t = index / count;
  const noise = pseudoRandom(index, shape + 1) - 0.5;
  const part = pseudoRandom(index, shape + 30);
  const role = getParticleSceneRole(shape);
  const isAtmosphere =
    pseudoRandom(index, shape + 130) > ambientParticleThreshold;
  const point =
    isAtmosphere
      ? ambientDustPoint(index, t, shape)
      : role === "rocket"
        ? rocketPoint(index, part)
        : role === "satellite"
          ? satellitePoint(index, part)
          : role === "earth"
            ? earthMapPoint(index, part)
            : role === "saturn"
              ? saturnPoint(index, part)
              : astronautPoint(index, part);

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

  if (part < 0.5) {
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

function saturnPoint(index: number, part: number) {
  if (getSaturnParticleRegion(part) === "planet") {
    const theta = pseudoRandom(index, 241) * Math.PI * 2;
    const cosPhi = pseudoRandom(index, 242) * 2 - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const shell = 0.94 + pseudoRandom(index, 243) * 0.08;

    return {
      x: Math.cos(theta) * sinPhi * 1.48 * shell,
      y: cosPhi * 1.34 * shell,
      z: Math.sin(theta) * sinPhi * 1.12 * shell,
    };
  }

  const rawAngle = pseudoRandom(index, 244) * Math.PI * 2;
  const angle = rawAngle + Math.sin(rawAngle * 3) * 0.055;
  const band = pseudoRandom(index, 245);
  const radius =
    band < 0.72
      ? 1.72 + pseudoRandom(index, 247) * 0.42
      : 2.34 + pseudoRandom(index, 248) * 0.3;
  const x = Math.cos(angle) * radius;
  const flatY = Math.sin(angle) * radius * 0.3;
  const depth = Math.sin(angle) * radius * 0.5;
  const tilted = rotatePoint(x, flatY, -0.2);

  return {
    x: tilted.x,
    y: tilted.y,
    z: depth + (pseudoRandom(index, 246) - 0.5) * 0.08,
  };
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
