import { Excalidraw } from "../index";

import { act, fireEvent, render, waitFor } from "./test-utils";

describe("SailorButton", () => {
  it("opens a 'Built with Sailor' dialog from the top-right button", async () => {
    await render(<Excalidraw />);

    const button = document.querySelector<HTMLButtonElement>(
      "[data-testid='toolbar-sailor']",
    )!;
    expect(button).not.toBeNull();
    expect(button.closest(".layer-ui__wrapper__top-right")).not.toBeNull();

    act(() => {
      fireEvent.click(button);
    });

    const modal = await waitFor(() => {
      const modal = document.querySelector(
        ".excalidraw-modal-container .Modal",
      );
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
      expect(document.querySelector(".excalidraw-modal-container")).toBeNull();
    });
  });
});
