import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: "web-src",
  publicDir: "../www",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "www/assets")
    }
  }
});