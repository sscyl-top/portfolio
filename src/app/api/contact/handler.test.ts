import { describe, expect, it, vi } from "vitest";

import { createContactHandler } from "./handler";

const payload = {
  type: "hiring",
  name: "陈女士",
  email: "hr@example.com",
  company: "示例公司",
  subject: "品牌视觉设计师",
  range: "20k - 30k",
  message: "负责品牌视觉体系与营销物料设计。",
  note: "可尽快安排面试。",
  website: "",
};

function createDependencies() {
  return {
    hashIp: vi.fn().mockResolvedValue("ip-hash"),
    countRecent: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue({ id: "message-1" }),
    notify: vi.fn().mockResolvedValue(undefined),
    markNotification: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createContactHandler", () => {
  it("stores a valid submission and sends a notification", async () => {
    const dependencies = createDependencies();
    const handler = createContactHandler(dependencies);
    const response = await handler(
      new Request("http://localhost/api/contact", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    expect(dependencies.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hiring", email: "hr@example.com" }),
      "ip-hash",
    );
    expect(dependencies.notify).toHaveBeenCalledOnce();
    expect(dependencies.markNotification).toHaveBeenCalledWith(
      "message-1",
      true,
    );
  });

  it("keeps the stored message when email notification fails", async () => {
    const dependencies = createDependencies();
    dependencies.notify.mockRejectedValue(new Error("mail unavailable"));
    const handler = createContactHandler(dependencies);
    const response = await handler(
      new Request("http://localhost/api/contact", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(201);
    expect(dependencies.markNotification).toHaveBeenCalledWith(
      "message-1",
      false,
      "mail unavailable",
    );
  });

  it("rate limits repeated submissions from the same source", async () => {
    const dependencies = createDependencies();
    dependencies.countRecent.mockResolvedValue(3);
    const handler = createContactHandler(dependencies);
    const response = await handler(
      new Request("http://localhost/api/contact", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(429);
    expect(dependencies.save).not.toHaveBeenCalled();
  });
});
