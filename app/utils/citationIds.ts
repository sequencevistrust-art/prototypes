/**
 * Citation grid lookup and entity highlighting utilities.
 */

import { CitationCell, CitationGrid } from "../types/citation";
import { Step, PrefixedIdGenerator } from "../types/steps";
import { DERIVED_OPERATORS, parseReference, normalizeReference } from "./citations";
import { createComparisonStep } from "../explain/steps/convertToSteps";

/**
 * Look up a CitationCell in the grid from a reference ID.
 * Uses prefix matching — any suffix after the cell prefix is allowed,
 * enabling graceful degradation when the agent hallucinates a suffix.
 *
 * Reference ID formats (after toolCallId prefix):
 *   ...-row-header-{row}-session-count[-suffix]  → grid[row][0]
 *   ...-row-header-{row}-event-count[-suffix]    → grid[row][1]
 *   ...-row-header-{row}-duration[-suffix]       → grid[row][2]
 *   ...-cell-{row}-{col}[-suffix]                → grid[row][col+3]
 */
export function lookupCitationCell(
  citationGrid: CitationGrid,
  refId: string
): CitationCell | null {
  // Row header count (check before cell to avoid false match)
  const sessionCountMatch = refId.match(/-row-header-(\d+)-session-count/);
  if (sessionCountMatch) {
    const rowIndex = parseInt(sessionCountMatch[1], 10);
    return citationGrid[rowIndex]?.[0] ?? null;
  }

  // Row header event count
  const eventCountMatch = refId.match(/-row-header-(\d+)-event-count/);
  if (eventCountMatch) {
    const rowIndex = parseInt(eventCountMatch[1], 10);
    return citationGrid[rowIndex]?.[1] ?? null;
  }

  // Row header duration
  const durationMatch = refId.match(/-row-header-(\d+)-duration/);
  if (durationMatch) {
    const rowIndex = parseInt(durationMatch[1], 10);
    return citationGrid[rowIndex]?.[2] ?? null;
  }

  // Data cell (with any suffix)
  const cellMatch = refId.match(/-cell-(\d+)-(\d+)/);
  if (cellMatch) {
    const rowIndex = parseInt(cellMatch[1], 10);
    const colIndex = parseInt(cellMatch[2], 10);
    return citationGrid[rowIndex]?.[colIndex + 3] ?? null;
  }

  return null;
}

/**
 * Check if a string is a literal number (not a reference ID).
 */
export function isLiteralNumber(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s);
}

/**
 * Extract the toolCallId prefix from a single reference ID.
 */
function extractToolCallId(refId: string): string | null {
  const cellMatch = refId.match(/^(.+?)-cell-(\d+)-(\d+)/);
  if (cellMatch) return cellMatch[1];
  const sessionCountMatch = refId.match(/^(.+?)-row-header-(\d+)-session-count/);
  if (sessionCountMatch) return sessionCountMatch[1];
  const eventCountMatch = refId.match(/^(.+?)-row-header-(\d+)-event-count/);
  if (eventCountMatch) return eventCountMatch[1];
  const durationMatch = refId.match(/^(.+?)-row-header-(\d+)-duration/);
  if (durationMatch) return durationMatch[1];
  return null;
}

/**
 * Look up a CitationCell across multiple grids using the ID's tool call prefix.
 */
export function lookupCitationCellAcrossGrids(
  grids: Map<string, CitationGrid>,
  refId: string
): CitationCell | null {
  const tcId = extractToolCallId(refId);
  if (!tcId) return null;
  const grid = grids.get(tcId);
  if (!grid) return null;
  return lookupCitationCell(grid, refId);
}

/**
 * Return steps with the given entityId marked for highlighting.
 * Currently returns steps unchanged — highlighting is determined at render time
 * by passing the entityId to step renderers via context/props (see Task #18).
 */
export function highlightEntityInSteps(
  steps: Step[],
  _entityId: string
): Step[] {
  // Steps are returned as-is; highlighting is a render-time concern.
  // The entityId is used by the explain popup to pass to step renderers
  // which compare each IdValue.id against it.
  return steps;
}

/**
 * Extract the formatted value of a cited entity from Steps.
 * Used for building ComparisonStep in derived citations.
 */
