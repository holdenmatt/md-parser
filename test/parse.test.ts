import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MarkdownParseError, parse, parseFile, type MarkdownDocument } from "../src/index.js";

afterEach(() => {
  vi.doUnmock("unified");
});

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

  test("extracts fenced code block source range with language and meta", () => {
    const markdown = `---
title: Example
---

Text.

\`\`\`yaml title="tokens"
colors:
  primary: "#000"
\`\`\`
`;
    const document = parse(markdown);
    const source = '```yaml title="tokens"\ncolors:\n  primary: "#000"\n```';
    const start = document.body.indexOf(source);

    expect(document.codeBlocks).toEqual([
      {
        info: 'yaml title="tokens"',
        language: "yaml",
        meta: 'title="tokens"',
        value: 'colors:\n  primary: "#000"',
        sourceRange: {
          start,
          end: start + source.length,
        },
      },
    ]);
    expect(document.body.slice(start, start + source.length)).toBe(source);
  });

  test("extracts fenced code block source range without meta", () => {
    const document = parse(`Before.

\`\`\`ts
console.log("hello");
\`\`\`

After.
`);
    const source = '```ts\nconsole.log("hello");\n```';
    const start = document.body.indexOf(source);

    expect(document.codeBlocks).toEqual([
      {
        info: "ts",
        language: "ts",
        meta: undefined,
        value: 'console.log("hello");',
        sourceRange: {
          start,
          end: start + source.length,
        },
      },
    ]);
  });

  test("extracts source ranges for multiple code blocks", () => {
    const document = parse(`First.

\`\`\`js
console.log("one");
\`\`\`

Middle.

\`\`\`
plain text
\`\`\`

Done.
`);
    const sources = ['```js\nconsole.log("one");\n```', "```\nplain text\n```"];

    expect(document.codeBlocks).toHaveLength(2);
    expect(document.codeBlocks.map((block) => block.sourceRange)).toEqual(
      sources.map((source) => {
        const start = document.body.indexOf(source);
        return {
          start,
          end: start + source.length,
        };
      }),
    );
    expect(
      document.codeBlocks.map((block) =>
        block.sourceRange === undefined
          ? undefined
          : document.body.slice(block.sourceRange.start, block.sourceRange.end),
      ),
    ).toEqual(sources);
  });

  test("extracts indented code blocks without interpreting their language", () => {
    const document = parse(`Text.

    indented code
`);

    expect(document.codeBlocks).toEqual([
      {
        info: "",
        language: undefined,
        meta: undefined,
        value: "indented code",
        sourceRange: {
          start: 7,
          end: 24,
        },
      },
    ]);
  });

  test("returns undefined sourceRange when parser offsets are unavailable", async () => {
    vi.resetModules();
    vi.doMock("unified", () => ({
      unified: () => ({
        use: () => ({
          parse: () => ({
            type: "root",
            children: [
              {
                type: "code",
                lang: "js",
                meta: undefined,
                value: "console.log(1);",
              },
            ],
          }),
        }),
      }),
    }));

    const { parse: parseWithoutOffsets } = await import("../src/parse.js?without-offsets");

    expect(parseWithoutOffsets("```js\nconsole.log(1);\n```").codeBlocks).toEqual([
      {
        info: "js",
        language: "js",
        meta: undefined,
        value: "console.log(1);",
        sourceRange: undefined,
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
