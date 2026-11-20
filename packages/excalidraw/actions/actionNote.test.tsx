import { fireEvent } from "@testing-library/react";
import React from "react";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "../tests/helpers/api";
import { Keyboard } from "../tests/helpers/ui";
import { act, render } from "../tests/test-utils";

import { actionChangeNote } from "./actionProperties";

const { h } = window;

const noteInput = () =>
  document.querySelector<HTMLInputElement>(
    '[data-testid="element-note-input"]',
  );

const noteOf = () => h.elements[0].note;

/**
 * Renders an editor holding one restored element, already selected. Both the
 * element and the selection come from `initialData` on purpose: the element
 * must be in the store snapshot already (otherwise the first note write is
 * recorded as a creation, and undo deletes the element), and an undo restores
 * the appState recorded with the note write, which would drop a selection set
 * only after the first render.
 */
const renderWithElement = async (note = "") => {
  const element = {
    ...API.createElement({ type: "rectangle", x: 10, y: 10 }),
    note,
  };
  await render(
    <Excalidraw
      handleKeyboardGlobally={true}
      initialData={{
        elements: [element],
        appState: { selectedElementIds: { [element.id]: true } },
      }}
    />,
  );
  return element;
};

describe("actionChangeNote", () => {
  it("writes the note to the selected element only", async () => {
    const element = await renderWithElement();
    const other = {
      ...API.createElement({ type: "rectangle", x: 200 }),
      note: "",
    };
    act(() => {
      API.setElements([...h.elements, other]);
    });

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", "  ship it  ");
    });

    expect(API.getElement(element).note).toBe("ship it");
    expect(API.getElement(other).note).toBe("");
  });

  it("writes an emptied note as an empty string with its own undo entry", async () => {
    await renderWithElement();

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", "draft");
    });
    expect(noteOf()).toBe("draft");
    expect(API.getUndoStack().length).toBe(1);

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", "   ");
    });
    expect(noteOf()).toBe("");
    expect(API.getUndoStack().length).toBe(2);
  });

  it("records no history entry when the note is unchanged", async () => {
    await renderWithElement("stays");

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", "  stays ");
    });

    expect(noteOf()).toBe("stays");
    expect(API.getUndoStack().length).toBe(0);
  });
});

describe("editing a note from the styles panel", () => {
  it("shows the field only for a single selection", async () => {
    await renderWithElement();
    expect(noteInput()).not.toBeNull();

    API.clearSelection();
    expect(noteInput()).toBeNull();

    const second = {
      ...API.createElement({ type: "rectangle", x: 200 }),
      note: "",
    };
    const [first, other] = [h.elements[0], second];
    API.setElements([first, other]);
    API.setSelectedElements([
      first as NonDeletedExcalidrawElement,
      other as NonDeletedExcalidrawElement,
    ]);
    // two selected elements: no single note to show
    expect(noteInput()).toBeNull();
  });

  it("keeps keystrokes out of the element and commits one undo step on blur", async () => {
    await renderWithElement();
    const input = noteInput()!;

    fireEvent.change(input, { target: { value: "rev" } });
    fireEvent.change(input, { target: { value: "review" } });
    fireEvent.change(input, { target: { value: "review later" } });

    // typing is a draft: nothing is written and nothing is undoable yet
    expect(noteOf()).toBe("");
    expect(API.getUndoStack().length).toBe(0);

    fireEvent.blur(input);

    expect(noteOf()).toBe("review later");
    expect(API.getUndoStack().length).toBe(1);
  });

  it("commits once on Enter without a second entry on blur", async () => {
    await renderWithElement();
    const input = noteInput()!;

    fireEvent.change(input, { target: { value: "tag it" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(noteOf()).toBe("tag it");
    expect(API.getUndoStack().length).toBe(1);

    fireEvent.blur(input);
    expect(API.getUndoStack().length).toBe(1);
  });

  it("undo and redo restore the previous note", async () => {
    await renderWithElement();

    fireEvent.change(noteInput()!, { target: { value: "first" } });
    fireEvent.blur(noteInput()!);
    expect(noteOf()).toBe("first");

    fireEvent.change(noteInput()!, { target: { value: "second" } });
    fireEvent.blur(noteInput()!);
    expect(noteOf()).toBe("second");
    expect(API.getUndoStack().length).toBe(2);

    Keyboard.undo();
    expect(noteOf()).toBe("first");
    // the field shows the undone value, not the stale draft
    expect(noteInput()!.value).toBe("first");

    Keyboard.undo();
    expect(noteOf()).toBe("");
    expect(noteInput()!.value).toBe("");

    Keyboard.redo();
    expect(noteOf()).toBe("first");
    expect(noteInput()!.value).toBe("first");

    Keyboard.redo();
    expect(noteOf()).toBe("second");
    expect(noteInput()!.value).toBe("second");
  });
});
