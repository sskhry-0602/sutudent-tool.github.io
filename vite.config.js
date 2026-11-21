import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative paths allow deployment to a GitHub Pages project subpath.
  base: "./"
});