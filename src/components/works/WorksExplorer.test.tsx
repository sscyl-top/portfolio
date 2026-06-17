import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { categories, getPublishedWorks } from "@/data/portfolio";
import { WorksExplorer } from "./WorksExplorer";

describe("WorksExplorer", () => {
  it("renders category groups without an all filter", () => {
    render(<WorksExplorer works={getPublishedWorks()} />);

    expect(screen.getByRole("heading", { name: "全部作品" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "全部" })).not.toBeInTheDocument();

    for (const category of categories) {
      const heading = screen.getByRole("heading", { name: category });
      const group = heading.closest("section");

      expect(group).not.toBeNull();
      expect(within(group as HTMLElement).getAllByRole("link")).toHaveLength(4);
    }
  });

  it("keeps category cards linked to work details", () => {
    render(<WorksExplorer works={getPublishedWorks()} />);

    expect(screen.getAllByRole("link", { name: /RJ Tech Brand System/i })[0]).toHaveAttribute(
      "href",
      "/works/rj-tech-brand-system",
    );
  });
});
