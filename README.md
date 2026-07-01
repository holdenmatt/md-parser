# md-parser

Markdown parser primitives for frontmatter, body text, sections, and code blocks.

`@holdenmatt/md-parser` provides shared Markdown parser primitives for generic document structure. It parses untyped frontmatter, frontmatter-free body text, flat heading sections, and code blocks without assigning application meaning to the content.

## Install

```sh
npm install @holdenmatt/md-parser
```

## Usage

```ts
import { parse, stringify } from "@holdenmatt/md-parser";

const document = parse(`---
title: Example
---

## Notes

Body text.
`);

document.raw; // original markdown
document.frontmatter; // Record<string, unknown>
document.body; // markdown without frontmatter
document.sections[0]?.heading; // "Notes"
document.codeBlocks; // fenced and indented code blocks

const markdown = stringify({
  frontmatter: { title: "Example" },
  body: "## Notes\n\nBody text.\n",
});
```

## API

### `parse(markdown)`

Parses a Markdown string and returns a `MarkdownDocument`.

### `parseFile(path)`

Reads a UTF-8 Markdown file and returns a `Promise<MarkdownDocument>`.

### `stringify({ frontmatter, body })`

Serializes frontmatter and body text back into Markdown. Empty or omitted frontmatter returns the body unchanged.

### `MarkdownDocument`

`parse` returns one canonical document shape:

```ts
type MarkdownDocument = {
  raw: string;
  frontmatter: Record<string, unknown>;
  body: string;
  sections: MarkdownSection[];
  codeBlocks: MarkdownCodeBlock[];
};
```

Frontmatter is intentionally untyped. Application packages can refine it with their own schemas, or use [`@holdenmatt/md-schema`](https://github.com/holdenmatt/md-schema) for typed frontmatter parsing.

Parse and file-read failures throw `MarkdownParseError`. See [SPEC.md](./SPEC.md) for the structural parsing contract.
