/* eslint-disable */
// Element notes: design prototype.
//
// Screens (location.hash): #panel (default), #canvas, #export.
// Everything is sample data with in-memory state; no network, no backend.
//
// The panel is assembled from the repository's own panel primitives and
// stylesheet classes (Island, the TextField markup + classes, TopPicks,
// RadioSelection, Range, Button, icons, i18n), so what you see is what the
// styles panel looks like. The Notes group itself does not exist in product
// code: this prototype is the thing being reviewed.
//
// The canvas and export screens draw through the real renderers
// (renderStaticScene for the editor view, exportScene for the export), so the
// export screen is literally the app's exported SVG.

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RoughCanvas } from "roughjs/bin/canvas";

import {
  arrayToMap,
  COLOR_PALETTE,
  sceneCoordsToViewportCoords,
  THEME,
} from "@excalidraw/common";

import {
  convertToExcalidrawElements,
  getCommonBounds,
  getElementAbsoluteCoords,
} from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { getLinkHandleFromCoords } from "@excalidraw/excalidraw/components/hyperlink/helpers";
import { Island } from "@excalidraw/excalidraw/components/Island";
import { Button } from "@excalidraw/excalidraw/components/Button";
import { Range } from "@excalidraw/excalidraw/components/Range";
import { TopPicks } from "@excalidraw/excalidraw/components/ColorPicker/TopPicks";
import { RadioSelection } from "@excalidraw/excalidraw/components/RadioSelection";
import {
  BringForwardIcon,
  BringToFrontIcon,
  DuplicateIcon,
  EllipseIcon,
  LinkIcon,
  RectangleIcon,
  SelectionIcon,
  SendBackwardIcon,
  SendToBackIcon,
  StrokeWidthBaseIcon,
  StrokeWidthBoldIcon,
  StrokeWidthExtraBoldIcon,
  TextIcon,
  TrashIcon,
  ArrowIcon,
} from "@excalidraw/excalidraw/components/icons";
import {
  TOOLTIP_VISIBLE_CLASS,
  getTooltipDiv,
  updateTooltipPosition,
} from "@excalidraw/excalidraw/components/Tooltip";
import { t } from "@excalidraw/excalidraw/i18n";
import { renderStaticScene } from "@excalidraw/excalidraw/renderer/staticScene";
import { exportScene } from "@excalidraw/excalidraw/scene/export";
import { getRenderEnvironment } from "@excalidraw/element/renderEnvironment";

import "@excalidraw/excalidraw/css/app.scss";
import "@excalidraw/excalidraw/css/styles.scss";
import "@excalidraw/excalidraw/fonts/fonts.css";
import "@excalidraw/excalidraw/components/Tooltip.scss";

import "./prototype.scss";

// ---------------------------------------------------------------------------
// sample data
// ---------------------------------------------------------------------------

const NOTE_LIMIT = 500;

const skeletons = [
  {
    type: "rectangle",
    id: "card-api",
    x: 40,
    y: 90,
    width: 210,
    height: 120,
    backgroundColor: "#a5d8ff",
    fillStyle: "solid",
    roundness: { type: 3 },
    label: { text: "API gateway", fontSize: 20 },
  },
  {
    type: "ellipse",
    id: "node-cache",
    x: 360,
    y: 80,
    width: 180,
    height: 140,
    backgroundColor: "#ffec99",
    fillStyle: "solid",
    label: { text: "Cache", fontSize: 20 },
  },
  {
    type: "diamond",
    id: "node-db",
    x: 110,
    y: 300,
    width: 170,
    height: 120,
    backgroundColor: "#b2f2bb",
    fillStyle: "solid",
    label: { text: "Primary DB", fontSize: 18 },
  },
  {
    type: "arrow",
    id: "arrow-api-cache",
    x: 250,
    y: 150,
    width: 110,
    height: 0,
    // arrow points are `Point` tuples, not `{ x, y }`
    points: [
      [0, 0],
      [110, 0],
    ],
  },
  {
    type: "text",
    id: "label-title",
    x: 40,
    y: 30,
    text: "Checkout service",
    fontSize: 24,
  },
] as const;

