import React from "react";

import { KEYS } from "@excalidraw/common";

import { Excalidraw } from "../index";
import {
  actionElementNote,
  getNoteDialogTargetElement,
} from "../actions/actionElementNote";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, fireEvent, render, screen, unmountComponent } from "./test-utils";

const { h } = window;

unmountComponent();

const openNoteDialog = (elementId: string) => {
  API.setAppState({ openDialog: { name: "elementNote", elementId } });
};

const getTextarea = () =>
  document.querySelector(
    ".ElementNoteDialog__textarea",
  ) as HTMLTextAreaElement | null;

const clickButton = (label: string) => {
  const button = screen
    .getAllByRole("button")
    .find((candidate) => candidate.textContent === label);
  if (!button) {
    throw new Error(`button "${label}" not found`);
  }
  fireEvent.click(button);
};

describe("element note dialog", () => {
  beforeEach(async () => {
    localStorage.clear();
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  afterEach(() => {
    unmountComponent();
  });

  it("saves a typed note onto the element", async () => {
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    act(() => {
      API.executeAction(actionElementNote);
    });
    expect(h.state.openDialog).toEqual({
      name: "elementNote",
      elementId: rectangle.id,
    });

    const textarea = getTextarea()!;
    expect(textarea.value).toBe("");
    fireEvent.change(textarea, { target: { value: "why this box exists" } });
    clickButton("Save");

    expect(API.getElement(rectangle).note).toBe("why this box exists");
    expect(h.state.openDialog).toBeNull();
  });

  it("leaves the element untouched on Cancel and on Escape", async () => {
    const rectangle = API.createElement({
      type: "rectangle",
      note: "original",
    });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    openNoteDialog(rectangle.id);
    fireEvent.change(getTextarea()!, { target: { value: "changed" } });
    clickButton("Cancel");

    expect(API.getElement(rectangle).note).toBe("original");
    expect(h.state.openDialog).toBeNull();

    openNoteDialog(rectangle.id);
    fireEvent.change(getTextarea()!, { target: { value: "changed again" } });
    // Dialog closes on Escape through Modal's own key handler.
    fireEvent.keyDown(getTextarea()!, { key: KEYS.ESCAPE });

    expect(API.getElement(rectangle).note).toBe("original");
    expect(h.state.openDialog).toBeNull();
  });

  it("removes the note and bumps the element version on Delete note", async () => {
    const rectangle = API.createElement({
      type: "rectangle",
      note: "original",
    });
    API.setElements([rectangle]);
    const { version } = API.getElement(rectangle);

    openNoteDialog(rectangle.id);
    clickButton("Delete note");

    const updated = API.getElement(rectangle);
    expect(updated).not.toHaveProperty("note");
    expect(updated.version).toBe(version + 1);
    expect(h.state.openDialog).toBeNull();
  });

  it("clears the note when the text is emptied and saved", async () => {
    const rectangle = API.createElement({
      type: "rectangle",
      note: "original",
    });
    API.setElements([rectangle]);

    openNoteDialog(rectangle.id);
    fireEvent.change(getTextarea()!, { target: { value: "" } });
    clickButton("Save");

    expect(API.getElement(rectangle)).not.toHaveProperty("note");
    expect(h.state.openDialog).toBeNull();
  });

  it("focuses the note field with the caret at the end", async () => {
    const rectangle = API.createElement({ type: "rectangle", note: "abc" });
    API.setElements([rectangle]);

    openNoteDialog(rectangle.id);
    // the dialog renders once its portal container exists
    await new Promise((resolve) => setTimeout(resolve, 50));

    const textarea = getTextarea()!;
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(3);
  });

  it("opens from the keyboard shortcut and from the command palette", async () => {
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    Keyboard.withModifierKeys({ ctrl: true, alt: true }, () => {
      Keyboard.keyPress(KEYS.N);
    });

    expect(h.state.openDialog).toEqual({
      name: "elementNote",
      elementId: rectangle.id,
    });

    // the action predicate keeps the menu and the palette entry hidden while
    // the dialog is open, and shows it again once it closes
    expect(actionElementNote.predicate!(h.elements, h.state as any)).toBe(
      false,
    );

    API.setAppState({ openDialog: null });

    expect(actionElementNote.predicate!(h.elements, h.state as any)).toBe(true);
  });

  it("does not offer Delete note when the element has none", async () => {
    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);

    openNoteDialog(rectangle.id);

    expect(getTextarea()).not.toBeNull();
    expect(
      screen
        .getAllByRole("button")
        .some((candidate) => candidate.textContent === "Delete note"),
    ).toBe(false);
  });
});

describe("getNoteDialogTargetElement", () => {
  it("targets the last selected element for a multi-selection", () => {
    const first = API.createElement({ type: "rectangle", x: 0 });
    const second = API.createElement({ type: "rectangle", x: 200 });

    expect(
      getNoteDialogTargetElement([first, second], {
        selectedElementIds: { [first.id]: true, [second.id]: true },
      })?.id,
    ).toBe(second.id);

    expect(
      getNoteDialogTargetElement([first, second], { selectedElementIds: {} }),
    ).toBeNull();
  });
});
