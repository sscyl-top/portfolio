import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetachedResizablePanels } from "./DetachedResizablePanels";

let mockContainerWidth = 900;

class MockResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: mockContainerWidth, height: 900 } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  disconnect() {}
  unobserve() {}
}

describe("DetachedResizablePanels", () => {
  beforeEach(() => {
    mockContainerWidth = 900;
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    });

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return mockContainerWidth;
      },
    });
  });

  it("shrinks left content before it can overlap right anchored tools", async () => {
    localStorage.setItem("work-content-width", "1100");
    localStorage.setItem("work-tools-width", "420");

    render(
      <DetachedResizablePanels
        panels={[
          {
            id: "content",
            storageKey: "work-content-width",
            anchor: "left",
            offset: 0,
            defaultWidth: 1100,
            minWidth: 420,
            maxWidth: 1420,
            children: <div data-testid="content">Content</div>,
          },
          {
            id: "tools",
            storageKey: "work-tools-width",
            anchor: "right",
            offset: 0,
            defaultWidth: 420,
            minWidth: 260,
            maxWidth: 620,
            resizeEdge: "left",
            children: <div data-testid="tools">Tools</div>,
          },
        ]}
        gap={18}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("content").closest("section")).toHaveStyle({
        left: "0px",
        width: "462px",
      });
      expect(screen.getByTestId("tools").closest("section")).toHaveStyle({
        left: "480px",
        width: "420px",
      });
    });
  });
});
