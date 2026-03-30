import {
  Sandbox,
  EventSequence,
  TableRow,
} from "../types/sandbox";
import {
  FilterOperation,
  RowOperation,
  ColumnOperation,
  Operation,
} from "../types/operations";
import {
  getActiveFilters,
  applyFilters,
  regenerateTable,
  generateRowCells,
  recalculateSegments,
  calculateAverageDuration,
  calculateEventCount,
} from "./sandboxOperations";
import {
  filterByPattern,
  filterAndSegmentByPattern,
  filterByRecordAttributeCategorical,
  filterByRecordAttributeNumerical,
} from "./filters";
import { getAllEventSequences } from "../storage/dataStore";

/**
 * Handle filter operations
 * Filters affect all existing rows (segments) in the sandbox
 */
async function handleFilterOperation(
  sandbox: Sandbox,
  operation: FilterOperation
): Promise<Sandbox> {
  // Recalculate all segments with all steps including the new filter
  const { segments, rowHeaders } = await recalculateSegments(sandbox.steps);

  const updatedSandbox = {
    ...sandbox,
    segments: segments,
  };

  // Regenerate the entire table with updated row headers
  updatedSandbox.table = await regenerateTable(updatedSandbox, rowHeaders);

  return updatedSandbox;
}

/**
 * Handle row operations that add one row
 */
async function handleAddOneRowOperation(
  sandbox: Sandbox,
  operation: RowOperation
): Promise<Sandbox> {
  let newSegmentList: EventSequence[] = [];
  const allSequences = await getAllEventSequences();

  // Apply existing filters first
  const activeFilters = getActiveFilters(sandbox.steps);
  const baseSequences = await applyFilters(allSequences, activeFilters);

  if (operation.subType === "add-one-row-by-pattern") {
    // Filter and segment by pattern
    newSegmentList = filterAndSegmentByPattern(
      baseSequences,
      operation.pattern,
      operation.segment.startIndex,
      operation.segment.endIndex
    );
  } else if (
    operation.subType === "add-one-row-by-record-attribute" &&
    operation.recordAttribute.type === "categorical"
  ) {
    // Filter by categorical record attribute
    newSegmentList = await filterByRecordAttributeCategorical(
      baseSequences,
      operation.recordAttribute.name,
      operation.recordAttribute.value
    );
  } else if (
    operation.subType === "add-one-row-by-record-attribute" &&
    operation.recordAttribute.type === "numerical"
  ) {
    // Filter by numerical record attribute
    newSegmentList = await filterByRecordAttributeNumerical(
      baseSequences,
      operation.recordAttribute.name,
      operation.recordAttribute.min,
      operation.recordAttribute.max
    );
  }

  // Add new segment list to segments
  const newSegments = [...sandbox.segments, newSegmentList];

  // Generate cells for the new row using existing column operations
  const columnOperations = sandbox.table.header;
  const newRowIndex = sandbox.table.rows.length; // This will be the index of the new row
  const cells = await generateRowCells(newSegmentList, columnOperations, newRowIndex);

  // Create new row header
  let newRowHeader;
  if (operation.subType === "add-one-row-by-pattern") {
    newRowHeader = {
      type: "pattern" as const,
      operation,
      pattern: operation.pattern,
      appliedFilters: activeFilters,
      sessionCount: { id: `row-header-${newRowIndex}-session-count`, value: newSegmentList.length },
      eventCount: { id: `row-header-${newRowIndex}-event-count`, value: calculateEventCount(newSegmentList) },
      duration: { id: `row-header-${newRowIndex}-duration`, value: calculateAverageDuration(newSegmentList) },
    };
  } else if (operation.subType === "add-one-row-by-record-attribute") {
    // Must be add-one-row-by-record-attribute with categorical or numerical
    newRowHeader = {
      type: "record-attribute" as const,
      operation,
      recordAttribute:
        operation.recordAttribute.type === "numerical"
          ? {
              type: "numerical" as const,
              name: operation.recordAttribute.name,
              value: {
                min: operation.recordAttribute.min,
                max: operation.recordAttribute.max,
              },
            }
          : operation.recordAttribute,
      appliedFilters: activeFilters,
      sessionCount: { id: `row-header-${newRowIndex}-session-count`, value: newSegmentList.length },
      eventCount: { id: `row-header-${newRowIndex}-event-count`, value: calculateEventCount(newSegmentList) },
      duration: { id: `row-header-${newRowIndex}-duration`, value: calculateAverageDuration(newSegmentList) },
    };
  } else {
    // Fallback (shouldn't happen in this function)
    throw new Error(`Unexpected operation subType: ${operation.subType}`);
  }

  // Add new row to table
  const newRow: TableRow = {
    rowHeader: newRowHeader,
    cells,
  };

  return {
    ...sandbox,
    segments: newSegments,
    table: {
      ...sandbox.table,
      rows: [...sandbox.table.rows, newRow],
    },
  };
}

/**
 * Handle row operations that add multiple rows
 */
