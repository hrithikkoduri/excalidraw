import { CaptureUpdateAction } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { act, fireEvent, render, screen, unmountComponent } from "./test-utils";

const { h } = window;

unmountComponent();

/** put one rectangle in the scene through the store, so it can be undone */
const seedRectangle = async (notes?: string) => {
  const rectangle = API.createElement({
    type: "rectangle",
    x: 20,
    y: 20,
    width: 100,
    height: 100,
  });

  await act(async () => {
    API.updateScene({
      elements: [notes === undefined ? rectangle : { ...rectangle, notes }],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  });
  await act(async () => {});

  return h.elements[0] as NonDeletedExcalidrawElement;
};

const select = async (elements: NonDeletedExcalidrawElement[]) => {
  API.setSelectedElements(elements);
  await act(async () => {});
};

const notesField = () => screen.getByLabelText("Notes") as HTMLTextAreaElement;

/** type into the field the way a person does: focus it, then change it */
const typeNote = (value: string) => {
  const field = notesField();
  field.focus();
  fireEvent.change(field, { target: { value } });
  return field;
};

const notesOf = (element: ExcalidrawElement) =>
  API.getElement(element).notes ?? "";

describe("element notes in the properties panel", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  it("shows the field exactly when one element is selected", async () => {
    const rectangle = await seedRectangle();

    await select([rectangle]);
    expect(notesField()).toBeDefined();

    await select([]);
    expect(screen.queryByLabelText("Notes")).toBeNull();
  });

  it("hides the field for a multi-element selection", async () => {
    const rectangle = await seedRectangle();
    const ellipse = API.createElement({ type: "ellipse", x: 200, y: 20 });

    await act(async () => {
      API.updateScene({
        elements: [rectangle, ellipse],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    });
    await act(async () => {});
    await select(h.elements as NonDeletedExcalidrawElement[]);

    expect(screen.queryByLabelText("Notes")).toBeNull();
  });

  it("reads an existing note into the field with its counter", async () => {
    const rectangle = await seedRectangle("already here");

    await select([rectangle]);

    expect(notesField().value).toBe("already here");
    expect(screen.getByText("12/500")).toBeDefined();
  });

  it("counts typed characters without writing until the field is left", async () => {
    const rectangle = await seedRectangle();
    await select([rectangle]);

    const field = typeNote("hello");

    expect(screen.getByText("5/500")).toBeDefined();
    // held locally: the element stays untouched and no undo entry is created
    expect(notesOf(rectangle)).toBe("");
    expect(API.getUndoStack().length).toBe(1); // just the seeding capture

    fireEvent.blur(field);
    await act(async () => {});

    expect(notesOf(rectangle)).toBe("hello");
  });

  it("commits the whole edit as one undoable step", async () => {
    const rectangle = await seedRectangle();
    await select([rectangle]);

    const field = typeNote("a note");
    fireEvent.blur(field);
    await act(async () => {});

    expect(notesOf(rectangle)).toBe("a note");
    const undoStackLength = API.getUndoStack().length;
    expect(undoStackLength).toBe(2); // seed + the note edit

    await act(async () => {
      Keyboard.undo();
    });
    await act(async () => {});

    expect(notesOf(rectangle)).toBe("");
    expect(API.getUndoStack().length).toBe(undoStackLength - 1);
  });

  it("caps a committed note at 500 characters", async () => {
    const rectangle = await seedRectangle();
    await select([rectangle]);

    const field = typeNote("x".repeat(600));

    // the counter never runs past the cap
    expect(screen.getByText("500/500")).toBeDefined();

    fireEvent.blur(field);
    await act(async () => {});

    expect(notesOf(rectangle)).toBe("x".repeat(500));
  });

  it("commits the note when the panel closes instead of blurring", async () => {
    const rectangle = await seedRectangle();
    await select([rectangle]);

    typeNote("kept on close");
    // closing the panel unmounts the field, which commits the draft
    await select([]);

    expect(notesOf(rectangle)).toBe("kept on close");
  });
});

describe("element notes in the compact properties panel", () => {
  beforeAll(() => {
    // radix popovers need a ResizeObserver, which jsdom lacks
    (global as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(async () => {
    unmountComponent();
    await render(<Excalidraw UIOptions={{ getFormFactor: () => "tablet" }} />);
    fireEvent.resize(window);
  });

  it("renders and commits the field from the compact panel", async () => {
    const rectangle = await seedRectangle();
    await select([rectangle]);

    // the compact layout holds the field in its "other properties" popover
    expect(screen.queryByLabelText("Notes")).toBeNull();
    fireEvent.click(screen.getByTitle("Actions"));
    await act(async () => {});

    const field = typeNote("compact note");
    expect(screen.getByText("12/500")).toBeDefined();

    fireEvent.blur(field);
    await act(async () => {});

    expect(notesOf(rectangle)).toBe("compact note");
  });
});
