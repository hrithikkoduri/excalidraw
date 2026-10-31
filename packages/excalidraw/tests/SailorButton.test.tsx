import { Excalidraw } from "../index";

import { act, fireEvent, render, waitFor } from "./test-utils";

const queryModal = () =>
  document.querySelector(".excalidraw-modal-container .Modal");

const openSailorDialog = async () => {
  await render(<Excalidraw />);
  act(() => {
    fireEvent.click(
      document.querySelector<HTMLButtonElement>(
        "[data-testid='toolbar-sailor']",
      )!,
    );
  });
  return waitFor(() => {
    const modal = queryModal();
    expect(modal).not.toBeNull();
    return modal!;
  });
};

describe("SailorButton", () => {
  it("opens a 'Built with Sailor' dialog from the top-right button", async () => {
    await render(<Excalidraw />);

    const button = document.querySelector<HTMLButtonElement>(
      "[data-testid='toolbar-sailor']",
    )!;
    expect(button.closest(".layer-ui__wrapper__top-right")).not.toBeNull();

    act(() => {
      fireEvent.click(button);
    });

    const modal = await waitFor(() => {
      const modal = queryModal();
      expect(modal).not.toBeNull();
      return modal!;
    });
    expect(modal.textContent).toContain("Built with Sailor");

    act(() => {
      fireEvent.click(
        modal.querySelector<HTMLButtonElement>(".Dialog__action-button")!,
      );
    });

    await waitFor(() => {
      expect(queryModal()).toBeNull();
    });
  });

  it.each([
    ["Escape", (modal: Element) => fireEvent.keyDown(modal, { key: "Escape" })],
    [
      "clicking outside",
      (modal: Element) =>
        fireEvent.click(modal.querySelector(".Modal__background")!),
    ],
  ])("dismisses the dialog via %s", async (_label, dismiss) => {
    const modal = await openSailorDialog();

    act(() => {
      dismiss(modal);
    });

    await waitFor(() => {
      expect(queryModal()).toBeNull();
    });
  });
});
