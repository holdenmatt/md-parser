import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, test } from "vitest";

describe("browser boundary", () => {
  test("bundles the root entry for browser without Node builtins", async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
      platform: "browser",
      bundle: true,
      format: "esm",
      write: false,
      metafile: true,
    });

    expect(result.outputFiles).toHaveLength(1);
    expect(Object.keys(result.metafile?.inputs ?? {})).not.toContain("node:fs/promises");
  });
});
