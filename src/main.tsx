import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app/App";
import { initColorScheme } from "@/lib/theme";
import "@/styles/globals.css";

initColorScheme();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
