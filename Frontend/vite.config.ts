import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  //base: mode === "production" ? "/dangotechrentalmanagement/frontend/" : "/",  //this is for ec2 deployment
  base: mode === "production" ? "./" : "/",
  server: {
    host: "localhost",
    port: 8080,
  },
  build: {
    outDir: "build",  // Ensure the build output is in dist/
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["/*"], // Ensures all assets are included
}));
