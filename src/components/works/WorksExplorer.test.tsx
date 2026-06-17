import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { getPublishedWorks } from "@/data/portfolio";
import { WorksExplorer } from "./WorksExplorer";

describe("WorksExplorer", () => {
  it("filters category cases without rendering an all category", async () => {
    const user = userEvent.setup();

    render(<WorksExplorer works={getPublishedWorks()} />);

    expect(screen.getByRole("link", { name: /AIGC Concept Lab/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "全部" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "品牌全案" }));

    expect(
      screen.queryByRole("link", { name: /AIGC Concept Lab/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /RJ Tech/i })).toHaveAttribute(
      "href",
      "/works/rj-tech-brand-system",
    );
  });
});
