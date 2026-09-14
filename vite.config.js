import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shadcn's import convention: "@/components/ui/..." resolves into src/.
    // Mirrored in tsconfig.json "paths" and components.json "aliases".
    alias: { "@": path.resolve(root, "src") },
  },
});
