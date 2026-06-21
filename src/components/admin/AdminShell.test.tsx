import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminShell } from "./AdminShell";

describe("AdminShell", () => {
  it("shows every first-release module in Chinese", () => {
    render(
      <AdminShell userEmail="3624457672@qq.com">
        <p>内容</p>
      </AdminShell>,
    );

    for (const label of [
      "控制台",
      "作品",
      "分类与标签",
      "媒体库",
      "页面",
      "联系消息",
      "网站设置",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });
});
