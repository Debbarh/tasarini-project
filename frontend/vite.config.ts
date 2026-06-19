import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // En production : on retire les console.log/info/debug (bruit console) mais on
  // GARDE console.error/warn (visibilité des vraies erreurs). Les scripts tiers
  // (TravelPayouts, affiliés) loggent dans leur propre bundle — non concernés.
  esbuild: mode === "production" ? { pure: ["console.log", "console.info", "console.debug"] } : {},
}));
