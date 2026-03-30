import { Table, Cell, RowHeader } from "../types/sandbox";

export interface ReferencedCell {
  id: string;
  type: Cell["type"] | "row-header" | "row-header-session-count" | "row-header-duration";
  data: Cell | RowHeader;
  rowHeader: RowHeader;
  rowIndex: number;
  colIndex: number; // -1 for row headers
  numberIndex?: number; // For number cells with specific value index
  durationIndex?: number; // For funnel duration (index of the transition, e.g., 0 means between step 0 and 1)
  countIndex?: number; // For funnel event count (index of the transition)
}

/**
 * Extract referenced cells from a table based on citation reference IDs.
 *
 * Reference ID formats:
 * - Cell: "{toolCallId}-cell-{row}-{col}"
 * - Cell with number index: "{toolCallId}-cell-{row}-{col}-number-{index}"
 * - Cell with duration: "{toolCallId}-cell-{row}-{col}-duration-{fromIdx}-{toIdx}"
 * - Cell with count: "{toolCallId}-cell-{row}-{col}-count-{fromIdx}-{toIdx}"
 * - Row header count: "{toolCallId}-row-header-{row}-session-count"
 * - Row header duration: "{toolCallId}-row-header-{row}-duration"
 *
 * @param table The table containing the cells
 * @param referenceIds Array of reference IDs (may include toolCallId prefix)
 * @returns Array of referenced cells with their context
 */
export function extractReferencedCells(
  table: Table,
  referenceIds: string[]
): ReferencedCell[] {
  const results: ReferencedCell[] = [];

  for (const refId of referenceIds) {
    // Try to match funnel duration ID format: "...-cell-{row}-{col}-duration-{from}-{to}"
    const funnelDurationMatch = refId.match(/-cell-(\d+)-(\d+)-duration-(\d+)-(\d+)$/);
    // Try to match funnel count ID format: "...-cell-{row}-{col}-count-{from}-{to}"
    const funnelCountMatch = refId.match(/-cell-(\d+)-(\d+)-count-(\d+)-(\d+)$/);
    // Try to match cell ID format: "...-cell-{row}-{col}" or "...-cell-{row}-{col}-number-{index}"
    const cellMatch = refId.match(/-cell-(\d+)-(\d+)(?:-number-(\d+))?$/);
    // Try to match row header count ID format: "...-row-header-{row}-session-count"
    const sessionCountMatch = refId.match(/-row-header-(\d+)-session-count$/);
    // Try to match row header duration ID format: "...-row-header-{row}-duration"
    const durationMatch = refId.match(/-row-header-(\d+)-duration$/);

    if (funnelDurationMatch) {
      const rowIndex = parseInt(funnelDurationMatch[1], 10);
      const colIndex = parseInt(funnelDurationMatch[2], 10);
      const fromIdx = parseInt(funnelDurationMatch[3], 10);

      const row = table.rows[rowIndex];
      if (row && row.cells[colIndex]) {
        results.push({
          id: refId,
          type: row.cells[colIndex].type,
          data: row.cells[colIndex],
          rowHeader: row.rowHeader,
          rowIndex,
          colIndex,
          durationIndex: fromIdx,
        });
      }
    } else if (funnelCountMatch) {
      const rowIndex = parseInt(funnelCountMatch[1], 10);
      const colIndex = parseInt(funnelCountMatch[2], 10);
      const fromIdx = parseInt(funnelCountMatch[3], 10);

      const row = table.rows[rowIndex];
      if (row && row.cells[colIndex]) {
        results.push({
          id: refId,
          type: row.cells[colIndex].type,
          data: row.cells[colIndex],
          rowHeader: row.rowHeader,
          rowIndex,
          colIndex,
          countIndex: fromIdx,
        });
      }
    } else if (cellMatch) {
      const rowIndex = parseInt(cellMatch[1], 10);
      const colIndex = parseInt(cellMatch[2], 10);
      const numberIndex = cellMatch[3]
        ? parseInt(cellMatch[3], 10)
        : undefined;

      const row = table.rows[rowIndex];
      if (row && row.cells[colIndex]) {
        results.push({
          id: refId,
          type: row.cells[colIndex].type,
          data: row.cells[colIndex],
          rowHeader: row.rowHeader,
          rowIndex,
          colIndex,
          numberIndex,
        });
      }
    } else if (sessionCountMatch) {
      const rowIndex = parseInt(sessionCountMatch[1], 10);
      const row = table.rows[rowIndex];
      if (row) {
        results.push({
          id: refId,
          type: "row-header-session-count",
          data: row.rowHeader,
          rowHeader: row.rowHeader,
          rowIndex,
          colIndex: -1,
        });
      }
    } else if (durationMatch) {
      const rowIndex = parseInt(durationMatch[1], 10);
      const row = table.rows[rowIndex];
      if (row) {
        results.push({
          id: refId,
          type: "row-header-duration",
          data: row.rowHeader,
          rowHeader: row.rowHeader,
          rowIndex,
          colIndex: -1,
        });
      }
    }
  }

  return results;
}
