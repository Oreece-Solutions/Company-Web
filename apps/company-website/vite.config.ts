import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@company-web/shared/ui": path.resolve(__dirname, "../../libs/shared/ui/src"),
      "@company-web/shared/utils": path.resolve(__dirname, "../../libs/shared/utils/src"),
      "@company-web/shared/types": path.resolve(__dirname, "../../libs/shared/types/src"),
      "@company-web/shared/data-access": path.resolve(__dirname, "../../libs/shared/data-access/src"),
      "@company-web/features": path.resolve(__dirname, "../../libs/company-website/features/src"),
    },
  },
}));
