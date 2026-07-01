import { describe, expect, test } from "vitest";
import { stringify, type MarkdownStringifyInput } from "../src/index.js";

describe("stringify", () => {
  test("serializes frontmatter and body", () => {
    expect(
      stringify({
        frontmatter: {
          tags: ["docs"],
          title: "Example",
        },
        body: "# Body\n",
      }),
    ).toBe(`---
tags:
  - docs
title: Example
---
# Body
`);
  });

  test("returns the body unchanged when frontmatter is empty", () => {
    const input: MarkdownStringifyInput = {
      frontmatter: {},
      body: "# Body\n",
    };

    expect(stringify(input)).toBe("# Body\n");
  });

  test("returns the body unchanged when frontmatter is omitted", () => {
    expect(stringify({ body: "# Body\n" })).toBe("# Body\n");
  });
});
