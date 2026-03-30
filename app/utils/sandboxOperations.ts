import {
  Sandbox,
  EventSequence,
  Table,
  TableRow,
  Cell,
  OperationWithId,
  RowHeader,
} from "../types/sandbox";
import {
  FilterOperation,
  RowOperation,
  ColumnOperation,
  Operation,
} from "../types/operations";
import { getAllEventSequences } from "../storage/dataStore";
import {
  filterByPattern,
  filterAndSegmentByPattern,
  filterByRecordAttributeCategorical,
  filterByRecordAttributeNumerical,
} from "./filters";
import {
  computeNumericalColumn,
  computeCategoricalColumn,
  computeCountUniqueColumn,
  computePatternAnalysisColumn,
  computeEventAttributeAnalysisColumn,
  computeFunnelAnalysisColumn,
  computeEdgeAnalysisColumn,
} from "./columnOperations";

/**
 * Calculate the average duration in seconds for a list of event sequences
 * Duration is calculated as the time between first and last event in each sequence
 * Returns 0 if there are no sequences or all sequences have fewer than 2 events
 */
export function calculateAverageDuration(sequences: EventSequence[]): number {
  if (sequences.length === 0) {
    return 0;
  }

  let totalDuration = 0;
  let validSequenceCount = 0;

  for (const sequence of sequences) {
    if (sequence.events.length >= 2) {
      const firstEvent = sequence.events[0];
      const lastEvent = sequence.events[sequence.events.length - 1];
      const startTime = new Date(firstEvent.timestamp).getTime();
      const endTime = new Date(lastEvent.timestamp).getTime();
      const durationSeconds = (endTime - startTime) / 1000;
      totalDuration += durationSeconds;
      validSequenceCount++;
    }
  }

  if (validSequenceCount === 0) {
    return 0;
  }

  return totalDuration / validSequenceCount;
}

/**
 * Get all active filter operations from steps
 */
export function getActiveFilters(steps: OperationWithId[]): FilterOperation[] {
  return steps
    .map((step) => step.operation)
    .filter((op) => op.type === "filter") as FilterOperation[];
}

/**
 * Get all active row operations from steps
 */
export function getActiveRowOperations(
  steps: OperationWithId[]
): RowOperation[] {
  return steps
    .map((step) => step.operation)
    .filter((op) => op.type === "row") as RowOperation[];
}

/**
 * Get all active column operations from steps
 */
export function getActiveColumnOperations(
  steps: OperationWithId[]
): ColumnOperation[] {
  return steps
    .map((step) => step.operation)
    .filter((op) => op.type === "column") as ColumnOperation[];
}

/**
 * Apply filters to sequences sequentially
 * Returns filtered sequences
 */
export async function applyFilters(
  sequences: EventSequence[],
  filters: FilterOperation[]
): Promise<EventSequence[]> {
  let filtered = sequences;

  for (const filter of filters) {
    if (filter.recordAttribute.type === "categorical") {
      filtered = await filterByRecordAttributeCategorical(
        filtered,
        filter.recordAttribute.name,
        filter.recordAttribute.value
      );
    } else if (filter.recordAttribute.type === "numerical") {
      filtered = await filterByRecordAttributeNumerical(
        filtered,
        filter.recordAttribute.name,
        filter.recordAttribute.min,
        filter.recordAttribute.max
      );
    }
  }

  return filtered;
}

/**
 * Generate initial segments from all sequences after applying filters
 * This creates the "all data" row
 */
export async function generateInitialSegments(
  filters: FilterOperation[]
): Promise<EventSequence[]> {
  const allSequences = await getAllEventSequences();
  return await applyFilters(allSequences, filters);
}

/**
 * Generate cells for a row by applying all column operations
 */
