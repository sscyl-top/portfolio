import { describe, expect, it } from "vitest";

import {
  findActivePanelIndex,
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
