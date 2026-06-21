import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CapabilityBands } from "./CapabilityBands";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="particle-stage" />,
  useFrame: vi.fn(),
  useLoader: vi.fn(),
}));

describe("CapabilityBands", () => {
  it("links the final hiring CTA to the resume hiring contact card", () => {
    render(<CapabilityBands strengths={["品牌视觉"]} />);

    expect(screen.getByRole("link", { name: /聘用联系/ })).toHaveAttribute(
      "href",
      "/resume#hiring-contact",
    );
  });
});
