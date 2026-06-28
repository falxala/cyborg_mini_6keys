import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pageInputs = {
  index: "index.html",
  remapper: "remapper.html",
  diagnostics: "diagnostics.html",
};

const isRemapperDrive = (mode: string) => mode === "remapper-drive";
const isRemapperOnly = (mode: string) => mode === "remapper" || isRemapperDrive(mode);

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/cyborg_mini_6keys/" : isRemapperDrive(mode) ? "./" : "/",
  build: {
    copyPublicDir: !isRemapperDrive(mode),
    rollupOptions: {
      input: isRemapperOnly(mode) ? { remapper: pageInputs.remapper } : pageInputs,
      output: isRemapperDrive(mode)
        ? {
            assetFileNames: "[name][extname]",
            chunkFileNames: "[name].js",
            entryFileNames: "[name].js",
          }
        : undefined,
    },
  },
  plugins: [react()],
}));
