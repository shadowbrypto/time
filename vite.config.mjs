import { defineConfig, transformWithEsbuild } from "vite"
import react from "@vitejs/plugin-react"

// The sources are .js files that contain JSX (kept from Create React App).
// Compile their JSX first, so the React plugin sees ordinary modules and gives
// them Fast Refresh as it does .jsx files.
function jsxInJs() {
  let dev = true
  return {
    name: "jsx-in-js",
    enforce: "pre",
    configResolved(config) {
      dev = config.command === "serve"
    },
    transform(code, id) {
      if (!/\/src\/.*\.js$/.test(id.split("?")[0])) return null
      return transformWithEsbuild(code, id, { loader: "jsx", jsx: "automatic", jsxDev: dev })
    },
  }
}

export default defineConfig({
  plugins: [jsxInJs(), react({ include: /\.(js|jsx)$/ })],
  // The dependency scan reads the sources before any plugin runs.
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
  server: { port: 3000 },
  preview: { port: 3000 },
  build: {
    // Same output as before: Netlify publishes build/, and fingerprinted files
    // live under /static/ so the long-lived cache rule in netlify.toml can't
    // catch the unversioned files in public/assets/.
    outDir: "build",
    assetsDir: "static",
    // No source maps in the shipped site.
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
})
