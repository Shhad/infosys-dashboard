import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server runs on 3000 — the origin both auth-service and task-service
// already allow via CORS. API base URLs come from build-time VITE_* env vars.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
});
