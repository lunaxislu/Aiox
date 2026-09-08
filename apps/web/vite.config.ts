import { defineConfig } from "vite";

// The daemon serves this build and the API from the same web port, so every
// asset and request is relative and no host is baked in.
export default defineConfig({
    base: "./",
    build: { outDir: "dist", emptyOutDir: true },
});
