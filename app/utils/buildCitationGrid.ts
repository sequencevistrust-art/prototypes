/**
 * Builds a CitationGrid from a raw Table + toolCallId.
 * Each cell in the grid is a self-contained Step[] with filters + analysis.
 *
 * Uses CitationIdGenerator so:
 * - Values WITH table IDs get prefixed: `{toolCallId}-{originalTableId}`
 * - Values WITHOUT table IDs get semantic paths: `{toolCallId}-{cellPrefix}-step-{idx}-{field}`
 */

import { Table } from "../types/sandbox";
import { CitationCell, CitationGrid } from "../types/citation";
import { CitationIdGenerator } from "../types/steps";
import { ReferencedCell } from "./extractReferencedCells";
import { convertToSteps } from "../explain/steps/convertToSteps";

export function buildCitationGrid(table: Table, toolCallId: string): CitationGrid {
  if (!table || !table.rows) return [];

  const grid: CitationGrid = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    const rowCells: CitationCell[] = [];

    // Col 0: Session count
    const countCellId = `${toolCallId}-row-header-${rowIndex}-count`;
    const countGen = new CitationIdGenerator(toolCallId, `row-header-${rowIndex}-count`);
    const countRefCell: ReferencedCell = {
      id: countCellId,
      type: "row-header-count",
      data: row.rowHeader,
      rowHeader: row.rowHeader,
      rowIndex,
      colIndex: -1,
    };
    const countSteps = convertToSteps([countRefCell], [], countGen);
    rowCells.push({ id: countCellId, steps: countSteps });

    // Col 1: Average duration
    const durationCellId = `${toolCallId}-row-header-${rowIndex}-duration`;
    const durationGen = new CitationIdGenerator(toolCallId, `row-header-${rowIndex}-duration`);
    const durationRefCell: ReferencedCell = {
      id: durationCellId,
      type: "row-header-duration",
      data: row.rowHeader,
      rowHeader: row.rowHeader,
      rowIndex,
      colIndex: -1,
    };
    const durationSteps = convertToSteps([durationRefCell], [], durationGen);
    rowCells.push({ id: durationCellId, steps: durationSteps });

    // Col 2+: Data cells
    for (let colIndex = 0; colIndex < row.cells.length; colIndex++) {
      const cell = row.cells[colIndex];
      const cellId = `${toolCallId}-cell-${rowIndex}-${colIndex}`;
      const cellGen = new CitationIdGenerator(toolCallId, `cell-${rowIndex}-${colIndex}`);
      const cellRefCell: ReferencedCell = {
        id: cellId,
        type: cell.type,
        data: cell,
        rowHeader: row.rowHeader,
        rowIndex,
        colIndex,
      };
      const cellSteps = convertToSteps([cellRefCell], [], cellGen);
      rowCells.push({ id: cellId, steps: cellSteps });
    }

    grid.push(rowCells);
  }

  return grid;
}