export async function generateRowCells(
  sequences: EventSequence[],
  columnOperations: ColumnOperation[],
  rowIndex?: number,
  columnOffset: number = 0
): Promise<Cell[]> {
  const cells: Cell[] = [];

  for (let colIndex = 0; colIndex < columnOperations.length; colIndex++) {
    const colOp = columnOperations[colIndex];
    const actualColIndex = columnOffset + colIndex;
    const cellId = rowIndex !== undefined ? `cell-${rowIndex}-${actualColIndex}` : `cell-temp-${actualColIndex}`;
    let cell: Cell;

    switch (colOp.subType) {
      case "numerical":
        cell = await computeNumericalColumn(sequences, colOp, cellId);
        break;

      case "categorical":
        if (colOp.aggregation === "count-unique") {
          cell = await computeCountUniqueColumn(sequences, colOp, cellId);
        } else {
          cell = await computeCategoricalColumn(sequences, colOp, cellId);
        }
        break;

      case "pattern":
        if (colOp.analysis === "pattern") {
          cell = await computePatternAnalysisColumn(sequences, colOp, cellId);
        } else if (colOp.analysis === "event-attribute") {
          cell = computeEventAttributeAnalysisColumn(sequences, colOp, cellId);
        } else if (colOp.analysis === "funnel") {
          cell = computeFunnelAnalysisColumn(sequences, colOp, cellId);
        } else if (colOp.analysis === "edge") {
          cell = computeEdgeAnalysisColumn(sequences, colOp, cellId);
        } else {
          // Unknown analysis type - placeholder
          cell = {
            id: cellId,
            type: "category-distribution",
            name: "Unknown Analysis",
            distribution: [],
          };
        }
        break;

      default:
        cell = {
          id: cellId,
          type: "number",
          value: 0,
          name: "Default",
          aggregation: "sum",
        };
    }

    cells.push(cell);
  }

  return cells;
}

/**
 * Regenerate entire table from sandbox segments, steps, and optional row headers
 */
export async function regenerateTable(
  sandbox: Sandbox,
  rowHeaders?: RowHeader[]
): Promise<Table> {
  const columnOperations = getActiveColumnOperations(sandbox.steps);

  const rows: TableRow[] = [];

  // Generate cells for each row (segment list)
  for (let i = 0; i < sandbox.segments.length; i++) {
    const segmentList = sandbox.segments[i];
    const rowHeader = rowHeaders?.[i] || sandbox.table.rows[i]?.rowHeader;

    if (rowHeader) {
      const cells = await generateRowCells(segmentList, columnOperations, i);
      rows.push({
        rowHeader,
        cells,
      });
    }
  }

  return {
    header: columnOperations,
    rows,
  };
}

/**
 * Find the index of an operation in steps by operation ID
 */
export function findOperationIndex(
  steps: OperationWithId[],
  operationId: string
): number {
  return steps.findIndex((step) => step.id === operationId);
}

/**
 * Remove an operation from steps by ID
 * Returns updated steps array
 */
export function removeOperationFromSteps(
  steps: OperationWithId[],
  operationId: string
): OperationWithId[] {
  return steps.filter((step) => step.id !== operationId);
}

/**
 * Update an operation in steps by ID
 * Returns updated steps array
 */
export function updateOperationInSteps(
  steps: OperationWithId[],
  operationId: string,
  newOperation: Operation
): OperationWithId[] {
  return steps.map((step) =>
    step.id === operationId
      ? { id: step.id, operation: newOperation }
      : step
  );
}

/**
 * Get the row index that corresponds to a row operation
 * This is used to find which row to update/remove when a row operation changes
 */
export function getRowIndexForOperation(
  steps: OperationWithId[],
  operationId: string
): number {
  // The row index is determined by counting how many row operations come before this one
  let rowOpCount = 0;
  for (const step of steps) {
    if (step.operation.type === "row") {
      if (step.id === operationId) {
        return rowOpCount;
      }
      rowOpCount++;
    }
  }
  return -1; // Not found
}

/**
 * Recalculate all segments in the sandbox based on active filters and row operations
 */