/** notes live outside the element type in this prototype: no product change */
const initialNotes: Record<string, string> = {
  "card-api":
    "Owned by Payments. Rolled out behind the checkout flag; rollback is a " +
    "single flag flip. Dashboards: latency p99, 5xx rate, and the gateway " +
    "queue depth. Page the payments on-call, not platform.",
  "node-cache": "Redis, evicted on write. Warm-up takes about 40 s.",
};

/** exactly at the limit, so the counter and border show the error state */
const LIMIT_NOTE = (() => {
  const base =
    "Deploy checklist: bump the gateway image tag, watch p99 for ten minutes, " +
    "then flip the payments.retry_v2 flag. If error rates go over one percent, " +
    "flip it back and page the payments on-call. The database migration is " +
    "additive and safe to leave in place: the new column is nullable and the " +
    "backfill runs in the background, so nothing on the read path changes. " +
    "Cache warm-up happens on the first write, so expect about forty seconds " +
    "of elevated latency right after the rollout. Keep an eye on the gateway " +
    "p99, the 5xx rate, the retry count and the cache hit ratio.";
  const filler = " Post the numbers in the release thread when done.";
  let note = base;
  while (note.length < NOTE_LIMIT) {
    note += filler;
  }
  return note.slice(0, NOTE_LIMIT);
})();

const buildElements = (): NonDeletedExcalidrawElement[] =>
  convertToExcalidrawElements(skeletons as any, {
    regenerateIds: false,
  }) as unknown as NonDeletedExcalidrawElement[];

// ---------------------------------------------------------------------------
// #panel: the styles panel with the new Notes group
// ---------------------------------------------------------------------------

const ColorField = ({
  colors,
  active,
  onChange,
  label,
}: {
  colors: readonly string[];
  active: string;
  onChange: (color: string) => void;
  label: string;
}) => (
  <fieldset>
    <legend>{label}</legend>
    <TopPicks
      theme={THEME.LIGHT}
      type="elementStroke"
      activeColor={active}
      onChange={onChange}
      topPicks={colors}
    />
  </fieldset>
);

const IconGroup = ({
  icons,
}: {
  icons: { label: string; icon: React.ReactNode }[];
}) => (
  <div className="buttonList">
    {icons.map(({ label, icon }) => (
      <Button key={label} onSelect={() => {}} title={label} aria-label={label}>
        <span className="ToolIcon__icon">{icon}</span>
      </Button>
    ))}
  </div>
);

/**
 * Multi-line variant of the panel's `TextField` (`components/TextField.tsx`):
 * the same markup and class names, with a textarea instead of an input, plus
 * the character counter the single-line control has no room for.
 */
const NotesField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const atLimit = value.length >= NOTE_LIMIT;

  return (
    <fieldset className={`notes-field${atLimit ? " notes-field--error" : ""}`}>
      <legend id="notes-legend">Notes</legend>
      <div className="ExcTextField ExcTextField--fullWidth">
        <div className="ExcTextField__input">
          <textarea
            aria-labelledby="notes-legend"
            aria-invalid={atLimit}
            className="notes-field__textarea"
            value={value}
            placeholder="Add a note for collaborators"
            maxLength={NOTE_LIMIT}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
          />
        </div>
      </div>
      <div className="notes-field__footer">
        <span className="notes-field__counter" aria-live="polite">
          {value.length}/{NOTE_LIMIT}
        </span>
        {atLimit && (
          <span className="notes-field__error">
            Limit reached, trim the note
          </span>
        )}
      </div>
    </fieldset>
  );
};

const PREVIEW_WIDTH = 250;
const PREVIEW_HEIGHT = 110;

