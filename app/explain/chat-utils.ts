import { MessagePart, Citation } from "./chat-types";

// Re-export shared utilities for backward compatibility
export { DERIVED_OPERATORS, parseReference, parseCitations } from "../utils/citations";

// Re-export extracted functions for backward compatibility
export { buildExplanationMap, extractCitationReferences } from "../utils/explanationMap";

/**
 * Preprocess content to fix common LaTeX/formatting issues
 * Converts LaTeX arrow notation to Unicode arrows
 */
export function preprocessContent(content: string): string {
  return content
    .replace(/\$\\rightarrow\$/g, '\u2192')
    .replace(/\$\\leftarrow\$/g, '\u2190')
    .replace(/\$\\leftrightarrow\$/g, '\u2194');
}

/**
 * Extract raw response text from message parts
 */
export function getRawResponse(parts: MessagePart[]): string {
  return parts
    .filter((p): p is { type: "text"; content: string; citations?: Citation[] } => p.type === "text")
    .map(p => p.content)
    .join("\n");
}
