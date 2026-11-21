import { fireEvent } from "@testing-library/react";
import React from "react";

import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

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

/**
 * Renders two elements with the first selected. `selectedIds` seeds the
 * selection through initialData for the same reason as above.
 */
const renderWithTwo = async () => {
  const first = {
    ...API.createElement({ type: "rectangle", x: 10, y: 10 }),
    note: "",
  };
  const second = {
    ...API.createElement({ type: "rectangle", x: 200, y: 10 }),
    note: "",
  };
  await render(
    <Excalidraw
      handleKeyboardGlobally={true}
      initialData={{
        elements: [first, second],
        appState: { selectedElementIds: { [first.id]: true } },
      }}
    />,
  );
  return { first, second };
};

describe("actionChangeNote", () => {
  it("writes the note to the addressed element only", async () => {
    const element = await renderWithElement();
    const other = {
      ...API.createElement({ type: "rectangle", x: 200 }),
      note: "",
    };
    act(() => {
      API.setElements([...h.elements, other]);
    });

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", {
        id: element.id,
        note: "  ship it  ",
      });
    });

    expect(API.getElement(element).note).toBe("ship it");
    expect(API.getElement(other).note).toBe("");
  });

  it("writes an emptied note as an empty string with its own undo entry", async () => {
    const element = await renderWithElement();

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", {
        id: element.id,
        note: "draft",
      });
    });
    expect(noteOf()).toBe("draft");
    expect(API.getUndoStack().length).toBe(1);

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", {
        id: element.id,
        note: "   ",
      });
    });
    expect(noteOf()).toBe("");
    expect(API.getUndoStack().length).toBe(2);
  });

  it("records no history entry when the note is unchanged", async () => {
    const element = await renderWithElement("stays");

    act(() => {
      h.app.actionManager.executeAction(actionChangeNote, "api", {
        id: element.id,
        note: "  stays ",
      });
    });

    expect(noteOf()).toBe("stays");
    expect(API.getUndoStack().length).toBe(0);
  });
});

describe("a pending draft follows the element it was typed for", () => {
  const selectOnly = (id: ExcalidrawElement["id"]) => {
    act(() => {
      API.setSelectedElements(
        h.elements.filter(
          (element) => element.id === id,
        ) as NonDeletedExcalidrawElement[],
      );
    });
  };

  it("writes to the element that was typed in, not the one selected at blur", async () => {
    const { first, second } = await renderWithTwo();
    const input = noteInput()!;

    fireEvent.change(input, { target: { value: "about the first" } });
    // selection moves before the field blurs, exactly as a canvas click does
    selectOnly(second.id);
    fireEvent.blur(input);

    expect(API.getElement(first).note).toBe("about the first");
    expect(API.getElement(second).note).toBe("");
    // one committed edit -> one undo entry
    expect(API.getUndoStack().length).toBe(1);

    // and the second element's field starts empty, not with the text typed
    // for the first
    expect(noteInput()!.value).toBe("");
  });

  it("flushes the pending note when a deselect unmounts the field", async () => {
    const { first } = await renderWithTwo();
    const input = noteInput()!;

    fireEvent.change(input, { target: { value: "keep me" } });
    // clicking empty canvas clears the selection; React unmounts the input and
    // no blur is ever fired
    act(() => {
      h.setState({ selectedElementIds: {} });
    });

    expect(noteInput()).toBeNull();
    expect(API.getElement(first).note).toBe("keep me");
    expect(API.getUndoStack().length).toBe(1);
  });

  it("drops the draft instead of overwriting an undo", async () => {
    const { first } = await renderWithTwo();

    fireEvent.change(noteInput()!, { target: { value: "committed" } });
    fireEvent.blur(noteInput()!);
    expect(API.getElement(first).note).toBe("committed");

    // start typing a second note, then undo the committed one
    fireEvent.change(noteInput()!, { target: { value: "half typ" } });
    Keyboard.undo();

    expect(API.getElement(first).note).toBe("");
    expect(noteInput()!.value).toBe("");
    // the abandoned draft was not recorded as another edit
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

  it("sits inside the panel's flex row as a full-width, shrinkable field", async () => {
    await renderWithElement();
    const input = noteInput()!;

    // the CSS cannot be asserted in jsdom (no stylesheets are loaded), so
    // this holds the markup contract the stylesheet keys off: without the
    // fieldset class, `flex`/`min-width` in styles.scss match nothing and the
    // field goes back to overflowing the panel
    const fieldset = input.closest("fieldset");
    expect(fieldset).toHaveClass("element-note-fieldset");
    expect(input).toHaveClass("TextInput", "element-note-input");
    // the panel's rounded container is the styles island the panel renders in
    expect(input.closest(".selected-shape-actions")).not.toBeNull();
    // the placeholder and typed text share the one box, no fixed inline width
    expect(input.getAttribute("style")).toBeNull();
    expect(input.getAttribute("maxlength")).toBe("500");
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