export async function recalculateSegments(
  steps: OperationWithId[]
): Promise<{ segments: EventSequence[][]; rowHeaders: RowHeader[] }> {
  const activeFilters = getActiveFilters(steps);
  const rowOperations = steps
    .filter((step) => step.operation.type === "row")
    .map((step) => step.operation as RowOperation);

  const allSequences = await getAllEventSequences();
  const baseSequences = await applyFilters(allSequences, activeFilters);

  const segments: EventSequence[][] = [];
  const rowHeaders: RowHeader[] = [];
  let currentRowIndex = 0;

  for (const op of rowOperations) {
    if (op.subType === "add-one-row-by-pattern") {
      const filtered = filterAndSegmentByPattern(
        baseSequences,
        op.pattern,
        op.segment.startIndex,
        op.segment.endIndex
      );
      segments.push(filtered);
      rowHeaders.push({
        type: "pattern",
        operation: op,
        pattern: op.pattern,
        appliedFilters: activeFilters,
        sessionCount: { id: `row-header-${currentRowIndex}-session-count`, value: filtered.length },
        duration: { id: `row-header-${currentRowIndex}-duration`, value: calculateAverageDuration(filtered) },
      });
      currentRowIndex++;
    } else if (op.subType === "add-one-row-by-record-attribute") {
      let filtered: EventSequence[] = [];
      if (op.recordAttribute.type === "categorical") {
        filtered = await filterByRecordAttributeCategorical(
          baseSequences,
          op.recordAttribute.name,
          op.recordAttribute.value
        );
      } else {
        filtered = await filterByRecordAttributeNumerical(
          baseSequences,
          op.recordAttribute.name,
          op.recordAttribute.min,
          op.recordAttribute.max
        );
      }
      segments.push(filtered);
      rowHeaders.push({
        type: "record-attribute",
        operation: op,
        recordAttribute:
          op.recordAttribute.type === "numerical"
            ? {
                type: "numerical",
                name: op.recordAttribute.name,
                value: {
                  min: op.recordAttribute.min,
                  max: op.recordAttribute.max,
                },
              }
            : op.recordAttribute,
        appliedFilters: activeFilters,
        sessionCount: { id: `row-header-${currentRowIndex}-session-count`, value: filtered.length },
        duration: { id: `row-header-${currentRowIndex}-duration`, value: calculateAverageDuration(filtered) },
      });
      currentRowIndex++;
    } else if (op.subType === "add-rows-by-pattern") {
      const { mineFrequentPatterns } = await import("./patternMining");
      let analysisData: EventSequence[];
      // Apply filtering and segmentation first, then mine patterns
      analysisData = filterAndSegmentByPattern(
        baseSequences,
        op.pattern,
        op.segment.startIndex,
        op.segment.endIndex
      );
      const attributeName = op.eventAttribute;

      const patterns = await mineFrequentPatterns(analysisData, attributeName, 10);

      for (const pattern of patterns) {
        const filtered = filterByPattern(analysisData, pattern.pattern);
        segments.push(filtered);
        rowHeaders.push({
          type: "pattern",
          operation: op,
          pattern: pattern.pattern,
          appliedFilters: activeFilters,
          sessionCount: { id: `row-header-${currentRowIndex}-session-count`, value: filtered.length },
          duration: { id: `row-header-${currentRowIndex}-duration`, value: calculateAverageDuration(filtered) },
        });
        currentRowIndex++;
      }
    } else if (op.subType === "add-rows-by-record-attribute") {
      const MAX_GROUP_BY_VALUES = 100;
      const attributeName = op.recordAttribute.name;
      const valueGroups = new Map<string, EventSequence[]>();
      const { getRecordAttributes } = await import("../storage/dataStore");

      for (const seq of baseSequences) {
        const attr = await getRecordAttributes(seq.sessionId);
        if (attr) {
          const value = String(attr[attributeName]);
          if (!valueGroups.has(value)) {
            valueGroups.set(value, []);
          }
          valueGroups.get(value)!.push(seq);
        }
        if (valueGroups.size > MAX_GROUP_BY_VALUES) {
          throw new Error(
            `Cannot group by "${attributeName}" — it has more than ${MAX_GROUP_BY_VALUES} unique values. Use a count-unique categorical column instead.`
          );
        }
      }

      for (const [value, segmentList] of valueGroups.entries()) {
        segments.push(segmentList);
        rowHeaders.push({
          type: "record-attribute",
          operation: op,
          recordAttribute: {
            type: "categorical",
            name: attributeName,
            value,
          },
          appliedFilters: activeFilters,
          sessionCount: { id: `row-header-${currentRowIndex}-session-count`, value: segmentList.length },
          duration: { id: `row-header-${currentRowIndex}-duration`, value: calculateAverageDuration(segmentList) },
        });
        currentRowIndex++;
      }
    }
  }

  return { segments, rowHeaders };
}

/**
 * Get the column index that corresponds to a column operation
 */
export function getColumnIndexForOperation(
  steps: OperationWithId[],
  operationId: string
): number {
  let colOpCount = 0;
  for (const step of steps) {
    if (step.operation.type === "column") {
      if (step.id === operationId) {
        return colOpCount;
      }
      colOpCount++;
    }
  }
  return -1; // Not found
}
