# md-parser spec

md-parser parses one Markdown document into stable structural views and can stringify frontmatter plus body text back into Markdown.

## Scope

- md-parser parses document structure, not document meaning.
- Frontmatter remains untyped; application packages refine it.
- The package does not define application semantics for headings, code block languages, link destinations, directives, macros, or other Markdown content.

## Parse

- `parse(markdown)` returns `{ raw, frontmatter, body, sections, codeBlocks, links }`.
- `raw` is the original input string.
- `frontmatter` is parsed YAML data or `{}`.
- Invalid frontmatter fails.
- `body` is Markdown with frontmatter removed.
- `parseFile(path)` reads UTF-8 text before parsing.
- Parse and file failures throw `MarkdownParseError`.
- The public `MarkdownDocument` shape does not expose the internal Markdown AST.

## Sections

- Sections are a flat list built from body headings.
- A section owns content until the next heading of the same or shallower depth.
- Section body text is trimmed of surrounding blank lines.
- Section headings are plain readable text.

## Code Blocks

- Code blocks come from the parsed body structure.
- Each block exposes `info`, `language`, `meta`, `value`, and `sourceRange`.
- `sourceRange` is `{ start, end }` when parser offsets are available.
- `sourceRange` offsets are relative to `MarkdownDocument.body`.
- Code block language and metadata are not interpreted.

## Links

- Links are a narrow structural projection of ordinary inline Markdown links.
- Images are excluded from `links`.
- Each link exposes `text`, `destination`, and `sourceRange`.
- `text` is the plain-text label extracted from the link child content.
- `destination` is the URL reported by the Markdown parser.
- `sourceRange` is `{ start, end }` when parser offsets are available.
- `sourceRange` offsets are relative to `MarkdownDocument.body`.
- Link destinations are not resolved, decoded, validated, or interpreted.
- Reference-style links, unresolved references, autolinks, and bare URLs are unspecified.

## Stringify

- `stringify({ frontmatter, body })` serializes frontmatter and body text.
- Empty or omitted frontmatter returns the body unchanged.
- Stringify does not use `sections`, `codeBlocks`, or `links`.
