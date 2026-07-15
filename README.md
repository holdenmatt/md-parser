# md-parser

Markdown parser primitives for frontmatter, body text, sections, code blocks, and links.

`@holdenmatt/md-parser` provides shared Markdown parser primitives for generic document structure. It parses untyped frontmatter, frontmatter-free body text, flat heading sections, code blocks, and ordinary inline links without assigning application meaning to the content.

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
document.codeBlocks; // code blocks with body-relative source ranges
document.links; // ordinary inline links with body-relative source ranges

const markdown = stringify({
  frontmatter: { title: "Example" },
  body: "## Notes\n\nBody text.\n",
});
```

Node filesystem IO is available from the Node-only subpath:

```ts
import { parseFile } from "@holdenmatt/md-parser/node";

const document = await parseFile("notes.md");
```

## API

### `parse(markdown)`

Parses a Markdown string and returns a `MarkdownDocument`.

### `parseFile(path)`

Reads a UTF-8 Markdown file and returns a `Promise<MarkdownDocument>`. Import it from `@holdenmatt/md-parser/node`.

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
  links: MarkdownLink[];
};
```

Code blocks expose a `sourceRange` when parser offsets are available:

```ts
type MarkdownCodeBlock = {
  info: string;
  language: string | undefined;
  meta: string | undefined;
  value: string;
  sourceRange: MarkdownSourceRange | undefined;
};

type MarkdownSourceRange = {
  start: number;
  end: number;
};
```

`sourceRange` offsets are relative to `MarkdownDocument.body`, not the original raw Markdown with frontmatter.

Links are a narrow structural projection of ordinary inline Markdown links:

```ts
type MarkdownLink = {
  text: string;
  destination: string;
  sourceRange: MarkdownSourceRange | undefined;
};
```

`text` is a plain-text label extracted from the link contents. `destination` is the URL reported by the Markdown parser. Images are excluded, and destinations are not resolved, decoded, validated, or interpreted.

Frontmatter is intentionally untyped. Application packages can refine it with their own schemas, or use [`@holdenmatt/md-schema`](https://github.com/holdenmatt/md-schema) for typed frontmatter parsing.

Parse and file-read failures throw `MarkdownParseError`. See [SPEC.md](./SPEC.md) for the structural parsing contract.