/** the editor's selection frame: dashed outline + corner handles */
const SelectionFrame = () => (
  <div className="selection-frame" aria-hidden="true">
    <div className="selection-frame__outline" />
    {[
      "nw",
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
    ].map((handle) => (
      <div key={handle} className={`selection-frame__handle selection-frame__handle--${handle}`} />
    ))}
  </div>
);

/**
 * What the canvas shows while that panel is open: the selected element(s)
 * drawn through the real renderer, cropped to their bounds, under the
 * editor's selection frame.
 */
const SelectionPreview = ({
  selectedIds,
}: {
  selectedIds: readonly string[];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elements = useMemo(buildElements, []);
  const selectedElements = elements.filter((element) =>
    selectedIds.includes(element.id),
  );
  const single = selectedElements.length === 1;
  const [x1, y1, x2, y2] = getCommonBounds(selectedElements);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const scale = window.devicePixelRatio || 1;
    canvas.width = PREVIEW_WIDTH * scale;
    canvas.height = PREVIEW_HEIGHT * scale;
    canvas.style.width = `${PREVIEW_WIDTH}px`;
    canvas.style.height = `${PREVIEW_HEIGHT}px`;

    const elementsMap = arrayToMap(elements) as any;
    // fit the selected bounds into the preview, with room for the handles
    const zoom = Math.min(
      (PREVIEW_WIDTH - 56) / Math.max(x2 - x1, 1),
      (PREVIEW_HEIGHT - 40) / Math.max(y2 - y1, 1),
      1,
    );
    const appState = {
      ...getDefaultAppState(),
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      offsetLeft: 0,
      offsetTop: 0,
      scrollX: PREVIEW_WIDTH / 2 / zoom - (x1 + x2) / 2,
      scrollY: PREVIEW_HEIGHT / 2 / zoom - (y1 + y2) / 2,
      zoom: { value: zoom },
      shouldCacheIgnoreZoom: false,
    } as any;

    renderStaticScene({
      canvas,
      rc: new RoughCanvas(canvas),
      elementsMap,
      allElementsMap: elementsMap,
      visibleElements: selectedElements,
      scale,
      appState,
      renderConfig: {
        canvasBackgroundColor: "",
        scale,
        imageCache: new Map(),
        renderGrid: false,
        renderLinks: true,
        isExporting: false,
        embedsValidationStatus: new Map(),
        elementsPendingErasure: new Set(),
        pendingFlowchartNodes: null,
        theme: THEME.LIGHT,
        renderEnvironment: getRenderEnvironment(),
      },
    } as any);
  }, [elements, selectedElements, x1, y1, x2, y2]);

  return (
    <div className="prototype-preview">
      <canvas ref={canvasRef} />
      <SelectionFrame />
      <span className="prototype-preview__label">
        {single ? "1 selected" : `${selectedElements.length} selected`}
      </span>
    </div>
  );
};