async function handleAddMultipleRowsOperation(
  sandbox: Sandbox,
  operation: RowOperation
): Promise<Sandbox> {
  const allSequences = await getAllEventSequences();
  const activeFilters = getActiveFilters(sandbox.steps);
  const baseSequences = await applyFilters(allSequences, activeFilters);

  let newSegmentLists: EventSequence[][] = [];
  let newRows: TableRow[] = [];

  if (operation.subType === "add-rows-by-pattern") {
    let segmentedSequences: EventSequence[];
    // Apply filtering and segmentation first, then mine patterns
    segmentedSequences = filterAndSegmentByPattern(
      baseSequences,
      operation.pattern,
      operation.segment.startIndex,
      operation.segment.endIndex
    );
    const attributeName = operation.eventAttribute;

    // Mine frequent patterns from the data
    const { mineFrequentPatterns } = await import("./patternMining");
    const patterns = await mineFrequentPatterns(segmentedSequences, attributeName, 10);

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const segmentList = filterByPattern(segmentedSequences, pattern.pattern);
      newSegmentLists.push(segmentList);

      const rowIndex = sandbox.table.rows.length + i; // Calculate the row index for the new row
      const cells = await generateRowCells(segmentList, sandbox.table.header, rowIndex);
      newRows.push({
        rowHeader: {
          type: "pattern",
          operation,
          pattern: pattern.pattern,
          appliedFilters: activeFilters,
          sessionCount: { id: `row-header-${rowIndex}-session-count`, value: segmentList.length },
          eventCount: { id: `row-header-${rowIndex}-event-count`, value: calculateEventCount(segmentList) },
          duration: { id: `row-header-${rowIndex}-duration`, value: calculateAverageDuration(segmentList) },
        },
        cells,
      });
    }
  } else if (operation.subType === "add-rows-by-record-attribute") {
    // Group by record attribute values
    const MAX_GROUP_BY_VALUES = 100;
    const attributeName = operation.recordAttribute.name;
    const valueGroups = new Map<string, EventSequence[]>();

    for (const seq of baseSequences) {
      const recordAttr = (await import("../storage/dataStore")).getRecordAttributes;
      const attr = await recordAttr(seq.sessionId);
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

    // Create a row for each unique value
    let rowOffset = 0;
    for (const [value, segmentList] of valueGroups.entries()) {
      newSegmentLists.push(segmentList);

      const rowIndex = sandbox.table.rows.length + rowOffset;
      const cells = await generateRowCells(segmentList, sandbox.table.header, rowIndex);
      newRows.push({
        rowHeader: {
          type: "record-attribute",
          operation,
          recordAttribute: {
            type: "categorical",
            name: attributeName,
            value,
          },
          appliedFilters: activeFilters,
          sessionCount: { id: `row-header-${rowIndex}-session-count`, value: segmentList.length },
          eventCount: { id: `row-header-${rowIndex}-event-count`, value: calculateEventCount(segmentList) },
          duration: { id: `row-header-${rowIndex}-duration`, value: calculateAverageDuration(segmentList) },
        },
        cells,
      });
      rowOffset++;
    }
  }

  return {
    ...sandbox,
    segments: [...sandbox.segments, ...newSegmentLists],
    table: {
      ...sandbox.table,
      rows: [...sandbox.table.rows, ...newRows],
    },
  };
}

/**
 * Handle column operations
 * Adds a new cell to each existing row
 */
async function handleColumnOperation(
  sandbox: Sandbox,
  operation: ColumnOperation
): Promise<Sandbox> {
  // Add operation to header
  const newHeader = [...sandbox.table.header, operation];

  // Generate new cell for each row
  const newRows = await Promise.all(
    sandbox.table.rows.map(async (row, rowIndex) => {
      const segmentList = sandbox.segments[rowIndex];
      const columnOffset = row.cells.length; // Start from the number of existing cells
      const newCells = await generateRowCells(segmentList, [operation], rowIndex, columnOffset);
      return {
        ...row,
        cells: [...row.cells, ...newCells],
      };
    })
  );

  return {
    ...sandbox,
    table: {
      header: newHeader,
      rows: newRows,
    },
  };
}

/**
 * Apply a single operation to a sandbox
 */
export async function applyOperation(
  sandbox: Sandbox,
  operation: Operation
): Promise<Sandbox> {
  if (operation.type === "filter") {
    return handleFilterOperation(sandbox, operation as FilterOperation);
  } else if (operation.type === "row") {
    const rowOp = operation as RowOperation;
    if (
      rowOp.subType === "add-one-row-by-pattern" ||
      rowOp.subType === "add-one-row-by-record-attribute"
    ) {
      return handleAddOneRowOperation(sandbox, rowOp);
    } else {
      return handleAddMultipleRowsOperation(sandbox, rowOp);
    }
  } else if (operation.type === "column") {
    return handleColumnOperation(sandbox, operation as ColumnOperation);
  }
  return sandbox;
}
