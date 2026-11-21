import {
  getTargetWindow,
  sceneCoordsToViewportCoords,
} from "@excalidraw/common";
import { getElementAbsoluteCoords } from "@excalidraw/element";

import {
  TOOLTIP_VISIBLE_CLASS,
  getTooltipDiv,
  hideDocumentTooltip,
  updateTooltipPosition,
} from "./Tooltip";

import type {
  ElementsMap,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type { AppState } from "../types";

/** ms before the note tooltip shows, matching the link tooltip's delay */
const NOTE_TOOLTIP_DELAY = 300;

/**
 * Identity token for the note tooltip, which is a module-level singleton
 * shared by every editor in the process: the owner tells it which editor the
 * shown tooltip belongs to, so one editor never hides another's.
 */
export type NoteTooltipOwner = Record<string, unknown>;

let owner: NoteTooltipOwner | null = null;
let ownerDocument: Document | null = null;
let ownerWindow: Window | null = null;
let timeoutId: number | null = null;
let isVisible = false;

/**
 * When the owning window loses focus, the pointer leaves it, or it is hidden,
 * no in-window pointer move will ever call `hideNoteTooltip`, so the owning
 * window itself drops the tooltip (same shape as the link tooltip's cleanup).
 */
const CLEANED_UP_WINDOWS = new WeakSet<Window>();

const registerWindowCleanup = (window: Window) => {
  if (CLEANED_UP_WINDOWS.has(window)) {
    return;
  }
  const dropIfOwned = () => {
    if (ownerWindow === window) {
      clear();
    }
  };
  window.addEventListener("blur", dropIfOwned);
  // relatedTarget is null only when the pointer left the window
  window.addEventListener("mouseout", (event) => {
    if (event.relatedTarget === null) {
      dropIfOwned();
    }
  });
  window.addEventListener("pagehide", dropIfOwned);
  CLEANED_UP_WINDOWS.add(window);
};

const clear = () => {
  if (timeoutId !== null) {
    ownerWindow?.clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (isVisible && ownerDocument) {
    isVisible = false;
    hideDocumentTooltip(ownerDocument);
  }
  owner = null;
  ownerDocument = null;
  ownerWindow = null;
};

const renderNoteTooltip = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
  elementsMap: ElementsMap,
  tooltipOwner: NoteTooltipOwner,
  tooltipDocument: Document,
) => {
  timeoutId = null;
  // ownership may have been cleared or taken over while the timer was pending
  if (owner !== tooltipOwner || !element.notes) {
    return;
  }

  const tooltipDiv = getTooltipDiv(tooltipDocument);
  tooltipDiv.classList.add(TOOLTIP_VISIBLE_CLASS);
  tooltipDiv.style.maxWidth = "20rem";
  tooltipDiv.textContent = element.notes;

  const [x1, y1, x2] = getElementAbsoluteCoords(element, elementsMap);
  const anchor = sceneCoordsToViewportCoords(
    { sceneX: x2, sceneY: y1 },
    appState,
  );

  updateTooltipPosition(
    tooltipDiv,
    { left: anchor.x, top: anchor.y, width: 0, height: 0 },
    "top",
  );

  isVisible = true;
};

/**
 * Shows the hovered element's note in a tooltip. A no-op when the element has
 * no note, so callers can call it for every hovered element.
 */
export const showNoteTooltip = (
  element: NonDeletedExcalidrawElement,
  appState: AppState,
  elementsMap: ElementsMap,
  tooltipDocument: Document,
  tooltipOwner: NoteTooltipOwner,
) => {
  const window = getTargetWindow(tooltipDocument);
  if (!window || !element.notes) {
    return;
  }

  // another editor's tooltip was showing: it no longer receives the pointer
  // events that would hide it, so take the singleton over
  if (owner && owner !== tooltipOwner) {
    clear();
  }

  owner = tooltipOwner;
  ownerDocument = tooltipDocument;
  ownerWindow = window;
  registerWindowCleanup(window);

  if (timeoutId !== null) {
    // same owner -> restart the timer, leaving a visible tooltip alone (this
    // runs on every pointer move over the element)
    window.clearTimeout(timeoutId);
  }

  timeoutId = window.setTimeout(
    () =>
      renderNoteTooltip(
        element,
        appState,
        elementsMap,
        tooltipOwner,
        tooltipDocument,
      ),
    NOTE_TOOLTIP_DELAY,
  );
};

export const hideNoteTooltip = (tooltipOwner?: NoteTooltipOwner) => {
  // another editor owns it -> not ours to hide
  if (owner && owner !== tooltipOwner) {
    return;
  }
  clear();
};