const Panel = ({
  caption,
  selectedIds,
  selectedCount,
  note,
  onNoteChange,
  strokeColor,
  onStroke,
  background,
  onBackground,
  opacity,
  onOpacity,
  strokeWidth,
  onStrokeWidth,
  showNotes,
}: {
  caption: React.ReactNode;
  selectedIds: readonly string[];
  selectedCount: number;
  note: string;
  onNoteChange: (value: string) => void;
  strokeColor: string;
  onStroke: (color: string) => void;
  background: string;
  onBackground: (color: string) => void;
  opacity: number;
  onOpacity: (opacity: number) => void;
  strokeWidth: "thin" | "medium" | "bold";
  onStrokeWidth: (value: "thin" | "medium" | "bold") => void;
  showNotes: boolean;
}) => (
  <div className="prototype-panel-column">
    <div className="prototype-caption">{caption}</div>
    <SelectionPreview selectedIds={selectedIds} />
    <Island
      className="App-menu__left"
      padding={2}
      style={{ position: "relative", maxWidth: "12.5rem", width: "100%" }}
    >
      <div className="selected-shape-actions">
        <ColorField
          label={t("labels.stroke")}
          colors={[
            COLOR_PALETTE.black,
            COLOR_PALETTE.red[4],
            COLOR_PALETTE.green[4],
            COLOR_PALETTE.blue[4],
            COLOR_PALETTE.violet[4],
          ]}
          active={strokeColor}
          onChange={onStroke}
        />
        <ColorField
          label={t("labels.background")}
          colors={[
            "transparent",
            COLOR_PALETTE.blue[1],
            COLOR_PALETTE.green[1],
            COLOR_PALETTE.yellow[1],
            COLOR_PALETTE.violet[1],
          ]}
          active={background}
          onChange={onBackground}
        />
        <fieldset>
          <legend>{t("labels.strokeWidth")}</legend>
          <div className="buttonList">
            <RadioSelection
              group={`stroke-width-${selectedCount}`}
              value={strokeWidth}
              options={[
                {
                  value: "thin" as const,
                  text: t("labels.thin"),
                  icon: StrokeWidthBaseIcon,
                },
                {
                  value: "medium" as const,
                  text: t("labels.medium"),
                  icon: StrokeWidthBoldIcon,
                },
                {
                  value: "bold" as const,
                  text: t("labels.bold"),
                  icon: StrokeWidthExtraBoldIcon,
                },
              ]}
              onChange={onStrokeWidth}
            />
          </div>
        </fieldset>

        {showNotes && <NotesField value={note} onChange={onNoteChange} />}

        <Range label={t("labels.opacity")} value={opacity} onChange={onOpacity} />

        <fieldset>
          <legend>{t("labels.layers")}</legend>
          <IconGroup
            icons={[
              { label: t("labels.sendToBack"), icon: SendToBackIcon },
              { label: t("labels.sendBackward"), icon: SendBackwardIcon },
              { label: t("labels.bringForward"), icon: BringForwardIcon },
              { label: t("labels.bringToFront"), icon: BringToFrontIcon },
            ]}
          />
        </fieldset>

        <fieldset>
          <legend>{t("labels.actions")}</legend>
          <IconGroup
            icons={[
              { label: t("labels.duplicateSelection"), icon: DuplicateIcon },
              { label: t("labels.delete"), icon: TrashIcon },
              { label: "Link", icon: LinkIcon },
            ]}
          />
        </fieldset>
      </div>
    </Island>
  </div>
);

