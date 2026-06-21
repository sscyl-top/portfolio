import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPublishedWorks } from "@/data/portfolio";

import { CompositeDesignWall } from "./CompositeDesignWall";

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

describe("CompositeDesignWall", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("links final contact CTAs to the matching resume contact cards", () => {
    render(<CompositeDesignWall works={getPublishedWorks()} />);

    expect(screen.getByRole("link", { name: /聘用联系/ })).toHaveAttribute(
      "href",
      "/resume#hiring-contact",
    );
    expect(screen.getByRole("link", { name: /商业咨询/ })).toHaveAttribute(
      "href",
      "/resume#commercial-contact",
    );
  });
});
