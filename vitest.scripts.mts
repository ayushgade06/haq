import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// ponytail: Vitest doubles as the TypeScript runner for `npm run eval` and `npm run samples`
// (path aliases + TS with zero extra dependencies). Swap for tsx if scripts grow.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["evals/run.ts", "scripts/*.ts"], testTimeout: 900_000, fileParallelism: false },
});
