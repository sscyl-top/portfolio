import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FloatingImageCard, HeroShowcase } from "./HeroShowcase";

vi.mock("gsap", () => ({
  default: {
    context: (callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    },
    from: vi.fn(),
    to: vi.fn(),
  },
}));

vi.mock("@/components/home/AmbientParticles", () => ({
  AmbientParticles: () => <div data-testid="ambient-particles" />,
}));

describe("HeroShowcase", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("renders three floating media cards with tone gradient background", () => {
    render(<HeroShowcase />);

    const cards = screen.getAllByTestId("hero-floating-media-card");

    expect(cards).toHaveLength(3);
    // tone gradient replaces the old bg-neutral-800 solid background
    expect(cards.every((card) => card.className.includes("rounded-lg"))).toBe(true);
  });

  it("renders video with grayscale default and hover color", () => {
    render(
      <FloatingImageCard
        className="w-64"
        tone="warm"
        videoSrc="/home/sample-card.mp4"
      />,
    );

    const video = screen.getByTestId("hero-floating-media-video");

    expect(video).toHaveAttribute("src", "/home/sample-card.mp4");
    expect(video.className.includes("grayscale")).toBe(true);
    expect(video.className.includes("group-hover:grayscale-0")).toBe(true);
  });
});
