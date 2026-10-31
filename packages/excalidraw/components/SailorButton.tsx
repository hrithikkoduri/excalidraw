import { useState } from "react";

import { t } from "../i18n";

import { Dialog } from "./Dialog";
import DialogActionButton from "./DialogActionButton";
import { IconButton } from "./IconButton";
import { sailorIcon } from "./icons";

import "./SailorButton.scss";

export const SailorButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <IconButton
        className="SailorButton"
        type="button"
        size="small"
        icon={sailorIcon}
        title={t("toolBar.sailor")}
        aria-label={t("toolBar.sailor")}
        data-testid="toolbar-sailor"
        onClick={() => setIsDialogOpen(true)}
      />
      {isDialogOpen && (
        <Dialog
          className="SailorDialog"
          size="small"
          title={t("toolBar.sailor")}
          onCloseRequest={() => setIsDialogOpen(false)}
        >
          <DialogActionButton
            label={t("buttons.close")}
            onClick={() => setIsDialogOpen(false)}
          />
        </Dialog>
      )}
    </>
  );
};
SailorButton.displayName = "SailorButton";
