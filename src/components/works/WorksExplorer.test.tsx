import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { categories, getPublishedWorks } from "@/data/portfolio";
import { WorksExplorer } from "./WorksExplorer";

describe("WorksExplorer", () => {
  it("renders category filters without an all filter", () => {
    render(<WorksExplorer works={getPublishedWorks()} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("全部作品");
    expect(screen.queryByRole("button", { name: "全部" })).not.toBeInTheDocument();

    for (const category of categories) {
      expect(screen.getByRole("button", { name: category })).toBeInTheDocument();
    }
  });

  it("filters cards by selected category", async () => {
    const user = userEvent.setup();
    render(<WorksExplorer works={getPublishedWorks()} />);

    expect(
      screen.getByRole("link", { name: /Hotelite Hospitality Identity/i }),
    ).toHaveAttribute("href", "/works/hotelite-hospitality-identity");
    expect(
      screen.queryByRole("link", { name: /RJ Tech Brand System/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: categories[1] }));

    expect(screen.getByRole("link", { name: /RJ Tech Brand System/i })).toHaveAttribute(
      "href",
      "/works/rj-tech-brand-system",
    );
    expect(
      screen.queryByRole("link", { name: /Hotelite Hospitality Identity/i }),
    ).not.toBeInTheDocument();
  });
});
