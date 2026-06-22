import { describe, expect, it } from "vitest";

import {
  categories,
  getCompositeWorks,
  getFeaturedWorks,
  getPublishedWorks,
  getWorkBySlug,
  resume,
  siteSettings,
} from "./portfolio";

describe("portfolio data", () => {
  it("exposes published works ordered by priority", () => {
    const works = getPublishedWorks();

    expect(works.length).toBeGreaterThanOrEqual(9);
    expect(works.every((work) => work.status === "published")).toBe(true);
    expect(works[0].slug).toBe("rj-tech-brand-system");
  });

  it("uses the clarified all-works navigation and PPT category order", () => {
    expect(siteSettings.navigation.map((item) => item.label)).toEqual([
      "首页",
      "全部作品",
      "简历",
    ]);
    expect(categories).toEqual([
      "视觉设计",
      "品牌全案",
      "概念设计",
      "AI漫剧",
      "TVC广告",
      "包装设计",
      "电商设计",
      "早期设计",
      "工作案例",
    ]);
    expect(categories).not.toContain("全部");
  });

  it("exposes seven representative works before category sections", () => {
    expect(getFeaturedWorks()).toHaveLength(7);
    expect(getFeaturedWorks().map((work) => work.slug)).toEqual([
      "rj-tech-brand-system",
      "tecloman-energy-visuals",
      "hotelite-hospitality-identity",
      "kukaski-interface-design",
      "aigc-concept-lab",
      "packaging-engineering",
      "clubbuy-campaign-system",
    ]);
  });

  it("keeps composite design as a dedicated final section", () => {
    expect(getCompositeWorks().map((work) => work.category)).toEqual([
      "复合设计",
      "复合设计",
      "复合设计",
    ]);
  });

  it("finds a work by slug and includes structured content blocks", () => {
    const work = getWorkBySlug("aigc-concept-lab");

    expect(work?.title).toContain("AIGC");
    expect(work?.blocks.some((block) => block.type === "beforeAfter")).toBe(
      true,
    );
  });

  it("keeps resume contact aligned with the provided resume", () => {
    expect(resume.positioning).toContain("求职面试");
    expect(resume.contact.email).toBe("3020714732@qq.com");
    expect(resume.contact.phone).toBe("19276690901");
  });

  it("exposes the complete education achievements and activities", () => {
    expect(resume.education.achievements).toHaveLength(6);
    expect(resume.education.achievements[0]).toMatchObject({
      label: "GPA",
      value: "3.93",
      detail: "专业第一",
    });
    expect(
      resume.education.achievements.some((item) => item.value === "5+"),
    ).toBe(false);
    expect(resume.education.activities).toHaveLength(4);
    expect(resume.education.activities[0].title).toBe("交通银行校园大使");
  });
});
