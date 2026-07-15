import { readFile } from "node:fs/promises";
import { MarkdownParseError, parse, type MarkdownDocument } from "./parse.js";

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
