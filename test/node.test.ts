import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { MarkdownParseError } from "../src/index.js";
import { parseFile } from "../src/node.js";

describe("parseFile", () => {
  test("reads UTF-8 markdown files", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "document.md");
    await writeFile(path, "---\ntitle: File\n---\nBody\n", "utf8");

    await expect(parseFile(path)).resolves.toMatchObject({
      frontmatter: { title: "File" },
      body: "Body\n",
    });
  });

  test("throws file read errors", async () => {
    await expect(parseFile("/definitely/missing.md")).rejects.toThrow(MarkdownParseError);
    await expect(parseFile("/definitely/missing.md")).rejects.toMatchObject({
      code: "FILE_READ_ERROR",
    });
  });

  test("preserves parser error codes", async () => {
    const dir = await makeTempDir();
    const path = join(dir, "invalid.md");
    await writeFile(path, "---\ntitle: [unterminated\n---\nBody\n", "utf8");

    let error: unknown;
    try {
      await parseFile(path);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(MarkdownParseError);
    expect(error).toMatchObject({
      code: "FRONTMATTER_PARSE_ERROR",
    });
  });
});

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), `md-parser-${randomUUID()}-`));
}
