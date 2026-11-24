import { KEYS, matchKey } from "@excalidraw/common";

import { CaptureUpdateAction } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { messageCircleIcon } from "../components/icons";
import { getSelectedElements } from "../scene";

import { register } from "./register";

import type { AppState } from "../types";

/**
 * The note editor edits one element, so a multi-selection resolves to a single
 * target: the last selected element in scene order, which is the element the
 * other single-element actions already act on.
 */
export const getNoteDialogTargetElement = (
  elements: readonly ExcalidrawElement[],
  appState: Pick<AppState, "selectedElementIds">,
): ExcalidrawElement | null =>
  getSelectedElements(elements, appState).at(-1) ?? null;

/**
 * `formData` may name the element explicitly (the badge passes the element it
 * is drawn for); otherwise the primary selected element is the target.
 */
type ElementNoteData = { elementId?: ExcalidrawElement["id"] } | null;

export const actionElementNote = register<ElementNoteData>({
  name: "elementNote",
  label: (elements, appState) =>
    getNoteDialogTargetElement(elements, appState)?.note
      ? "elementNote.actionEdit"
      : "elementNote.action",
  icon: messageCircleIcon,
  perform: (elements, appState, data) => {
    const target = data?.elementId
      ? elements.find((element) => element.id === data.elementId) ?? null
      : getNoteDialogTargetElement(elements, appState);

    if (!target) {
      return false;
    }

    return {
      appState: {
        ...appState,
        openDialog: { name: "elementNote", elementId: target.id },
        openMenu: null,
        openPopup: null,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.altKey && matchKey(event, KEYS.N),
  predicate: (elements, appState) => {
    const target = getNoteDialogTargetElement(elements, appState);

    return (
      appState.openDialog?.name !== "elementNote" &&
      !!target &&
      !target.locked &&
      !appState.viewModeEnabled
    );
  },
  trackEvent: { category: "element", action: "editNote" },
});
