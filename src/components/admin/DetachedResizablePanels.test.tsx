import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetachedResizablePanels } from "./DetachedResizablePanels";

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
          contentRect: { width: 1500, height: 900 } as DOMRectReadOnly,
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
        return 1500;
      },
    });
  });

  it("keeps a primary page panel fixed when the sidebar width changes", async () => {
    localStorage.setItem("sidebar-width", "360");

    render(
      <DetachedResizablePanels
        panels={[
          {
            id: "sidebar",
            storageKey: "sidebar-width",
            anchor: "left",
            offset: 0,
            defaultWidth: 220,
            minWidth: 172,
            maxWidth: 420,
            children: <div data-testid="sidebar">Sidebar</div>,
          },
          {
            id: "content",
            storageKey: "content-width",
            anchor: "left",
            offset: 420,
            defaultWidth: 900,
            minWidth: 720,
            maxWidth: 1200,
            resizeEdge: "none",
            children: <div data-testid="content">Content</div>,
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sidebar").closest("section")).toHaveStyle({
        left: "0px",
        width: "360px",
      });
      expect(screen.getByTestId("content").closest("section")).toHaveStyle({
        left: "420px",
        width: "900px",
      });
    });
  });

  it("lets the tools panel grow without resizing the work content panel", async () => {
    localStorage.setItem("work-content-width", "900");
    localStorage.setItem("work-tools-width", "600");

    render(
      <DetachedResizablePanels
        panels={[
          {
            id: "content",
            storageKey: "work-content-width",
            anchor: "left",
            offset: 0,
            defaultWidth: 900,
            minWidth: 760,
            maxWidth: 1200,
            children: <div data-testid="work-content">Work content</div>,
          },
          {
            id: "tools",
            storageKey: "work-tools-width",
            anchor: "right",
            offset: 0,
            defaultWidth: 420,
            minWidth: 320,
            maxWidth: 620,
            resizeEdge: "left",
            children: <div data-testid="work-tools">Tools</div>,
          },
        ]}
        gap={18}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("work-content").closest("section")).toHaveStyle({
        left: "0px",
        width: "900px",
      });
      expect(screen.getByTestId("work-tools").closest("section")).toHaveStyle({
        left: "918px",
        width: "582px",
      });
    });
  });
});
