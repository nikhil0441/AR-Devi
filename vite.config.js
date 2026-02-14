import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@mediapipe/face_mesh", "@mediapipe/camera_utils"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
