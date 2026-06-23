import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ResumePage from "./page";

describe("ResumePage education", () => {
  it("keeps campus experience and renders a six-card education grid", async () => {
    const ui = await ResumePage();
    render(ui);

    expect(screen.getByText("校园经历")).toBeInTheDocument();

    const grid = screen.getByTestId("education-achievement-grid");
    const cards = within(grid).getAllByTestId("education-achievement");

    expect(cards).toHaveLength(6);
    expect(cards[0]).toHaveTextContent("GPA");
    expect(cards[0]).toHaveTextContent("3.93");
    expect(cards[0]).toHaveTextContent("专业第一");
    expect(grid).not.toHaveTextContent("5+");
    expect(cards.every((card) => card.classList.contains("h-24"))).toBe(true);

    const educationSection = screen.getByTestId("education-section");
    const schoolSummary = within(educationSection).getByTestId(
      "education-school-summary",
    );

    expect(schoolSummary).toHaveTextContent(
      /BIJIE UNIVERSITY\s*毕节学院\s*Visual Communication Design\s*视觉传达设计专业/,
    );
    expect(
      within(educationSection).queryByRole("heading", {
        level: 2,
        name: "组织与实践",
      }),
    ).not.toBeInTheDocument();

    const activitiesSection = screen.getByTestId(
      "education-activities-section",
    );
    expect(
      within(activitiesSection).getByRole("heading", {
        level: 2,
        name: "组织与实践",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("交通银行校园大使")).toBeInTheDocument();
    expect(screen.getByText("毕业展主设计师")).toBeInTheDocument();
  });
});
