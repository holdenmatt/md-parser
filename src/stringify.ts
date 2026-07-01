import matter from "gray-matter";

/**
 * Source fields needed to serialize a markdown document.
 */
export type MarkdownStringifyInput = {
  /** Frontmatter data to write, or omit for a plain body-only document. */
  frontmatter?: Record<string, unknown>;

  /** Markdown body text. */
  body: string;
};

/**
 * Serialize frontmatter and body back into markdown.
 */
export function stringify(input: MarkdownStringifyInput): string {
  if (!hasFrontmatter(input.frontmatter)) return input.body;
  return matter.stringify(input.body, input.frontmatter);
}

/**
 * Check whether frontmatter should be emitted.
 */
function hasFrontmatter(
  value: Record<string, unknown> | undefined,
): value is Record<string, unknown> {
  return value !== undefined && Object.keys(value).length > 0;
}
