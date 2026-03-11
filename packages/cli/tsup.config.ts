import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  noExternal: [/^@scalang\//],
  skipNodeModulesBundle: true,
  platform: "node",
  target: "node18",
  splitting: false,
  clean: true,
});
