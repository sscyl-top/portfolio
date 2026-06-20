import { describe, expect, it } from "vitest";

import { parseContactSubmission } from "./contact";

const baseSubmission = {
  name: "陈女士",
  email: "hr@example.com",
  company: "示例公司",
  subject: "品牌视觉设计师",
  range: "20k - 30k",
  message: "负责品牌视觉体系与营销物料设计。",
  note: "可尽快安排面试。",
  website: "",
};

describe("parseContactSubmission", () => {
  it("accepts and normalizes a hiring enquiry", () => {
    const result = parseContactSubmission({
      ...baseSubmission,
      type: "hiring",
      name: "  陈女士  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("陈女士");
      expect(result.data.type).toBe("hiring");
    }
  });

  it("accepts a commercial enquiry", () => {
    const result = parseContactSubmission({
      ...baseSubmission,
      type: "commercial",
      subject: "品牌升级",
      range: "5万 - 10万",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email and a missing required note", () => {
    const result = parseContactSubmission({
      ...baseSubmission,
      type: "hiring",
      email: "not-an-email",
      note: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.email).toBeDefined();
      expect(result.fieldErrors.note).toBeDefined();
    }
  });

  it("silently rejects honeypot submissions", () => {
    const result = parseContactSubmission({
      ...baseSubmission,
      type: "commercial",
      website: "https://spam.example",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.isSpam).toBe(true);
  });
});
