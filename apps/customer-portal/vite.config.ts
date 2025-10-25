import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@company-web/shared/ui": path.resolve(__dirname, "../../libs/shared/ui/src"),
      "@company-web/shared/utils": path.resolve(__dirname, "../../libs/shared/utils/src"),
      "@company-web/shared/types": path.resolve(__dirname, "../../libs/shared/types/src"),
      "@company-web/shared/data-access": path.resolve(__dirname, "../../libs/shared/data-access/src"),
    },
  },
}));
