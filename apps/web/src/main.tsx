import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import { consumeSessionCredential } from "./credential.js";
import { createGatewayStore } from "./gateway-store.js";

const container = document.getElementById("root");
if (!container) throw new Error("AIOX root element is missing");

try {
  const store = createGatewayStore({
    credential: consumeSessionCredential(),
  });
  createRoot(container).render(
    <StrictMode>
      <App store={store} />
    </StrictMode>,
  );
  window.addEventListener("pagehide", () => store.dispose(), { once: true });
  void store.start().catch(() => {});
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const failure = document.createElement("main");
  const heading = document.createElement("h1");
  const detail = document.createElement("p");
  const recovery = document.createElement("p");
  failure.style.cssText =
    "font-family:system-ui;padding:3rem;color:#f5f2e8;background:#0b0e12;min-height:100vh";
  heading.textContent = "AIOX cannot authenticate";
  detail.textContent = message;
  recovery.textContent = "Run aiox open to create a fresh local session.";
  failure.append(heading, detail, recovery);
  container.replaceChildren(failure);
}
