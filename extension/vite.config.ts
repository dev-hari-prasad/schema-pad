import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import schemaPadTailwindConfig from "../tailwind.config";

const repositoryRoot = path.resolve(__dirname, "..");
const normalizeGlob = (value: string) => value.replaceAll("\\", "/");

export default defineConfig({
  root: __dirname,
  base: "./",
  publicDir: false,
  plugins: [
    {
      name: "schemapad-extension-no-network-runtime",
      enforce: "pre",
      transform(code, id) {
        const sourceId = path.normalize(id.split("?", 1)[0]);
        const sharedSourceRoot = `${path.join(repositoryRoot, "src")}${path.sep}`;
        const extensionSourceRoot = `${path.join(__dirname, "webview")}${path.sep}`;
        if (!sourceId.startsWith(sharedSourceRoot) && !sourceId.startsWith(extensionSourceRoot)) {
          return;
        }
        if (/\bfetch\s*\(|\b(?:XMLHttpRequest|WebSocket|EventSource)\b/u.test(code)) {
          throw new Error(`Network APIs are not allowed in the SchemaPad extension: ${sourceId}`);
        }
      },
    },
    {
      name: "schemapad-extension-css-assets",
      enforce: "pre",
      transform(code, id) {
        const sourceId = path.normalize(id.split("?", 1)[0]);
        if (sourceId !== path.join(repositoryRoot, "src", "index.css")) return;
        return code
          .replace(/^@import url\([^\n]+\);\s*/u, "")
          .replace(/@font-face\s*\{\s*font-family:\s*'InterLocal';[\s\S]*?\}\s*/u, "")
          .replaceAll("url('/fonts/", "url('../public/fonts/");
      },
    },
    react(),
  ],
  resolve: {
    alias: [
      { find: "os", replacement: path.join(__dirname, "webview", "shims", "os.ts") },
      {
        find: "lilconfig",
        replacement: path.join(__dirname, "webview", "shims", "lilconfig.ts"),
      },
      {
        find: "@/lib/chatTransport",
        replacement: path.join(__dirname, "webview", "chatTransport.ts"),
      },
      { find: "@", replacement: path.join(repositoryRoot, "src") },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          ...schemaPadTailwindConfig,
          content: [
            normalizeGlob(path.join(repositoryRoot, "src", "**", "*.{ts,tsx}")),
            normalizeGlob(path.join(__dirname, "webview", "**", "*.{ts,tsx}")),
          ],
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    modulePreload: { polyfill: false },
    outDir: path.join(__dirname, "dist", "webview"),
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: "esbuild",
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      input: path.join(__dirname, "webview", "index.html"),
      output: {
        entryFileNames: "webview.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        manualChunks(id) {
          if (id.includes("@mrleebo/prisma-ast") || id.includes("chevrotain")) {
            return "prisma-parser";
          }
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-runtime";
          }
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css") ? "webview.css" : "assets/[name][extname]",
      },
    },
  },
});
