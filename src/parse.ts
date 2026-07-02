import { readFile } from "node:fs/promises";
import type { Code, Content, Heading, Root } from "mdast";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";

/** Error thrown when parsing or file reading fails. */
export class MarkdownParseError<TCode extends string = string> extends Error {
  /** Machine-readable error code. */
  readonly code: TCode;

  /** Original error or diagnostic details, when available. */
  readonly details: unknown;

  constructor(code: TCode, message: string, details?: unknown) {
    super(message);
    this.name = "MarkdownParseError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Parsed markdown document with raw text and structural views of the body.
 */
export type MarkdownDocument = {
  /** Original input markdown. */
  raw: string;

  /** Parsed frontmatter data, or an empty object when no frontmatter exists. */
  frontmatter: Record<string, unknown>;

  /** Markdown body with any frontmatter removed. */
  body: string;

  /** Flat heading sections from the body. */
  sections: MarkdownSection[];

  /** Code blocks from the body. */
  codeBlocks: MarkdownCodeBlock[];
};

/**
 * Markdown body content owned by a heading.
 */
export type MarkdownSection = {
  /** Plain text heading content. */
  heading: string;

  /** Markdown heading depth, from 1 through 6. */
  depth: number;

  /** Section content until the next same-or-higher heading. */
  body: string;
};

/**
 * Character range in parsed Markdown body text.
 */
export type MarkdownSourceRange = {
  /** Inclusive start offset. */
  start: number;

  /** Exclusive end offset. */
  end: number;
};

/**
 * Markdown code block from the body.
 */
export type MarkdownCodeBlock = {
  /** Full code fence info string, reconstructed from language and meta. */
  info: string;

  /** Code fence language, when present. */
  language: string | undefined;

  /** Code fence metadata after the language, when present. */
  meta: string | undefined;

  /** Code block content. */
  value: string;

  /** Full source range in MarkdownDocument.body, when parser offsets are available. */
  sourceRange: MarkdownSourceRange | undefined;
};

const markdownParser = unified().use(remarkParse);

/**
 * Parse markdown into one canonical document shape.
 */
export function parse(markdown: string): MarkdownDocument {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(markdown);
  } catch (error) {
    throw new MarkdownParseError(
      "FRONTMATTER_PARSE_ERROR",
      "Could not parse markdown frontmatter.",
      error,
    );
  }

  try {
    const ast = markdownParser.parse(parsed.content) as Root;

    return {
      raw: markdown,
      frontmatter: toFrontmatterRecord(parsed.data),
      body: parsed.content,
      sections: extractSections(parsed.content, ast),
      codeBlocks: extractCodeBlocks(ast),
    };
  } catch (error) {
    throw new MarkdownParseError("MARKDOWN_PARSE_ERROR", "Could not parse markdown body.", error);
  }
}

/**
 * Read a UTF-8 markdown file and parse it.
 */
export async function parseFile(path: string): Promise<MarkdownDocument> {
  try {
    return parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof MarkdownParseError) throw error;
    throw new MarkdownParseError("FILE_READ_ERROR", `Could not read file: ${path}`, error);
  }
}

/**
 * Build flat heading sections from body offsets reported by mdast.
 */
function extractSections(body: string, ast: Root): MarkdownSection[] {
  const headings = ast.children
    .map((node, index) => (node.type === "heading" ? { node, index } : undefined))
    .filter((item): item is { node: Heading; index: number } => item !== undefined);

  return headings.flatMap(({ node }, index) => {
    const start = node.position?.end.offset;
    if (start === undefined) return [];

    const next = headings.slice(index + 1).find((heading) => heading.node.depth <= node.depth);
    const end = next?.node.position?.start.offset ?? body.length;

    return [
      {
        heading: textFromNode(node),
        depth: node.depth,
        body: trimBlankLines(body.slice(start, end)),
      },
    ];
  });
}

/**
 * Collect code blocks without assigning meaning to their language.
 */
function extractCodeBlocks(ast: Root): MarkdownCodeBlock[] {
  const blocks: MarkdownCodeBlock[] = [];
  visit(ast, (node) => {
    if (node.type !== "code") return;

    const code = node as Code;
    const language = code.lang ?? undefined;
    const meta = code.meta ?? undefined;
    const info = [language, meta].filter((value) => value !== undefined && value !== "").join(" ");

    blocks.push({
      info,
      language,
      meta,
      value: code.value,
      sourceRange: sourceRangeFromPosition(code.position),
    });
  });

  return blocks;
}

/**
 * Convert parser offsets into the public source range shape.
 */
function sourceRangeFromPosition(position: Code["position"]): MarkdownSourceRange | undefined {
  const start = position?.start.offset;
  const end = position?.end.offset;
  if (start === undefined || end === undefined) return undefined;

  return { start, end };
}

/**
 * Walk the mdast tree depth-first.
 */
function visit(node: Content | Root, visitor: (node: Content | Root) => void): void {
  visitor(node);
  if (!("children" in node)) return;

  for (const child of node.children) {
    visit(child, visitor);
  }
}

/**
 * Collapse a heading node to its readable text.
 */
function textFromNode(node: Content): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if (!("children" in node)) return "";

  return node.children.map((child) => textFromNode(child)).join("");
}

/**
 * Remove blank padding around extracted section bodies.
 */
function trimBlankLines(value: string): string {
  return value.replace(/^(?:[ \t]*\r?\n)+/, "").replace(/(?:\r?\n[ \t]*)+$/, "");
}

/**
 * Keep the public frontmatter shape object-like and predictable.
 */
function toFrontmatterRecord(value: unknown): Record<string, unknown> {
  return isPlainRecord(value) ? value : {};
}

/**
 * Check for a non-array object suitable for frontmatter data.
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
