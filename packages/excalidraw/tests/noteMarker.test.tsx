import React from "react";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { GlobalTestState, render } from "./test-utils";

const MARKER_RADIUS = 4;

/** the interactive canvas's "has a note" arcs, in scene coordinates */
const getNoteMarkers = () => {
  const context = GlobalTestState.interactiveCanvas.getContext("2d") as any;
  return context
    .__getEvents()
    .filter(
      (event: any) =>
        event.type === "arc" && event.props.radius === MARKER_RADIUS,
    )
    .map((event: any) => ({ x: event.props.x, y: event.props.y }));
};

const renderWith = async (note?: string) => {
  const element = { ...API.createElement({ type: "rectangle", x: 10, y: 10 }) };
  if (note !== undefined) {
    element.note = note;
  }
  await render(<Excalidraw initialData={{ elements: [element] }} />);
  // jsdom gives the editor no size, which culls every element
  API.setAppState({ width: 800, height: 600 });
  API.setElements([element]);
  return element as NonDeletedExcalidrawElement;
};

describe("note marker", () => {
  it("marks an element that has a note", async () => {
    await renderWith("check the seal");

    // the element's top-right corner, so it sits on the element it describes
    expect(getNoteMarkers()).toContainEqual({ x: 110, y: 10 });
  });

  it("marks nothing for an element with no note or an emptied one", async () => {
    const element = await renderWith("check the seal");
    expect(getNoteMarkers().length).toBeGreaterThan(0);

    (GlobalTestState.interactiveCanvas.getContext("2d") as any).__clearEvents();
    API.updateElement(element, { note: "" });

    expect(getNoteMarkers()).toEqual([]);
  });
});
