import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getPublishedWorks } from "@/data/portfolio";
import { RepresentativeWorks } from "./RepresentativeWorks";

describe("RepresentativeWorks", () => {
  it("raises the hovered card to the foreground immediately", () => {
    const { container } = render(
      <RepresentativeWorks works={getPublishedWorks().slice(0, 7)} />,
    );
    const card = container.querySelector<HTMLElement>(
      ".representative-work-card",
    );

    expect(card).not.toBeNull();
    fireEvent.pointerEnter(card!);

    expect(card).toHaveStyle({ zIndex: "30" });
  });

  it("restores the foreground card layer immediately on pointer leave", () => {
    const { container } = render(
      <RepresentativeWorks works={getPublishedWorks().slice(0, 7)} />,
    );
    const card = container.querySelector<HTMLElement>(
      ".representative-work-card",
    );

    expect(card).not.toBeNull();
    fireEvent.pointerEnter(card!);
    expect(card).toHaveStyle({ zIndex: "30" });

    fireEvent.pointerLeave(card!.parentElement!);

    expect(card).toHaveStyle({ zIndex: "1" });
  });
});
