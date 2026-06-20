import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactFinale } from "./ContactFinale";

describe("ContactFinale", () => {
  it("renders contact details, two enquiry forms, and the marquee", () => {
    render(
      <ContactFinale
        email="3020714732@qq.com"
        phone="19276690901"
        location="广东-深圳"
      />,
    );

    expect(screen.getByText("3020714732@qq.com")).toBeInTheDocument();
    expect(screen.getByText("19276690901")).toBeInTheDocument();
    expect(screen.getByText("广东-深圳")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "微信二维码" })).toBeInTheDocument();

    const hiringForm = screen.getByTestId("hiring-contact-form");
    expect(within(hiringForm).getByLabelText("岗位名称")).toBeInTheDocument();
    expect(within(hiringForm).getByLabelText("薪资范围")).toBeInTheDocument();
    expect(within(hiringForm).getByLabelText("岗位描述 *")).toBeInTheDocument();
    expect(within(hiringForm).getByLabelText("备注 *")).toBeInTheDocument();

    const commercialForm = screen.getByTestId("commercial-contact-form");
    expect(within(commercialForm).getByLabelText("项目类型")).toBeInTheDocument();
    expect(within(commercialForm).getByLabelText("预算范围")).toBeInTheDocument();
    expect(within(commercialForm).getByLabelText("项目需求 *")).toBeInTheDocument();
    expect(within(commercialForm).getByLabelText("备注 *")).toBeInTheDocument();

    expect(screen.getAllByText("发送消息")).toHaveLength(2);
    expect(screen.getByTestId("contact-marquee")).toHaveAttribute(
      "aria-label",
      "聊聊设计 · BRAND & AI · LET'S TALK ·",
    );
  });
});