export function findEntityValue(steps: Step[], entityId: string): { value: string; isPercentage: boolean } | null {
  for (const step of steps) {
    switch (step.type) {
      case "session-count-analysis":
        if (step.sessionCount.id === entityId) {
          return { value: step.sessionCount.value.toString(), isPercentage: false };
        }
        break;
      case "event-count-analysis":
        if (step.eventCount.id === entityId) {
          return { value: step.eventCount.value.toString(), isPercentage: false };
        }
        break;
      case "duration-analysis":
        if (step.duration.id === entityId) {
          // Format duration: convert seconds to readable format
          const seconds = step.duration.value;
          if (seconds < 60) return { value: `${Math.round(seconds)}s`, isPercentage: false };
          if (seconds < 3600) return { value: `${Math.round(seconds / 60)}m`, isPercentage: false };
          return { value: `${Math.round(seconds / 3600)}h`, isPercentage: false };
        }
        break;
      case "number-analysis":
        if (step.value.id === entityId) {
          const rounded = Math.round(step.value.value * 100) / 100;
          return { value: rounded.toString(), isPercentage: false };
        }
        break;
      case "category-distribution-analysis":
        for (const item of step.distribution) {
          if (item.percentage.id === entityId) {
            const rounded = Math.round(item.percentage.value * 100) / 100;
            return { value: rounded.toString(), isPercentage: true };
          }
        }
        break;
      case "pattern-distribution-analysis":
        for (const item of step.distribution) {
          if (item.percentage.id === entityId) {
            const rounded = Math.round(item.percentage.value * 100) / 100;
            return { value: rounded.toString(), isPercentage: true };
          }
        }
        break;
      case "funnel-analysis":
        for (const item of step.funnel) {
          if (item.percentage.id === entityId) {
            const rounded = Math.round(item.percentage.value * 100) / 100;
            return { value: rounded.toString(), isPercentage: true };
          }
        }
        for (const item of step.durations) {
          if (item.id === entityId) {
            const seconds = item.value;
            if (seconds < 60) return { value: `${Math.round(seconds)}s`, isPercentage: false };
            if (seconds < 3600) return { value: `${Math.round(seconds / 60)}m`, isPercentage: false };
            return { value: `${Math.round(seconds / 3600)}h`, isPercentage: false };
          }
        }
        for (const item of step.eventCounts) {
          if (item.id === entityId) {
            return { value: item.value.toString(), isPercentage: false };
          }
        }
        break;
      case "edge-analysis":
        for (const item of step.oddsRatios) {
          if (item.oddsRatio.id === entityId) {
            const rounded = Math.round(item.oddsRatio.value * 100) / 100;
            return { value: rounded.toString(), isPercentage: false };
          }
        }
        break;
      case "no-filter":
        if (step.sessionCount.id === entityId) {
          return { value: step.sessionCount.value.toString(), isPercentage: false };
        }
        break;
    }
  }
  return null;
}

/**
 * Parse parenthesis grouping from a reference string.
 * Returns value-index ranges for each parenthesized group.
 * e.g., "(id1 * id2) / id3" → [{ start: 0, end: 1 }]
 *        "id1 * (id2 + id3) / id4" → [{ start: 1, end: 2 }]
 */
export function parseGrouping(reference: string): { start: number; end: number }[] {
  const groups: { start: number; end: number }[] = [];
  // Normalize first to strip redundant percentage conversions
  const normalized = normalizeReference(reference);
  // Walk the reference string, tracking value index by counting non-operator tokens
  const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
  const escapedOps = nonCommaOps.map(op =>
    op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const tokenPattern = new RegExp(`\\(|\\)| (${escapedOps.join('|')}) |[^ ()]+`, 'g');

  let valueIndex = 0;
  let groupStart: number | null = null;
  let match;

  while ((match = tokenPattern.exec(normalized)) !== null) {
    const token = match[0];
    if (token === '(') {
      groupStart = valueIndex;
    } else if (token === ')') {
      if (groupStart !== null) {
        groups.push({ start: groupStart, end: valueIndex - 1 });
        groupStart = null;
      }
    } else if (token.startsWith(' ') && token.endsWith(' ') && nonCommaOps.includes(token.trim())) {
      // operator — skip
    } else {
      valueIndex++;
    }
  }

  return groups;
}

/**
 * Parse non-comma operators from a reference string.
 * e.g., "id1 * id2" → ["*"], "id1 > id2 > id3" → [">", ">"]
 */
export function parseOperators(reference: string): string[] {
  const normalized = normalizeReference(reference);
  const operators: string[] = [];
  const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
  const escapedOps = nonCommaOps.map(op =>
    op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const operatorPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');
  let match;
  while ((match = operatorPattern.exec(normalized)) !== null) {
    operators.push(match[1]);
  }
  return operators;
}

/**
 * Build combined steps array for a citation reference.
 * For single-cell references, returns the cell's steps.
 * For derived references (e.g., "id1 * id2"), combines steps
 * from each cell with separators and a comparison step.
 *
 * This matches the explain app's hover behavior (explanation-popup.tsx).
 */
export function buildCitationSteps(
  reference: string,
  citationGrids: Map<string, CitationGrid>
): Step[] | null {
  const { ids, toolCallId } = parseReference(reference);
  if (!toolCallId || !citationGrids.has(toolCallId)) return null;

  if (ids.length === 1) {
    const cell = lookupCitationCellAcrossGrids(citationGrids, ids[0]);
    return cell ? [...cell.steps] : null;
  }

  // Derived: combine cells with separators + comparison
  const combinedSteps: Step[] = [];
  const comparisonValues: { id: string; value: string; isPercentage?: boolean }[] = [];
  const seenCellIds = new Set<string>();

  for (const id of ids) {
    if (isLiteralNumber(id)) {
      comparisonValues.push({ id, value: id, isPercentage: false });
      continue;
    }
    const cell = lookupCitationCellAcrossGrids(citationGrids, id);
    if (cell) {
      if (!seenCellIds.has(cell.id)) {
        if (seenCellIds.size > 0) combinedSteps.push({ type: "separator" });
        combinedSteps.push(...cell.steps);
        seenCellIds.add(cell.id);
      }
      const found = findEntityValue(cell.steps, id);
      if (found) comparisonValues.push({ id, value: found.value, isPercentage: found.isPercentage });
    }
  }

  // Add comparison step if operators present
  const operators = parseOperators(reference);
  if (operators.length > 0 && comparisonValues.length >= 2) {
    const gen = new PrefixedIdGenerator("cmp");
    const grouping = parseGrouping(reference);
    combinedSteps.push(
      createComparisonStep(gen, comparisonValues, operators, combinedSteps.length + 1, grouping)
    );
  }

  return combinedSteps.length > 0 ? combinedSteps : null;
}
