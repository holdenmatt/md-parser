import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { MarkdownParseError, parse, parseFile, type MarkdownDocument } from "../src/index.js";

describe("parse", () => {
  test("parses frontmatter, body, and raw markdown", () => {
    const markdown = `---
title: Example
tags:
  - docs
---

# Body

Text.
`;

    const document = parse(markdown);

    expect(document.frontmatter).toEqual({ tags: ["docs"], title: "Example" });
    expect(document.body).toBe("\n# Body\n\nText.\n");
    expect(document.raw).toBe(markdown);
  });

  test("parses missing frontmatter as an empty object", () => {
    const document = parse("# Body\n");

    expect(document.frontmatter).toEqual({});
    expect(document.body).toBe("# Body\n");
  });

  test("throws for invalid frontmatter syntax", () => {
    expect(() => parse("---\ntitle: [unterminated\n---\nBody\n")).toThrow(
      expect.objectContaining({ code: "FRONTMATTER_PARSE_ERROR" }),
    );
  });

  test("extracts flat heading sections", () => {
    const document = parse(`# Intro

Lead.

## Detail

Nested.

# Next

Done.
`);

    expect(document.sections).toEqual([
      {
        heading: "Intro",
        depth: 1,
        body: "Lead.\n\n## Detail\n\nNested.",
      },
      {
        heading: "Detail",
        depth: 2,
        body: "Nested.",
      },
      {
        heading: "Next",
        depth: 1,
        body: "Done.",
      },
    ]);
  });

  test("extracts code blocks without interpreting their language", () => {
    const document = parse(`Text.

\`\`\`yaml title="tokens"
colors:
  primary: "#000"
\`\`\`

    indented code
`);

    expect(document.codeBlocks).toEqual([
      {
        info: 'yaml title="tokens"',
        language: "yaml",
        meta: 'title="tokens"',
        value: 'colors:\n  primary: "#000"',
      },
      {
        info: "",
        language: undefined,
        meta: undefined,
        value: "indented code",
      },
    ]);
  });

  test("does not expose the internal ast on the public document", () => {
    expect(parse("# Body\n")).not.toHaveProperty("ast");
  });

  test("exports public document and error types", () => {
    const document: MarkdownDocument = parse("Body");
    const error = new MarkdownParseError("EXAMPLE", "Example error");

    expect(document.body).toBe("Body");
    expect(error.code).toBe("EXAMPLE");
  });
});

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
});

async function makeTempDir() {
  return mkdtemp(join(tmpdir(), `md-parser-${randomUUID()}-`));
}
