// Written by Sailor. Fill SCREENS: one entry per screen, chosen by the page's #hash.
// Import a few of the app's own leaf components (buttons, inputs, panels) for its look;
// fake everything else (data, the canvas, anything that needs a server) with plain markup.
import React from "react";
import { createRoot } from "react-dom/client";
// The app's global styles, so plain markup with its class names looks like the app.
import "../../../packages/excalidraw/css/styles.scss";
import "../../../excalidraw-app/index.scss";

type Screen = { title: string; render: () => React.ReactElement };

const SCREENS: Record<string, Screen> = {
  // SCREENS-START
  overview: { title: "Overview", render: () => <div style={{ padding: 24 }}>Replace with the screen</div> },
  // SCREENS-END
};

function App() {
  const first = Object.keys(SCREENS)[0]!;
  const pick = () => (window.location.hash.slice(1) in SCREENS ? window.location.hash.slice(1) : first);
  const [key, setKey] = React.useState(pick);
  React.useEffect(() => {
    const onHash = () => setKey(pick());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return SCREENS[key]!.render();
}

createRoot(document.getElementById("root")!).render(<App />);
