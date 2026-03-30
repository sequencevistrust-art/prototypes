/**
 * Citation grid lookup and entity highlighting utilities.
 */

import { CitationCell, CitationGrid } from "../types/citation";
import { Step, PrefixedIdGenerator } from "../types/steps";
import { DERIVED_OPERATORS, parseReference } from "./citations";
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
export function findEntityValue(steps: Step[], entityId: string): string | null {
  for (const step of steps) {
    switch (step.type) {
      case "session-count-analysis":
        if (step.sessionCount.id === entityId) {
          return step.sessionCount.value.toString();
        }
        break;
      case "event-count-analysis":
        if (step.eventCount.id === entityId) {
          return step.eventCount.value.toString();
        }
        break;
      case "duration-analysis":
        if (step.duration.id === entityId) {
          // Format duration: convert seconds to readable format
          const seconds = step.duration.value;
          if (seconds < 60) return `${Math.round(seconds)}s`;
          if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
          return `${Math.round(seconds / 3600)}h`;
        }
        break;
      case "number-analysis":
        if (step.value.id === entityId) {
          const rounded = Math.round(step.value.value * 100) / 100;
          return rounded.toString();
        }
        break;
      case "category-distribution-analysis":
        for (const item of step.distribution) {
          if (item.percentage.id === entityId) {
            const rounded = Math.round(item.percentage.value * 100) / 100;
            return rounded.toString();
          }
        }
        break;
      case "pattern-distribution-analysis":
        for (const item of step.distribution) {
          if (item.percentage.id === entityId) {
            const rounded = Math.round(item.percentage.value * 100) / 100;
            return rounded.toString();
          }
        }
        break;
      case "funnel-analysis":
        for (const item of step.funnel) {
          if (item.percentage.id === entityId) {
            const rounded = Math.round(item.percentage.value * 100) / 100;
            return rounded.toString();
          }
        }
        for (const item of step.durations) {
          if (item.id === entityId) {
            const seconds = item.value;
            if (seconds < 60) return `${Math.round(seconds)}s`;
            if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
            return `${Math.round(seconds / 3600)}h`;
          }
        }
        for (const item of step.eventCounts) {
          if (item.id === entityId) {
            return item.value.toString();
          }
        }
        break;
      case "edge-analysis":
        for (const item of step.oddsRatios) {
          if (item.oddsRatio.id === entityId) {
            const rounded = Math.round(item.oddsRatio.value * 100) / 100;
            return rounded.toString();
          }
        }
        break;
      case "no-filter":
        if (step.sessionCount.id === entityId) {
          return step.sessionCount.value.toString();
        }
        break;
    }
  }
  return null;
}

/**
 * Parse non-comma operators from a reference string.
 * e.g., "id1 * id2" → ["*"], "id1 > id2 > id3" → [">", ">"]
 */
export function parseOperators(reference: string): string[] {
  const operators: string[] = [];
  const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
  const escapedOps = nonCommaOps.map(op =>
    op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const operatorPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');
  let match;
  while ((match = operatorPattern.exec(reference)) !== null) {
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
  const grid = citationGrids.get(toolCallId)!;

  if (ids.length === 1) {
    const cell = lookupCitationCell(grid, ids[0]);
    return cell ? [...cell.steps] : null;
  }

  // Derived: combine cells with separators + comparison
  const combinedSteps: Step[] = [];
  const comparisonValues: { id: string; value: string }[] = [];
  const seenCellIds = new Set<string>();

  for (const id of ids) {
    const cell = lookupCitationCell(grid, id);
    if (cell) {
      if (!seenCellIds.has(cell.id)) {
        if (seenCellIds.size > 0) combinedSteps.push({ type: "separator" });
        combinedSteps.push(...cell.steps);
        seenCellIds.add(cell.id);
      }
      const value = findEntityValue(cell.steps, id);
      if (value) comparisonValues.push({ id, value });
    }
  }

  // Add comparison step if operators present
  const operators = parseOperators(reference);
  if (operators.length > 0 && comparisonValues.length >= 2) {
    const gen = new PrefixedIdGenerator("cmp");
    combinedSteps.push(
      createComparisonStep(gen, comparisonValues, operators, combinedSteps.length + 1)
    );
  }

  return combinedSteps.length > 0 ? combinedSteps : null;
}
