import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
      {
        find: "@company-web/shared/ui",
        replacement: path.resolve(__dirname, "../../libs/shared/ui/src"),
      },
      {
        find: "@company-web/shared/utils",
        replacement: path.resolve(__dirname, "../../libs/shared/utils/src"),
      },
      {
        find: "@company-web/shared/types",
        replacement: path.resolve(__dirname, "../../libs/shared/types/src"),
      },
      {
        find: "@company-web/shared/data-access",
        replacement: path.resolve(__dirname, "../../libs/shared/data-access/src"),
      },
      {
        find: "@company-web/features",
        replacement: path.resolve(__dirname, "../../libs/company-website/features/src"),
      },
    ],
  }
}));
