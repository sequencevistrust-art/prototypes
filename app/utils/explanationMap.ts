import { MessagePart, Message, ExplanationMap } from "../types/chat";
import { Step, PrefixedIdGenerator } from "../types/steps";
import { lookupCitationCell, highlightEntityInSteps, findEntityValue } from "./citationIds";
import { createComparisonStep } from "../explain/steps/convertToSteps";
import { CitationGrid } from "../types/citation";
import { DERIVED_OPERATORS, parseReference } from "./citations";

export type { ExplanationMap };

/**
 * Extract all unique citation references from message parts, including the fact text.
 */
export function extractCitationReferences(parts: MessagePart[]): { reference: string; toolCallId: string | null; fact: string }[] {
  const references: { reference: string; toolCallId: string | null; fact: string }[] = [];
  const seenReferences = new Set<string>();
  const citeRegex = /<cite\s+referenceIds="([^"]+)">([\s\S]*?)<\/cite>/g;

  for (const part of parts) {
    if (part.type !== "text") continue;
    const content = part.content;

    let match;
    while ((match = citeRegex.exec(content)) !== null) {
      const reference = match[1];
      if (!seenReferences.has(reference)) {
        seenReferences.add(reference);
        const { toolCallId } = parseReference(reference);

        // Extract the sentence containing this citation
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        let sentenceStart = matchStart;
        let sentenceEnd = matchEnd;

        // Find start of sentence
        for (let i = matchStart - 1; i >= 0; i--) {
          const char = content[i];
          if (char === '.' || char === '!' || char === '?') {
            sentenceStart = i + 1;
            break;
          }
          if (i === 0) sentenceStart = 0;
        }

        // Find end of sentence
        for (let i = matchEnd; i < content.length; i++) {
          const char = content[i];
          if (char === '.' || char === '!' || char === '?') {
            sentenceEnd = i + 1;
            break;
          }
          if (i === content.length - 1) sentenceEnd = content.length;
        }

        const fact = content.slice(sentenceStart, sentenceEnd).trim();
        references.push({ reference, toolCallId, fact });
      }
    }
    citeRegex.lastIndex = 0;
  }

  return references;
}

/**
 * Build explanation map for all citation references in a message.
 * Maps reference ID -> explanation steps.
 * Uses citationGrid for all lookups (single and derived).
 */
export function buildExplanationMap(
  parts: MessagePart[],
  allMessages: Message[]
): ExplanationMap {
  const citations = extractCitationReferences(parts);
  if (citations.length === 0) return {};

  const explanationMap: ExplanationMap = {};

  for (const citation of citations) {
    // Skip if we already have this reference
    if (explanationMap[citation.reference]) continue;

    // Find tool call result for this citation
    let toolCallResult: { citationGrid?: CitationGrid } | null = null;
    if (citation.toolCallId) {
      for (const msg of allMessages) {
        if (msg.role === "assistant") {
          for (const part of msg.parts) {
            if (
              part.type === "tool-call" &&
              part.toolCall.toolCallId === citation.toolCallId &&
              part.toolCall.result
            ) {
              toolCallResult = part.toolCall.result;
              break;
            }
          }
        }
        if (toolCallResult) break;
      }
    }

    let explanationSteps: Step[] = [];
    const citationGrid: CitationGrid | undefined = toolCallResult?.citationGrid;

    if (citationGrid) {
      const { ids } = parseReference(citation.reference);

      // Parse operators from reference (excluding comma)
      const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
      const escapedOps = nonCommaOps.map(op =>
        op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      const operatorPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');
      const operators: string[] = [];
      let match;
      while ((match = operatorPattern.exec(citation.reference)) !== null) {
        operators.push(match[1]);
      }

      if (ids.length === 1) {
        // Single reference — look up and highlight
        const cell = lookupCitationCell(citationGrid, ids[0]);
        if (cell) {
          explanationSteps = highlightEntityInSteps(cell.steps, ids[0]);
        }
      } else if (ids.length >= 2) {
        // Derived reference — look up each cell, combine with separators + comparison
        // Deduplicate by cell ID: if multiple IDs resolve to the same cell,
        // show the cell steps only once and highlight all referenced values
        const comparisonValues: { id: string; value: string }[] = [];
        const seenCellIds = new Set<string>();

        for (const id of ids) {
          const cell = lookupCitationCell(citationGrid, id);
          if (cell) {
            // Only add cell steps once per unique cell
            if (!seenCellIds.has(cell.id)) {
              if (seenCellIds.size > 0) {
                explanationSteps.push({ type: "separator" });
              }
              const highlighted = highlightEntityInSteps(cell.steps, id);
              explanationSteps.push(...highlighted);
              seenCellIds.add(cell.id);
            }

            // Always extract value for comparison (even for deduplicated cells)
            const value = findEntityValue(cell.steps, id);
            if (value) {
              comparisonValues.push({ id, value });
            }
          }
        }

        // Add comparison step if we have operators and enough values
        if (operators.length > 0 && comparisonValues.length >= 2) {
          const gen = new PrefixedIdGenerator("cmp");
          const comparisonStep = createComparisonStep(
            gen,
            comparisonValues,
            operators,
            explanationSteps.length + 1
          );
          explanationSteps.push(comparisonStep);
        }
      }
    }

    explanationMap[citation.reference] = explanationSteps;
  }

  return explanationMap;
}
