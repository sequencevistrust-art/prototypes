/**
 * Prefix ALL IDs in a table with toolCallId.
 * Prefixes cell-level IDs, row header IDs, AND inner entity IDs
 * (distribution items, funnel steps, durations, eventCounts, oddsRatios).
 *
 * This ensures the UI table's inner IDs match the citation grid's dataId() output.
 */
import {
  Table,
  Cell,
  PatternDistributionCell,
  CategoryDistributionCell,
  FunnelCell,
  EdgeAnalysisCell,
  NumberCell,
} from "../types/sandbox";

function prefixCellIds(cell: Cell, toolCallId: string): Cell {
  const prefix = (id: string) => `${toolCallId}-${id}`;

  switch (cell.type) {
    case "pattern-distribution": {
      return {
        ...cell,
        id: prefix(cell.id),
        distribution: cell.distribution.map((item) => ({
          ...item,
          id: prefix(item.id),
        })),
      } as PatternDistributionCell;
    }

    case "category-distribution": {
      return {
        ...cell,
        id: prefix(cell.id),
        distribution: cell.distribution.map((item) => ({
          ...item,
          id: prefix(item.id),
        })),
      } as CategoryDistributionCell;
    }

    case "funnel": {
      return {
        ...cell,
        id: prefix(cell.id),
        funnel: cell.funnel.map((item) => ({
          ...item,
          id: prefix(item.id),
        })),
        durations: cell.durations.map((d) => ({
          ...d,
          id: prefix(d.id),
        })),
        eventCounts: cell.eventCounts.map((c) => ({
          ...c,
          id: prefix(c.id),
        })),
      } as FunnelCell;
    }

    case "edge-analysis": {
      return {
        ...cell,
        id: prefix(cell.id),
        oddsRatios: cell.oddsRatios.map((or) => ({
          ...or,
          id: prefix(or.id),
        })),
      } as EdgeAnalysisCell;
    }

    case "number": {
      return {
        ...cell,
        id: prefix(cell.id),
      } as NumberCell;
    }
  }
}

export function prefixTableIds(table: Table, toolCallId: string): Table {
  if (!table || !table.rows) return table;

  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      rowHeader: {
        ...row.rowHeader,
        count: {
          ...row.rowHeader.count,
          id: `${toolCallId}-${row.rowHeader.count.id}`,
        },
        duration: {
          ...row.rowHeader.duration,
          id: `${toolCallId}-${row.rowHeader.duration.id}`,
        },
      },
      cells: row.cells.map((cell) => prefixCellIds(cell, toolCallId)),
    })),
  } as Table;
}
