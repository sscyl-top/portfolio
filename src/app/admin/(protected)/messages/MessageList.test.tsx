import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageList } from "./MessageList";

describe("MessageList", () => {
  it("renders the empty inbox state", () => {
    render(<MessageList messages={[]} />);
    expect(screen.getByText("暂无联系消息")).toBeInTheDocument();
  });
});
