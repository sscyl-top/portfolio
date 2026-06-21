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
    expect(screen.getByText("CTT522423")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "微信二维码" }),
    ).not.toBeInTheDocument();

    const hiringForm = screen.getByTestId("hiring-contact-form");
    expect(screen.getByTestId("hiring-contact-card")).toHaveAttribute(
      "id",
      "hiring-contact",
    );
    expect(within(hiringForm).getByLabelText("姓名")).not.toBeRequired();
    expect(within(hiringForm).getByLabelText("邮箱")).not.toBeRequired();
    expect(within(hiringForm).getByLabelText("岗位名称")).not.toBeRequired();
    expect(within(hiringForm).getByLabelText("薪资范围")).not.toBeRequired();
    expect(within(hiringForm).getByLabelText("岗位描述")).not.toBeRequired();
    expect(within(hiringForm).getByLabelText("备注")).not.toBeRequired();

    const commercialForm = screen.getByTestId("commercial-contact-form");
    expect(screen.getByTestId("commercial-contact-card")).toHaveAttribute(
      "id",
      "commercial-contact",
    );
    expect(within(commercialForm).getByLabelText("姓名")).not.toBeRequired();
    expect(within(commercialForm).getByLabelText("邮箱")).not.toBeRequired();
    expect(within(commercialForm).getByLabelText("项目类型")).not.toBeRequired();
    expect(within(commercialForm).getByLabelText("预算范围")).not.toBeRequired();
    expect(within(commercialForm).getByLabelText("项目需求")).not.toBeRequired();
    expect(within(commercialForm).getByLabelText("备注")).not.toBeRequired();

    expect(screen.getAllByText("发送消息")).toHaveLength(2);
    expect(screen.getByTestId("contact-marquee")).toHaveAttribute(
      "aria-label",
      "聊聊设计 · BRAND & AI · LET'S TALK ·",
    );
  });
});
