// Written by Sailor: the app's own config, building this prototype as one relative bundle.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadConfigFromFile, mergeConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = "/home/user/repo/excalidraw/excalidraw-app/vite.config.mts";
// Plugins that only matter to the real app (offline caching, error reporting, lint and type checks, HTML rewrites) are left out.
const SKIP = /pwa|sentry|checker|eslint|html|inspect|visualizer|compression/i;

export default defineConfig(async (env) => {
  const loaded = await loadConfigFromFile(env, app).catch(() => null);
  const base = { ...(loaded?.config ?? {}) };
  const plugins = [base.plugins ?? []].flat(Infinity).filter((plugin) => plugin && !SKIP.test(plugin.name ?? ""));
  delete base.root; delete base.build; delete base.server; delete base.preview; delete base.base; delete base.publicDir;
  return mergeConfig({ ...base, plugins }, {
    root: here,
    base: "./",
    publicDir: false,
    logLevel: "warn",
    build: { outDir: path.join(here, "dist"), emptyOutDir: true, sourcemap: false, rollupOptions: { output: { inlineDynamicImports: true } } },
  });
});
