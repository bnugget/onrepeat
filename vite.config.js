import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly instead of silently picking a
    // different port — your genre/mood/era data lives in this browser's
    // localStorage, keyed to the exact localhost:PORT you're on, so a
    // drifting port makes existing data look "gone" when it's really
    // just sitting under a different URL
    open: true
  }
});
