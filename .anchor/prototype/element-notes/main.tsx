// Written by Sailor. Fill SCREENS: one entry per screen, chosen by the page's #hash.
// Import a few of the app's own leaf components (buttons, inputs, panels) for its look;
// fake everything else (data, the canvas, anything that needs a server) with plain markup.
import React from "react";
import { createRoot } from "react-dom/client";
// The app's global styles, so plain markup with its class names looks like the app.
import "../../../packages/excalidraw/css/styles.scss";
import "../../../excalidraw-app/index.scss";

// the app's own panel shell, field look, tooltip look and a note glyph
import { Island } from "../../../packages/excalidraw/components/Island";
import { stickyNoteToolIcon } from "../../../packages/excalidraw/components/icons";
import "../../../packages/excalidraw/components/TextField.scss";
import "../../../packages/excalidraw/components/Tooltip.scss";

type Screen = { title: string; render: () => React.ReactElement };

const MAX = 500;

/** sample note, two lines as it would wrap in the field */
const SAMPLE_NOTE =
  "Client wants the login flow split into two\nscreens. Move the error copy here and keep the blue box as the empty state. Review it before Friday";

// ---------------------------------------------------------------------------
// small pieces shared by the screens
// ---------------------------------------------------------------------------

/** a 2rem app-style control button (plain stand-in for ToolIcon) */
const ToolBtn = ({
  selected,
  children,
  label,
  wide,
}: {
  selected?: boolean;
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={!!selected}
    className={`proto-tool${selected ? " is-selected" : ""}${
      wide ? " proto-tool--wide" : ""
    }`}
  >
    {children}
  </button>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <fieldset>
    <legend>{label}</legend>
    <div className="buttonList">{children}</div>
  </fieldset>
);

const Swatch = ({ color, checked }: { color: string; checked?: boolean }) => (
  <ToolBtn label={checked ? "current stroke colour" : "stroke colour"}>
    <span
      className="proto-swatch"
      style={{ background: color }}
      aria-hidden="true"
    />
  </ToolBtn>
);

/** the whole existing styles panel for a single selected rectangle, plainly drawn */
const ExistingControls = () => (
  <>
    <div className="proto-pair">
      <Field label="Stroke">
        <Swatch color="#1e1e1e" checked />
      </Field>
      <Field label="Background">
        <Swatch color="#a5d8ff" />
      </Field>
    </div>

    <Field label="Fill">
      <ToolBtn label="hachure">
        <span className="proto-fill proto-fill--hachure" />
      </ToolBtn>
      <ToolBtn label="cross-hatch" selected>
        <span className="proto-fill proto-fill--cross" />
      </ToolBtn>
      <ToolBtn label="solid">
        <span className="proto-fill proto-fill--solid" />
      </ToolBtn>
    </Field>

    <Field label="Stroke width">
      <ToolBtn label="thin">
        <span className="proto-line proto-line--thin" />
      </ToolBtn>
      <ToolBtn label="bold" selected>
        <span className="proto-line proto-line--bold" />
      </ToolBtn>
      <ToolBtn label="extra bold">
        <span className="proto-line proto-line--xbold" />
      </ToolBtn>
    </Field>

    <Field label="Stroke style">
      <ToolBtn label="solid" selected>
        <span className="proto-line proto-line--solid" />
      </ToolBtn>
      <ToolBtn label="dashed">
        <span className="proto-line proto-line--dashed" />
      </ToolBtn>
      <ToolBtn label="dotted">
        <span className="proto-line proto-line--dotted" />
      </ToolBtn>
    </Field>

    <div className="proto-pair">
      <Field label="Edges">
        <ToolBtn label="sharp">
          <span className="proto-edge proto-edge--sharp" />
        </ToolBtn>
        <ToolBtn label="round" selected>
          <span className="proto-edge proto-edge--round" />
        </ToolBtn>
      </Field>
      <Field label="Sloppiness">
        <ToolBtn label="architect" selected>
          <span className="proto-slop proto-slop--a" />
        </ToolBtn>
        <ToolBtn label="artist">
          <span className="proto-slop proto-slop--b" />
        </ToolBtn>
      </Field>
    </div>

    <fieldset>
      <legend>Opacity</legend>
      <div className="proto-slider-row">
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={100}
          aria-label="opacity"
          className="proto-slider"
        />
        <span className="proto-readout">100</span>
      </div>
    </fieldset>
  </>
);

/** the new part: Notes caption, textarea, counter */
const NoteField = ({
  initial = "",
  id,
}: {
  initial?: string;
  id: string;
}) => {
  const [value, setValue] = React.useState(initial);
  const count = value.length;

  return (
    <div className="proto-notes">
      <div className="ExcTextField ExcTextField--fullWidth">
        <label className="ExcTextField__label" htmlFor={id}>
          Notes
        </label>
        <div className="ExcTextField__input proto-notes__box">
          <textarea
            id={id}
            className="proto-notes__area"
            maxLength={MAX}
            placeholder="Add a note\u2026"
            value={value}
            rows={3}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
      </div>
      <div
        className={`proto-counter${count === 0 ? " is-empty" : ""}`}
        aria-live="polite"
      >
        {count}/{MAX}
      </div>
    </div>
  );
};

/** the full panel island, with the new part below the existing controls */
const Panel = ({ note }: { note?: string }) => (
  <Island padding={2} className="proto-panel">
    <div className="selected-shape-actions">
      <ExistingControls />
      <div className="proto-panel__divider" role="presentation" />
      <NoteField initial={note} id={note ? "note-filled" : "note-empty"} />
    </div>
  </Island>
);

/** the small note badge drawn at an element's top-right corner */
const NoteMarker = () => (
  <span className="proto-marker" title="has a note">
    {stickyNoteToolIcon}
  </span>
);

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------

const PanelScreen = () => (
  <Doc
    active="panel"
    title="Notes in the properties panel"
    lede="One rectangle selected. Everything above the divider is today's panel; the Notes caption, the field and the counter sit below it, at the bottom of the same panel."
  >
    <div className="proto-row proto-row--top">
      <figure className="proto-figure">
        <figcaption className="proto-cap">
          <b>Empty</b>  no note yet, counter at 0/500 and the field shows its
          placeholder
        </figcaption>
        <Panel />
      </figure>

      <figure className="proto-figure">
        <figcaption className="proto-cap">
          <b>Filled</b>  two lines of note, counter at 142/500
        </figcaption>
        <Panel note={SAMPLE_NOTE} />
      </figure>

      <div className="proto-aside">
        <h3 className="proto-aside__title">What changes here</h3>
        <ul className="proto-list">
          <li>The panel keeps its width and its order; nothing moves.</li>
          <li>
            The field reuses the app's text field look: same surface, border,
            radius and caption as the fields in Settings.
          </li>
          <li>
            The counter sits under the field, right aligned, quiet at 0/500 and
            darker once there is text. The field stops accepting input at 500.
          </li>
        </ul>
        <p className="proto-note-small">
          Sample text is editable above, so the counter moves as you type.
        </p>
      </div>
    </div>
  </Doc>
);

/** one drawn canvas of shapes; `hover` adds the tooltip on the noted rectangle */
const DrawnScene = ({ hover }: { hover?: boolean }) => (
  <div className="proto-canvas" role="img" aria-label="drawn canvas with shapes">
    <span className="proto-shape proto-shape--ellipse" />
    <span className="proto-shape proto-shape--diamond" />
    <span className="proto-shape proto-shape--rect-note">
      <NoteMarker />
    </span>
    <span className="proto-shape proto-shape--rect-small" />
    <svg className="proto-arrow" viewBox="0 0 120 40" aria-hidden="true">
      <path
        d="M4 30 C 40 6, 70 34, 114 12"
        fill="none"
        stroke="#1e1e1e"
        strokeWidth="2"
      />
      <path d="M104 6 L116 11 L106 20" fill="none" stroke="#1e1e1e" strokeWidth="2" />
    </svg>
    {hover && (
      <div className="excalidraw-tooltip excalidraw-tooltip--visible proto-note-tooltip">
        Login flow splits into two screens; error copy goes here.
      </div>
    )}
  </div>
);

const CanvasScreen = () => (
  <Doc
    active="canvas"
    title="The note marker on the canvas"
    lede="Only elements that carry a note get a badge, and the badge appears at the element's top-right corner. Hovering it shows the note itself, read only."
  >
    <div className="proto-row proto-row--top">
      <figure className="proto-figure">
        <figcaption className="proto-cap">
          <b>At rest</b>  the rectangle carries a small square badge with a
          note glyph; the shapes without a note show nothing
        </figcaption>
        <DrawnScene />
      </figure>
      <figure className="proto-figure">
        <figcaption className="proto-cap">
          <b>Hovering the badge</b>  the app's tooltip appears next to the
          element and shows the note text, wrapped to a few lines
        </figcaption>
        <DrawnScene hover />
      </figure>
    </div>

    <div className="proto-aside proto-aside--wide">
      <h3 className="proto-aside__title">Rules the picture is showing</h3>
      <ul className="proto-list proto-list--cols">
        <li>The badge is small: 20px square, brand-coloured glyph on white.</li>
        <li>It sits outside the shape's edge, so it never covers the drawing.</li>
        <li>One badge per element, even with a long note.</li>
        <li>Selection outline and resize handles stay as they are today.</li>
      </ul>
    </div>
  </Doc>
);

const ExportScreen = () => (
  <Doc
    active="export"
    title="Notes never reach the export"
    lede="The marker is interface, not content. It is drawn by the editor on top of the scene, so a PNG or SVG export of the same element looks exactly like it does today."
  >
    <div className="proto-row proto-row--top">
      <figure className="proto-figure">
        <figcaption className="proto-cap">
          <b>On canvas</b>  the element, its selection-free drawing and the note
          marker
        </figcaption>
        <div className="proto-export-card">
          <div className="proto-export-card__stage proto-export-card__stage--editor">
            <span className="proto-shape proto-shape--export">
              <NoteMarker />
            </span>
          </div>
          <div className="proto-export-card__foot">
            <span className="proto-chip proto-chip--on">marker shown</span>
            <span>top-right of the element</span>
          </div>
        </div>
      </figure>

      <figure className="proto-figure">
        <figcaption className="proto-cap">
          <b>PNG / SVG export</b>  the same element, no marker and no tooltip
        </figcaption>
        <div className="proto-export-card">
          <div className="proto-export-card__stage">
            <span className="proto-shape proto-shape--export" />
          </div>
          <div className="proto-export-card__foot">
            <span className="proto-chip proto-chip--off">nothing drawn</span>
            <span>pixels and vectors only</span>
          </div>
        </div>
      </figure>
    </div>

    <div className="proto-aside proto-aside--wide">
      <h3 className="proto-aside__title">So the rule is</h3>
      <p className="proto-rule">
        The note is stored on the element and saved with the drawing, but it is
        never painted into the scene. Copy, duplicate, share links and exports
        all keep behaving as they do today; the note only shows up in the
        editor's own interface.
      </p>
    </div>
  </Doc>
);

const SCREENS: Record<string, Screen> = {
  // SCREENS-START
  panel: { title: "Properties panel: Notes field", render: PanelScreen },
  canvas: { title: "Canvas: note marker and hover", render: CanvasScreen },
  export: { title: "Export: marker is not content", render: ExportScreen },
  // SCREENS-END
};

/** page chrome around a screen: heading, screen switcher, the screen itself */
function Doc({
  active,
  title,
  lede,
  children,
}: {
  active: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="proto-shell">
      <header className="proto-head">
        <div className="proto-head__text">
          <p className="proto-kicker">Element notes · prototype</p>
          <h1 className="proto-title">{title}</h1>
          <p className="proto-lede">{lede}</p>
        </div>
        <nav className="proto-nav" aria-label="screens">
          {Object.entries(SCREENS).map(([key, screen]) => (
            <a
              key={key}
              href={`#${key}`}
              className={`proto-nav__link${key === active ? " is-active" : ""}`}
              aria-current={key === active ? "page" : undefined}
            >
              <span className="proto-tag">#{key}</span>
              <span className="proto-nav__label">{screen.title}</span>
            </a>
          ))}
        </nav>
      </header>
      {children}
      <footer className="proto-foot">
        An optional plain-text note, up to 500 characters, on any element.
      </footer>
    </div>
  );
}

const CSS = `
.excalidraw.proto-root {
  display: block;
  position: static;
  height: auto;
  min-height: 100vh;
  overflow: visible;
  background: #f4f4f7;
  color: var(--color-on-surface, #1b1b1f);
  font-family: var(--ui-font, Assistant, system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.proto-shell { max-width: 1060px; margin: 0 auto; padding: 36px 28px 64px; }
.proto-head {
  display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 20px; margin-bottom: 26px;
  border-bottom: 1px solid #dddde6;
}
.proto-head__text { max-width: 560px; }
.proto-kicker {
  margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #6d6d7a;
}
.proto-title { margin: 0 0 8px; font-size: 27px; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
.proto-lede { margin: 0; font-size: 14.5px; line-height: 1.55; color: #55555f; }
.proto-nav { display: flex; gap: 6px; flex-wrap: wrap; }
.proto-nav__link {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px 12px; border-radius: 10px; text-decoration: none;
  background: #fff; color: #4a4a55;
  box-shadow: 0 0 0 1px #e2e2ea;
  max-width: 180px;
}
.proto-nav__link:hover { box-shadow: 0 0 0 1px #b9b6ea; }
.proto-nav__link:focus-visible { outline: 2px solid #6965db; outline-offset: 2px; }
.proto-nav__link.is-active { box-shadow: 0 0 0 1.5px #6965db; background: #f6f5ff; }
.proto-nav__label { font-size: 11.5px; line-height: 1.3; color: #62626e; }
.proto-tag {
  align-self: flex-start;
  font-size: 11px; font-weight: 600; letter-spacing: 0.01em;
  color: #4d47b8; background: #eceafd; border-radius: 999px; padding: 1px 7px;
}
.proto-row { display: flex; gap: 26px; flex-wrap: wrap; align-items: flex-start; margin-bottom: 30px; }
.proto-row--top { align-items: flex-start; }
.proto-figure { margin: 0; }
.proto-cap { margin: 0 0 10px; max-width: 330px; font-size: 12.5px; line-height: 1.5; color: #6b6b78; }
.proto-cap b { display: block; color: #303039; font-size: 13px; font-weight: 600; margin-bottom: 2px; }

/* the panel island */
.proto-panel { width: 246px; }
.proto-panel .selected-shape-actions { padding: 10px 10px 12px; }
.proto-panel__divider { height: 1px; background: #ececf2; margin: 2px 0; }
.proto-pair { display: flex; gap: 8px; flex-wrap: wrap; }
.proto-pair > fieldset { flex: 1 1 0; min-width: 0; }
.proto-tool {
  width: 2rem; height: 2rem; flex: 0 0 auto;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 0.5rem; cursor: pointer;
  background: #f4f4f9; color: #44444e;
  box-shadow: 0 0 0 1px #e8e8ef;
}
.proto-tool:hover { background: #ececf4; }
.proto-tool:focus-visible { outline: 2px solid #6965db; outline-offset: 1px; }
.proto-tool.is-selected { background: #e3e1fb; box-shadow: 0 0 0 1px #b9b6ea; }
.proto-swatch { width: 1.1rem; height: 1.1rem; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.18); display: block; }
.proto-fill { width: 1.1rem; height: 1.1rem; border-radius: 3px; display: block; border: 1px solid #8b8b96; background-color: #fff; }
.proto-fill--hachure { background-image: repeating-linear-gradient(45deg, #8b8b96 0 1px, transparent 1px 4px); }
.proto-fill--cross { background-image: repeating-linear-gradient(45deg, #8b8b96 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, #8b8b96 0 1px, transparent 1px 4px); }
.proto-fill--solid { background-color: #a5d8ff; }
.proto-line { display: block; width: 1.15rem; background: #44444e; height: 1px; }
.proto-line--thin { height: 1px; }
.proto-line--bold { height: 2px; }
.proto-line--xbold { height: 3px; }
.proto-line--dashed { height: 0; border-top: 2px dashed #44444e; background: none; }
.proto-line--dotted { height: 0; border-top: 2px dotted #44444e; background: none; }
.proto-edge { width: 1.15rem; height: 1.15rem; display: block; border-left: 2px solid #44444e; border-bottom: 2px solid #44444e; }
.proto-edge--sharp { border-bottom-left-radius: 0; }
.proto-edge--round { border-bottom-left-radius: 8px; }
.proto-slop { display: block; width: 1.2rem; height: 0.9rem; border-bottom: 2px solid #44444e; border-bottom-left-radius: 10px; }
.proto-slop--b { transform: skewX(-12deg); }
.proto-slider-row { display: flex; align-items: center; gap: 8px; }
.proto-slider { flex: 1; accent-color: #6965db; height: 18px; }
.proto-readout { font-size: 12px; color: #5a5a66; min-width: 26px; text-align: right; }

/* the new notes field */
.proto-notes { display: flex; flex-direction: column; gap: 4px; }
.proto-notes .ExcTextField__input { height: auto; align-items: stretch; padding: 0; }
.proto-notes__box { min-height: 4.5rem; }
.proto-notes__area {
  width: 100%; min-height: 4.5rem; box-sizing: border-box;
  resize: vertical; border: none; outline: none; background: transparent;
  padding: 0.5rem 0.75rem;
  font-family: Assistant, var(--ui-font, system-ui, sans-serif);
  font-size: 0.9375rem; line-height: 1.45; color: var(--color-on-surface, #1b1b1f);
}
.proto-notes__area::placeholder { color: #a3a3b0; }
.proto-counter { align-self: flex-end; font-size: 11.5px; line-height: 1.4; color: #6f6f7c; font-variant-numeric: tabular-nums; }
.proto-counter.is-empty { color: #a3a3b0; }

/* canvas stand-in */
.proto-canvas {
  position: relative; width: 430px; height: 258px;
  background-color: #fff; border-radius: 12px;
  box-shadow: 0 0 0 1px #e4e4ec;
  background-image: radial-gradient(#e6e6ee 1px, transparent 1px);
  background-size: 18px 18px;
  background-position: 8px 8px;
}
.proto-shape { position: absolute; display: block; border: 2px solid #1e1e1e; border-radius: 5px; }
.proto-shape--ellipse { width: 84px; height: 84px; border-radius: 50%; left: 34px; top: 40px; }
.proto-shape--diamond { width: 62px; height: 62px; border-radius: 5px; transform: rotate(45deg); left: 158px; top: 34px; }
.proto-shape--rect-note { width: 128px; height: 78px; left: 84px; top: 138px; background: #a5d8ff; }
.proto-shape--rect-small { width: 78px; height: 52px; left: 286px; top: 128px; }
.proto-arrow { position: absolute; left: 250px; top: 40px; width: 130px; height: 44px; }
.proto-marker {
  position: absolute; top: -10px; right: -10px;
  width: 20px; height: 20px; border-radius: 5px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #fff; color: #4d47b8;
  box-shadow: 0 0 0 1px #cfcdee, 0 1px 3px rgba(30, 30, 40, 0.18);
}
.proto-marker svg { width: 13px; height: 13px; }
.proto-note-tooltip {
  position: absolute !important;
  display: block !important;
  left: 246px; top: 62px;
  max-width: 190px;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.45;
  padding: 8px 10px;
  border-radius: 7px;
  background: #111114;
  box-shadow: 0 4px 12px rgba(20, 20, 30, 0.22);
}
.proto-note-tooltip::after {
  content: ""; position: absolute; left: 14px; bottom: -4px;
  width: 9px; height: 9px; background: #111114; transform: rotate(45deg);
  border-radius: 1px;
}

/* export comparison */
.proto-export-card {
  width: 300px; border-radius: 12px; overflow: hidden; background: #fff;
  box-shadow: 0 0 0 1px #e2e2ea;
}
.proto-export-card__stage {
  position: relative; height: 172px; display: flex; align-items: center; justify-content: center;
  background: #fff;
}
.proto-export-card__stage--editor {
  background-image: radial-gradient(#e6e6ee 1px, transparent 1px);
  background-size: 18px 18px;
}
.proto-shape--export { position: relative; width: 132px; height: 80px; background: #a5d8ff; }
.proto-export-card__foot {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-top: 1px solid #eeeef4;
  font-size: 11.5px; color: #6f6f7c; background: #fbfbfd;
}
.proto-chip {
  font-size: 11px; font-weight: 600; border-radius: 999px; padding: 2px 8px; white-space: nowrap;
}
.proto-chip--on { color: #4d47b8; background: #eceafd; }
.proto-chip--off { color: #3d6b45; background: #e6f3e8; }

/* aside notes */
.proto-aside { max-width: 290px; padding: 16px 18px; background: #fff; border-radius: 12px; box-shadow: 0 0 0 1px #e4e4ec; }
.proto-aside--wide { max-width: none; flex: 1 1 420px; }
.proto-aside__title { margin: 0 0 10px; font-size: 13.5px; font-weight: 700; letter-spacing: -0.005em; color: #2c2c35; }
.proto-list { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #55555f; }
.proto-list li { margin-bottom: 6px; }
.proto-list li:last-child { margin-bottom: 0; }
.proto-list--cols { columns: 2; column-gap: 26px; }
.proto-note-small { margin: 12px 0 0; font-size: 11.5px; line-height: 1.5; color: #85858f; }
.proto-rule { margin: 0; font-size: 13px; line-height: 1.6; color: #4b4b56; max-width: 62ch; }
.proto-foot { margin-top: 34px; padding-top: 14px; border-top: 1px solid #e2e2ea; font-size: 11.5px; color: #85858f; }
@media (max-width: 760px) {
  .proto-shell { padding: 22px 16px 44px; }
  .proto-canvas, .proto-export-card { width: 100%; max-width: 430px; }
  .proto-list--cols { columns: 1; }
}
`;

function App() {
  const first = Object.keys(SCREENS)[0]!;
  const pick = () => (window.location.hash.slice(1) in SCREENS ? window.location.hash.slice(1) : first);
  const [key, setKey] = React.useState(pick);
  React.useEffect(() => {
    const onHash = () => setKey(pick());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return (
    <div className="excalidraw theme--light proto-root">
      <style>{CSS}</style>
      {SCREENS[key]!.render()}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
