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

  it("renders three floating media cards with opaque solid background (inline style)", () => {
    render(<HeroShowcase />);

    const cards = screen.getAllByTestId("hero-floating-media-card");

    expect(cards).toHaveLength(3);
    expect(
      cards.every(
        (card) =>
          !card.className.includes("grayscale") &&
          card.style.backgroundColor === "rgb(37, 37, 37)",
      ),
    ).toBe(true);
  });

  it("can render uploaded video media in a floating card", () => {
    render(
      <FloatingImageCard
        className="w-64"
        tone="warm"
        videoSrc="/home/sample-card.mp4"
      />,
    );

    const video = screen.getByTestId("hero-floating-media-video");

    expect(video).toHaveAttribute("src", "/home/sample-card.mp4");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
  });
});
