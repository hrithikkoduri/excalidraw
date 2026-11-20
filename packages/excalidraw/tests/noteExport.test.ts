import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { exportScene } from "../scene/export";

import { API } from "./helpers/api";

// the note must stay out of the drawing: it is data on the element, and the
// export path draws only through the static renderer, which knows nothing of
// it. Both the SVG and the canvas path are checked, since either can end up as
// the PNG the user saves.
const sceneWithNote = () => {
  const noted = {
    ...API.createElement({
      type: "rectangle",
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    }),
    note: "check the seal",
  } as NonDeletedExcalidrawElement;

  return {
    elements: [noted],
    appState: { viewBackgroundColor: "#ffffff" },
    files: null,
  };
};

describe("export leaves the note out of the drawing", () => {
  it("paints no note text into the exported SVG", async () => {
    const svg = await exportScene({ type: "svg", data: sceneWithNote() });

    expect(svg.textContent).not.toContain("check the seal");
  });

  it("paints no note text into the exported canvas", async () => {
    const canvas = await exportScene({ type: "canvas", data: sceneWithNote() });

    const textDraws = (canvas.getContext("2d") as any)
      .__getEvents()
      .filter(
        (event: any) =>
          event.type === "fillText" || event.type === "strokeText",
      )
      .map((event: any) => event.props.text);

    expect(textDraws).not.toContain("check the seal");
  });
});
