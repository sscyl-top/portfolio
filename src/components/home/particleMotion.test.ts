import { describe, expect, it } from "vitest";

import {
  allocateSatelliteMeshSamples,
  findActivePanelIndex,
  getParticleSceneRole,
  getParticleStageX,
  getSaturnParticleRegion,
  getPointerInteraction,
} from "./particleMotion";

describe("getPointerInteraction", () => {
  it("keeps a visible but restrained idle repulsion near the cursor", () => {
    const interaction = getPointerInteraction(0, 1.6, 1, 0);

    expect(interaction.radial).toBeGreaterThanOrEqual(0.24);
    expect(interaction.radial).toBeLessThanOrEqual(0.3);
    expect(interaction.tangential).toBeGreaterThan(0);
  });

  it("adds wake and stronger flow while the cursor moves", () => {
    const idle = getPointerInteraction(0.45, 1.6, 1, 0);
    const moving = getPointerInteraction(0.45, 1.6, 1, 1);

    expect(moving.radial).toBeGreaterThan(idle.radial);
    expect(moving.tangential).toBeGreaterThan(idle.tangential);
    expect(moving.wake).toBeGreaterThan(0);
    expect(moving.radial).toBeLessThanOrEqual(0.48);
  });

  it("does not disturb particles outside the local radius", () => {
    expect(
      getPointerInteraction(1.61, 1.6, 1, 1),
    ).toEqual({ radial: 0, tangential: 0, wake: 0, proximity: 0 });
  });

  it("fades all interaction when the cursor leaves", () => {
    expect(
      getPointerInteraction(0, 1.6, 0, 1),
    ).toEqual({ radial: 0, tangential: 0, wake: 0, proximity: 0 });
  });
});

describe("findActivePanelIndex", () => {
  it("activates the incoming panel before it reaches the viewport center", () => {
    const activeIndex = findActivePanelIndex(
      [
        { top: -320, bottom: 680 },
        { top: 680, bottom: 1680 },
      ],
      1000,
    );

    expect(activeIndex).toBe(1);
  });
});

describe("particle scene sequence", () => {
  it("places Saturn before the final astronaut scene", () => {
    expect(getParticleSceneRole(3)).toBe("saturn");
    expect(getParticleSceneRole(4)).toBe("astronaut");
  });

  it("centers the final astronaut while preserving alternating earlier scenes", () => {
    expect(getParticleStageX(0, 4)).toBeCloseTo(1.72);
    expect(getParticleStageX(1, 4)).toBeCloseTo(-1.72);
    expect(getParticleStageX(3, 4)).toBeLessThan(-1.55);
    expect(getParticleStageX(4, 4)).toBeCloseTo(0);
  });

  it("reserves most Saturn particles for its identifying rings", () => {
    expect(getSaturnParticleRegion(0.37)).toBe("planet");
    expect(getSaturnParticleRegion(0.38)).toBe("ring");
    expect(getSaturnParticleRegion(0.9)).toBe("ring");
  });
});

describe("allocateSatelliteMeshSamples", () => {
  const satelliteMeshes = [
    { name: "Cylinder003", parentName: "Scene", area: 1.6152 },
    { name: "圆柱_3_3", parentName: "Scene", area: 0.6354 },
    { name: "Cube", parentName: "Scene", area: 0.4794 },
    { name: "立方体_1_2", parentName: "空白_1_3", area: 0.1399 },
    { name: "立方体", parentName: "空白_1_2", area: 0.1399 },
    { name: "立方体_1_2001", parentName: "空白_1_3001", area: 0.1399 },
    { name: "立方体001", parentName: "空白_1_2001", area: 0.1399 },
    { name: "管道_2", parentName: "空白001", area: 0.0748 },
    { name: "立方体_4", parentName: "空白_3", area: 0.07 },
    { name: "立方体_3", parentName: "空白_1_3", area: 0.07 },
    { name: "立方体_1", parentName: "空白_1_2", area: 0.07 },
    { name: "立方体_2", parentName: "空白_1_2", area: 0.07 },
    { name: "立方体_1001", parentName: "空白_1_2001", area: 0.07 },
    { name: "立方体_2001", parentName: "空白_1_2001", area: 0.07 },
    { name: "立方体_3001", parentName: "空白_1_3001", area: 0.07 },
    { name: "立方体_4001", parentName: "空白_3001", area: 0.07 },
    { name: "Cylinder", parentName: "Scene", area: 0.0659 },
    { name: "圆盘", parentName: "空白001", area: 0.0402 },
    { name: "Torus", parentName: "Scene", area: 0.0396 },
    { name: "Cylinder001", parentName: "Scene", area: 0.01 },
    { name: "Cylinder002", parentName: "Scene", area: 0.01 },
  ];

  it("keeps satellite body dominant while reserving readable panel and antenna points", () => {
    const counts = allocateSatelliteMeshSamples(satelliteMeshes, 9000);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const bodyCount = counts[0] + counts[1] + counts[2];
    const panelCount = counts
      .slice(3, 16)
      .reduce((sum, count) => sum + count, 0);
    const antennaCount = counts
      .slice(16)
      .reduce((sum, count) => sum + count, 0);

    expect(total).toBe(9000);
    expect(bodyCount / total).toBeGreaterThanOrEqual(0.45);
    expect(bodyCount / total).toBeLessThanOrEqual(0.6);
    expect(panelCount / total).toBeGreaterThanOrEqual(0.28);
    expect(antennaCount / total).toBeGreaterThanOrEqual(0.12);
  });

  it("falls back to weighted distribution when satellite mesh names are absent", () => {
    const counts = allocateSatelliteMeshSamples(
      [
        { name: "mesh-a", parentName: "root", area: 3 },
        { name: "mesh-b", parentName: "root", area: 1 },
      ],
      100,
    );

    expect(counts).toHaveLength(2);
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[0] + counts[1]).toBe(100);
  });
});
