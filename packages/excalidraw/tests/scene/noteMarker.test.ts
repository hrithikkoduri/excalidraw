import { RoughCanvas } from "roughjs/bin/canvas";

import { newElement } from "@excalidraw/element";

import type { RenderEnvironment } from "@excalidraw/element/renderEnvironment";

import type {
  ElementsMap,
  NonDeletedExcalidrawElement,
  NonDeletedSceneElementsMap,
} from "@excalidraw/element/types";

import { getDefaultAppState } from "../../appState";
import { renderStaticScene } from "../../renderer/staticScene";

import type { StaticCanvasAppState } from "../../types";
import type {
  RenderableElementsMap,
  StaticSceneRenderConfig,
} from "../../scene/types";

const renderEnvironment: RenderEnvironment = {
  createCanvas: () => document.createElement("canvas"),
  createImage: () => new Image(),
};

const appState = {
  ...getDefaultAppState(),
  width: 1000,
  height: 1000,
  offsetLeft: 0,
  offsetTop: 0,
} as StaticCanvasAppState;

const makeConfig = (
  elements: NonDeletedExcalidrawElement[],
  { isExporting }: { isExporting: boolean },
): StaticSceneRenderConfig => {
  const canvas = Object.assign(document.createElement("canvas"), {
    width: 1000,
    height: 1000,
  });
  const elementsMap = new Map(
    elements.map((element) => [element.id, element]),
  ) as unknown as ElementsMap;

  return {
    canvas,
    rc: new RoughCanvas(canvas),
    elementsMap: elementsMap as unknown as RenderableElementsMap,
    allElementsMap: elementsMap as unknown as NonDeletedSceneElementsMap,
    visibleElements: elements,
    scale: 1,
    appState,
    renderConfig: {
      canvasBackgroundColor: "",
      scale: 1,
      imageCache: new Map(),
      renderGrid: false,
      renderLinks: true,
      isExporting,
      embedsValidationStatus: new Map(),
      elementsPendingErasure: new Set(),
      pendingFlowchartNodes: null,
      theme: appState.theme,
      renderEnvironment,
    },
  };
};

/**
 * The marker is the only thing this scene draws in the selection colour: the
 * element's own strokes use its `strokeColor`. Reading the recorded draw
 * calls keeps the assertion independent of what the marker looks like.
 */
const MARKER_COLOR = "#6965db";
const drawsNoteMarker = (config: StaticSceneRenderConfig) =>
  (
    (config.canvas.getContext("2d") as any).__getEvents() as {
      type: string;
      props: { value?: string };
    }[]
  ).some(
    (event) =>
      event.type === "strokeStyle" && event.props.value === MARKER_COLOR,
  );

const rect = (notes?: string) =>
  newElement({
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    notes,
  }) as NonDeletedExcalidrawElement;

describe("note marker", () => {
  it("is drawn on the editor canvas for an element with a note", () => {
    const config = makeConfig([rect("Login flow splits into two screens.")], {
      isExporting: false,
    });
    renderStaticScene(config);
    expect(drawsNoteMarker(config)).toBe(true);
  });

  it("is not drawn for an element without a note", () => {
    const config = makeConfig([rect()], { isExporting: false });
    renderStaticScene(config);
    expect(drawsNoteMarker(config)).toBe(false);
  });

  it("is never drawn while exporting", () => {
    const config = makeConfig([rect("Login flow splits into two screens.")], {
      isExporting: true,
    });
    renderStaticScene(config);
    expect(drawsNoteMarker(config)).toBe(false);
  });
});
