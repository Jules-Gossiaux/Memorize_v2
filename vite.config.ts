import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "src/popup/index.html",
        options: "src/options/index.html",
        background: "src/background.ts",
        content: "src/content.ts",
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
