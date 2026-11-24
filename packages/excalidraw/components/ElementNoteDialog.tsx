import { useState } from "react";

import { randomInteger } from "@excalidraw/common";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { t } from "../i18n";

import { useApp } from "./App";
import { Dialog } from "./Dialog";
import DialogActionButton from "./DialogActionButton";

import "./ElementNoteDialog.scss";

/** Enough for a paragraph or three; the counter makes the ceiling visible. */
export const NOTE_MAX_LENGTH = 2000;

/**
 * Edit one element's note. Built on `Dialog`, which owns Escape handling, focus
 * trapping and focus restore, so this component only keeps the draft and
 * commits it on Save (Cancel and Escape leave the element untouched).
 */
const ElementNoteDialog = ({
  elementId,
  onClose,
}: {
  elementId: ExcalidrawElement["id"];
  onClose: () => void;
}) => {
  const app = useApp();
  const element = app.scene.getNonDeletedElementsMap().get(elementId);
  const originalNote = element?.note ?? "";

  const [draft, setDraft] = useState(originalNote);

  // `Dialog` autofocuses its second focusable element, assuming the first is
  // the close button (which only exists on phone); on desktop that would land
  // on Cancel. The note is what the user came to type, so Dialog's autofocus is
  // turned off and the textarea takes focus (caret at the end) when it mounts.
  // A ref callback is used rather than an effect because the dialog renders
  // nothing until its portal container exists, so a mount-time effect would
  // run before the textarea is in the tree and never run again.
  const focusNote = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  };

  if (!element) {
    return null;
  }

  const elementTypeLabel = t(`element.${element.type}` as "element.rectangle");
  const nextNote = draft.trim();

  /** `mutateElement` skips `undefined` updates, so removing the property is an
      explicit delete plus a version bump through the normal mutation path
      (that bump is what makes the save and collab pick the removal up). */
  const deleteNote = () => {
    delete (element as { note?: string }).note;
    app.scene.mutateElement(element, { versionNonce: randomInteger() });
    onClose();
  };

  const saveNote = () => {
    if (nextNote === originalNote) {
      onClose();
      return;
    }

    if (!nextNote) {
      deleteNote();
      return;
    }

    app.scene.mutateElement(element, { note: nextNote });
    onClose();
  };

  return (
    <Dialog
      size="small"
      autofocus={false}
      title={
        originalNote
          ? t("elementNote.titleEdit", { elementType: elementTypeLabel })
          : t("elementNote.title", { elementType: elementTypeLabel })
      }
      onCloseRequest={onClose}
    >
      <div className="ElementNoteDialog">
        <p className="ElementNoteDialog__desc">{t("elementNote.desc")}</p>

        <label className="ElementNoteDialog__field">
          <span className="visually-hidden">{t("elementNote.fieldLabel")}</span>
          <textarea
            ref={focusNote}
            className="ElementNoteDialog__textarea"
            value={draft}
            placeholder={t("elementNote.placeholder")}
            maxLength={NOTE_MAX_LENGTH}
            rows={7}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>

        <div className="ElementNoteDialog__counter" aria-live="polite">
          {t("elementNote.counter", {
            count: draft.length,
            max: NOTE_MAX_LENGTH,
          })}
        </div>

        <div className="ElementNoteDialog__actions">
          {originalNote ? (
            <DialogActionButton
              label={t("elementNote.delete")}
              actionType="danger"
              onClick={deleteNote}
              className="ElementNoteDialog__delete"
            />
          ) : (
            <span className="ElementNoteDialog__nothing-to-delete">
              {t("elementNote.nothingToDelete")}
            </span>
          )}

          <DialogActionButton label={t("buttons.cancel")} onClick={onClose} />

          <DialogActionButton
            label={t("elementNote.save")}
            actionType="primary"
            onClick={saveNote}
            disabled={!nextNote && !originalNote}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default ElementNoteDialog;
