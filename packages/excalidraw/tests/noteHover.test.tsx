import React from "react";
import { vi } from "vitest";

import { HYPERLINK_TOOLTIP_DELAY } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { TOOLTIP_CLASS, TOOLTIP_VISIBLE_CLASS } from "../components/Tooltip";

import { API } from "./helpers/api";
import { Pointer } from "./helpers/ui";
import { act, render } from "./test-utils";

const getTooltip = () =>
  document.querySelector<HTMLDivElement>(`.${TOOLTIP_CLASS}`);

describe("hovering an element with a note", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the note, then drops it when the pointer leaves the element", async () => {
    const element = {
      ...API.createElement({ type: "rectangle", x: 10, y: 10 }),
      note: "check the seal",
    };
    await render(<Excalidraw initialData={{ elements: [element] }} />);
    // jsdom gives the editor no size, which culls every element
    API.setAppState({ width: 800, height: 600 });

    const mouse = new Pointer("mouse");
    act(() => {
      // on the element's left edge at scene (12, 60) with no scroll or zoom
      mouse.moveTo(12, 60);
      vi.advanceTimersByTime(HYPERLINK_TOOLTIP_DELAY + 1);
    });
    expect(getTooltip()).toHaveClass(TOOLTIP_VISIBLE_CLASS);
    expect(getTooltip()?.textContent).toBe("check the seal");

    act(() => {
      // well outside the element
      mouse.moveTo(700, 500);
    });
    expect(getTooltip()).not.toHaveClass(TOOLTIP_VISIBLE_CLASS);
  });
});
