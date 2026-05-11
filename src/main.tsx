import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { applyTokens } from "./styles/design-tokens";

applyTokens();

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.style.background = "#0b0f0e";
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