const PanelScreen = () => {
  const [emptyNote, setEmptyNote] = useState("");
  const [longNote, setLongNote] = useState(initialNotes["card-api"]);
  const [limitNote, setLimitNote] = useState(LIMIT_NOTE);
  const [stroke, setStroke] = useState<string>(COLOR_PALETTE.black);
  const [background, setBackground] = useState<string>(COLOR_PALETTE.blue[1]);
  const [opacity, setOpacity] = useState(100);
  const [strokeWidth, setStrokeWidth] = useState<"thin" | "medium" | "bold">(
    "thin",
  );

  return (
    <div className="prototype-panel-host">
      <div className="prototype-panel-column" style={{ width: "11rem" }}>
        <div className="prototype-caption">
          <strong>Editor chrome</strong>
          <br />
          Toolbar island and styles panel islands as the app renders them.
          Selecting a shape reveals the panel; the Notes group sits between
          stroke width and opacity.
        </div>
        <Island padding={1} style={{ display: "flex", gap: "0.25rem" }}>
          <span className="ToolIcon ToolIcon--plain" aria-hidden="true">
            <span className="ToolIcon__icon">{SelectionIcon}</span>
          </span>
          <span className="ToolIcon ToolIcon--plain" aria-hidden="true">
            <span className="ToolIcon__icon">{RectangleIcon}</span>
          </span>
          <span className="ToolIcon ToolIcon--plain" aria-hidden="true">
            <span className="ToolIcon__icon">{EllipseIcon}</span>
          </span>
          <span className="ToolIcon ToolIcon--plain" aria-hidden="true">
            <span className="ToolIcon__icon">{ArrowIcon}</span>
          </span>
          <span className="ToolIcon ToolIcon--plain" aria-hidden="true">
            <span className="ToolIcon__icon">{TextIcon}</span>
          </span>
        </Island>
      </div>

      <Panel
        caption={
          <>
            <strong>1 selected: rectangle, empty note</strong>
            <br />
            Placeholder text, counter at 0/500.
          </>
        }
        selectedIds={["card-api"]}
        selectedCount={1}
        note={emptyNote}
        onNoteChange={setEmptyNote}
        strokeColor={stroke}
        onStroke={setStroke}
        background={background}
        onBackground={setBackground}
        opacity={opacity}
        onOpacity={setOpacity}
        strokeWidth={strokeWidth}
        onStrokeWidth={setStrokeWidth}
        showNotes
      />

      <Panel
        caption={
          <>
            <strong>1 selected: rectangle, note typed</strong>
            <br />
            Counter turns into the error state once the text passes 500
            characters (type to see it: the limit is enforced live).
          </>
        }
        selectedIds={["card-api"]}
        selectedCount={1}
        note={longNote}
        onNoteChange={setLongNote}
        strokeColor={stroke}
        onStroke={setStroke}
        background={background}
        onBackground={setBackground}
        opacity={opacity}
        onOpacity={setOpacity}
        strokeWidth={strokeWidth}
        onStrokeWidth={setStrokeWidth}
        showNotes
      />

      <Panel
        caption={
          <>
            <strong>1 selected: note at the 500 character limit</strong>
            <br />
            Counter and border turn red, and the error message replaces the
            hint. Typing is capped, so the field cannot overflow.
          </>
        }
        selectedIds={["card-api"]}
        selectedCount={1}
        note={limitNote}
        onNoteChange={setLimitNote}
        strokeColor={stroke}
        onStroke={setStroke}
        background={background}
        onBackground={setBackground}
        opacity={opacity}
        onOpacity={setOpacity}
        strokeWidth={strokeWidth}
        onStrokeWidth={setStrokeWidth}
        showNotes
      />

      <Panel
        caption={
          <>
            <strong>2 selected: rectangle and ellipse</strong>
            <br />
            No Notes group: the field is gated on exactly one selected element
            (<code>notes: singleSelected</code>).
          </>
        }
        selectedIds={["card-api", "node-cache"]}
        selectedCount={2}
        note=""
        onNoteChange={() => {}}
        strokeColor={stroke}
        onStroke={setStroke}
        background="transparent"
        onBackground={setBackground}
        opacity={opacity}
        onOpacity={setOpacity}
        strokeWidth={strokeWidth}
        onStrokeWidth={setStrokeWidth}
        showNotes={false}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// shared canvas plumbing
// ---------------------------------------------------------------------------

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 570;

const makeAppState = (zoom = 1) => {
  const defaults = getDefaultAppState();
  const [x1, y1, x2, y2] = getCommonBounds(buildElements());
  // center the sample scene in the canvas box
  const sceneWidth = x2 - x1;
  const sceneHeight = y2 - y1;
  return {
    ...defaults,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    offsetLeft: 0,
    offsetTop: 0,
    scrollX: CANVAS_WIDTH / 2 / zoom - (x1 + sceneWidth / 2),
    scrollY: CANVAS_HEIGHT / 2 / zoom - (y1 + sceneHeight / 2),
    zoom: { value: zoom },
    shouldCacheIgnoreZoom: false,
    theme: THEME.LIGHT,
    selectedElementIds: {},
    viewBackgroundColor: "#ffffff",
  } as any;
};

const useSceneRenderer = ({
  canvasRef,
  zoom,
  isExporting,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  zoom: number;
  isExporting: boolean;
}) => {
  const elements = useMemo(buildElements, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const scale = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const elementsMap = arrayToMap(elements) as any;
    renderStaticScene({
      canvas,
      rc: new RoughCanvas(canvas),
      elementsMap,
      allElementsMap: elementsMap,
      visibleElements: elements,
      scale,
      appState: makeAppState(zoom),
      renderConfig: {
        canvasBackgroundColor: "",
        scale,
        imageCache: new Map(),
        renderGrid: false,
        renderLinks: true,
        isExporting,
        embedsValidationStatus: new Map(),
        elementsPendingErasure: new Set(),
        pendingFlowchartNodes: null,
        theme: THEME.LIGHT,
        renderEnvironment: getRenderEnvironment(),
      },
    } as any);
  }, [elements, zoom, isExporting, canvasRef]);

  return { elements, appState: makeAppState(zoom) };
};

const noteIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 4.5h14a1 1 0 0 1 1 1V21l-3.5-2.5L13 21l-3.5-2.5L6 21V5.5a1 1 0 0 1 1-1Z"
      fill="currentColor"
      opacity="0.95"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// #canvas: editor view with the notes markers and the hover tooltip
// ---------------------------------------------------------------------------

const CanvasScreen = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [notes] = useState(initialNotes);
  const [tooltipId, setTooltipId] = useState<string | null>("card-api");

  const { elements } = useSceneRenderer({
    canvasRef,
    zoom,
    isExporting: false,
  });

  const appState = makeAppState(zoom);
  const elementsMap = arrayToMap(elements) as any;

  // the marker's anchor is computed exactly as `renderLinkIcon` does it: the
  // link handle from the element bounds, in viewport coordinates
  const markers = elements
    .filter((element) => notes[element.id])
    .map((element) => {
      const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);
      const [handleX, handleY, handleWidth] = getLinkHandleFromCoords(
        [x1, y1, x2, y2],
        element.angle,
        appState,
      );
      const { x, y } = sceneCoordsToViewportCoords(
        { sceneX: handleX, sceneY: handleY },
        appState,
      );
      return {
        element,
        left: x,
        top: y,
        size: Math.max(handleWidth * zoom, 14),
        note: notes[element.id],
      };
    });

  // hover tooltip through the app's own tooltip machinery. Measured inside the
  // effect so it uses the frame's real position, and re-run on resize.
  useEffect(() => {
    const tooltipDiv = getTooltipDiv(document);
    const place = () => {
      const anchor = markers.find((marker) => marker.element.id === tooltipId);
      const frameRect = frameRef.current?.getBoundingClientRect();
      if (!anchor || !frameRect) {
        tooltipDiv.classList.remove(TOOLTIP_VISIBLE_CLASS);
        return;
      }
      tooltipDiv.classList.add(
        TOOLTIP_VISIBLE_CLASS,
        "prototype-notes-tooltip",
      );
      tooltipDiv.textContent = anchor.note;
      updateTooltipPosition(
        tooltipDiv,
        {
          left: frameRect.left + anchor.left,
          top: frameRect.top + anchor.top,
          width: anchor.size,
          height: anchor.size,
        },
        "top",
      );
    };

    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      tooltipDiv.classList.remove(TOOLTIP_VISIBLE_CLASS);
    };
  }, [markers, tooltipId]);

  return (
    <div className="prototype-canvas-frame" ref={frameRef} style={{ flex: "0 0 auto" }}>
      <canvas ref={canvasRef} />
      {markers.map((marker) => (
        <div
          key={marker.element.id}
          className={`notes-marker${
            marker.element.id === tooltipId ? " notes-marker--hovered" : ""
          }`}
          style={{ left: marker.left, top: marker.top }}
          onMouseEnter={() => setTooltipId(marker.element.id)}
          onFocus={() => setTooltipId(marker.element.id)}
          tabIndex={0}
          role="note"
          aria-label={`Note: ${marker.note}`}
        >
          {noteIcon}
        </div>
      ))}
      <div className="prototype-canvas-zoom">
        <label htmlFor="zoom">Zoom</label>
        <input
          id="zoom"
          type="range"
          min={0.6}
          max={1.4}
          step={0.1}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// #export: the same scene through the real export path
// ---------------------------------------------------------------------------

const ExportScreen = () => {
  const elements = useMemo(buildElements, []);
  const svgHostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    exportScene({
      type: "svg",
      data: { elements },
    } as any)
      .then((svg: SVGSVGElement) => {
        if (cancelled || !svgHostRef.current) {
          return;
        }
        svg.style.width = "100%";
        svg.style.height = "auto";
        svgHostRef.current.replaceChildren(svg);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setError(error.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [elements]);

  return (
    <div className="prototype-stage">
      <div
        className="prototype-canvas-frame"
        style={{ flex: "0 0 auto", padding: "0.5rem", width: "660px" }}
      >
        <div ref={svgHostRef} />
        {error && <div className="prototype-caption">Export failed: {error}</div>}
      </div>
      <div className="prototype-export-caption">
        <h2>Same scene, exported</h2>
        <p>
          This is <code>{'exportScene({ type: "svg" })'}</code>, the app's own
          export path, run on the same elements as the canvas screen.
        </p>
        <ul>
          <li>
            <strong>No notes markers.</strong> The marker is editor decoration,
            drawn beside the hyperlink icon under{" "}
            <code>if (!isExporting &amp;&amp; …)</code> in{" "}
            <code>renderer/staticScene.ts</code>; the SVG path has no
            decoration branch at all.
          </li>
          <li>
            <strong>No tooltip.</strong> The tooltip is a fixed-position DOM
            node outside the canvas, never part of a render.
          </li>
          <li>
            <strong>Notes still travel with the file.</strong> The note is an
            element property, so it survives save/load; it just is not painted.
          </li>
        </ul>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// shell
// ---------------------------------------------------------------------------

const SCREENS = [
  { key: "panel", title: "Styles panel with the Notes group" },
  { key: "canvas", title: "Editor canvas with notes markers" },
  { key: "export", title: "The same scene, exported" },
] as const;

type ScreenKey = (typeof SCREENS)[number]["key"];

const readHash = (): ScreenKey => {
  const key = window.location.hash.replace(/^#/, "") as ScreenKey;
  return SCREENS.some((screen) => screen.key === key) ? key : "panel";
};

const App = () => {
  const [screen, setScreen] = useState<ScreenKey>(readHash);

  useEffect(() => {
    const onHashChange = () => setScreen(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const active = SCREENS.find((entry) => entry.key === screen)!;

  return (
    <div className="excalidraw prototype-app" data-theme="light">
      <header className="prototype-header">
        <span className="prototype-header__title">
          Element notes · {active.title}
        </span>
        <nav>
          {SCREENS.map((entry) => (
            <a
              key={entry.key}
              href={`#${entry.key}`}
              className={entry.key === screen ? "active" : ""}
            >
              #{entry.key}
            </a>
          ))}
        </nav>
        <span className="prototype-header__hint">
          static prototype · sample data · no product code
        </span>
      </header>
      {screen === "panel" && <PanelScreen />}
      {screen === "canvas" && (
        <div className="prototype-stage">
          <CanvasScreen />
          <div className="prototype-export-caption">
            <h2>Editor view</h2>
            <p>
              Two shapes carry a note. The marker sits at the element's top-right
              corner, where the hyperlink icon goes, and keeps its screen size at
              every zoom (drag the zoom slider).
            </p>
            <p>
              Hover a marker for the tooltip, which truncates to two lines. Here
              it is open for the API gateway.
            </p>
          </div>
        </div>
      )}
      {screen === "export" && <ExportScreen />}
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
