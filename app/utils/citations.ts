/**
 * Shared citation utilities used by both explore and explain apps.
 */

// Operators used in derived citations (comma added for linking related cells)
export const DERIVED_OPERATORS = ['+', '-', '*', '/', '>', '<', '=', '~', ','];

/**
 * Citation information parsed from text
 */
export interface Citation {
  id: string;
  reference: string;
  text: string;
  startIndex: number;
  endIndex: number;
  reason?: string;
}

/**
 * Parse a reference string to extract individual IDs
 * Handles both single references and derived references with operators
 * Supports multiple chained operators: "id1 + id2 + id3" or "id1 > id2 > id3"
 * Returns { ids: string[], toolCallId: string | null }
 */
export function parseReference(reference: string): { ids: string[]; toolCallId: string | null } {
  // Normalize comma separators: ensure commas are surrounded by spaces
  // so the operator split pattern (which requires ` , `) can match them.
  // Replace any comma not already surrounded by spaces with ` , `.
  let normalized = reference.replace(/\s*,\s*/g, ' , ');

  // Build a regex pattern that matches any operator surrounded by spaces
  const escapedOps = DERIVED_OPERATORS.map(op =>
    op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const operatorPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');

  // Split by any operator pattern to get all IDs
  const ids = normalized.split(operatorPattern)
    .filter(part => !DERIVED_OPERATORS.includes(part))
    .map(p => p.trim())
    // Strip leading/trailing parentheses left over from expressions like "(id1 + id2) / id3"
    .map(p => p.replace(/^\(+/, '').replace(/\)+$/, ''))
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // If no valid IDs found, treat the whole reference as a single ID
  if (ids.length === 0) {
    ids.push(reference.trim());
  }

  // Extract toolCallId from the first valid ID (prefix matching)
  let toolCallId: string | null = null;
  for (const id of ids) {
    const cellMatch = id.match(/^(.+?)-cell-(\d+)-(\d+)/);
    const sessionCountMatch = id.match(/^(.+?)-row-header-(\d+)-session-count(?:-|$)/);
    const eventCountMatch = id.match(/^(.+?)-row-header-(\d+)-event-count(?:-|$)/);
    const durationMatch = id.match(/^(.+?)-row-header-(\d+)-duration(?:-|$)/);

    if (cellMatch) {
      toolCallId = cellMatch[1];
      break;
    } else if (sessionCountMatch) {
      toolCallId = sessionCountMatch[1];
      break;
    } else if (eventCountMatch) {
      toolCallId = eventCountMatch[1];
      break;
    } else if (durationMatch) {
      toolCallId = durationMatch[1];
      break;
    }
  }

  return { ids, toolCallId };
}

/**
 * Parse citations from text content
 * Extracts <cite referenceIds="...">text</cite> tags and returns content WITH tags plus citation metadata
 */
export function parseCitations(text: string): { content: string; citations: Citation[] } {
  const citations: Citation[] = [];
  const citeRegex = /<cite\s+referenceIds="([^"]+)">([\s\S]*?)<\/cite>/g;
  let match;
  let citationId = 0;

  while ((match = citeRegex.exec(text)) !== null) {
    citations.push({
      id: `cite-${citationId++}`,
      reference: match[1],
      text: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return { content: text, citations };
}

/**
 * Build a character-level position map from text with tags to stripped text.
 * Returns the stripped text and a map where map[strippedIndex] = originalIndex.
 * @param tagNames - tag names to strip (default: ["cite"]). Supports self-closing and attributes.
 */
export function buildPositionMap(
  textWithTags: string,
  tagNames: string[] = ["cite"]
): {
  strippedText: string;
  map: number[];
} {
  const pattern = tagNames.map((t) => `<\\/?${t}[^>]*>`).join("|");
  const tagRegex = new RegExp(pattern, "g");
  let stripped = "";
  const map: number[] = [];
  let lastEnd = 0;
  let match;

  while ((match = tagRegex.exec(textWithTags)) !== null) {
    for (let i = lastEnd; i < match.index; i++) {
      map.push(i);
      stripped += textWithTags[i];
    }
    lastEnd = match.index + match[0].length;
  }
  for (let i = lastEnd; i < textWithTags.length; i++) {
    map.push(i);
    stripped += textWithTags[i];
  }

  return { strippedText: stripped, map };
}

/**
 * Parsed error tag information.
 */
export interface ErrorTag {
  id: string;
  referenceId: string;
  errorId: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse <error referenceIds="..." errorId="...">text</error> tags from text.
 */
export function parseErrorTags(text: string): { content: string; errors: ErrorTag[] } {
  const errors: ErrorTag[] = [];
  const errorRegex = /<error\s+referenceIds="([^"]+)"\s+errorId="([^"]+)">([\s\S]*?)<\/error>/g;
  let match;
  let errorCount = 0;

  while ((match = errorRegex.exec(text)) !== null) {
    errors.push({
      id: `error-${errorCount++}`,
      referenceId: match[1],
      errorId: match[2],
      text: match[3],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return { content: text, errors };
}
