"use client";

import React from "react";
import { Table, RowHeader, Cell } from "../../types/sandbox";
import { useUiStore } from "../../store/ui-store";

interface DataTableProps {
  table: Table;
}

import PatternRowHeader from "../visualizations/pattern-row-header";
import RecordAttributeRowHeader from "../visualizations/record-attribute-row-header";
import Funnel from "../visualizations/funnel";
import PatternDistribution from "../visualizations/pattern-distribution";
import Number from "../visualizations/number";
import CategoryDistribution from "../visualizations/category-distribution";
import EdgeAnalysis from "../visualizations/edge-analysis";

function RowHeaderCell({
  rowHeader,
  rowIndex,
  isHighlighted,
  isSessionCountHighlighted,
  isDurationHighlighted,
  rowHeaderRef,
}: {
  rowHeader: RowHeader;
  rowIndex: number;
  isHighlighted?: boolean;
  isSessionCountHighlighted?: boolean;
  isDurationHighlighted?: boolean;
  rowHeaderRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { debugMode } = useUiStore();

  const wrapperClass = `h-full transition-all duration-200 ${
    isHighlighted
      ? "outline-2 outline-dashed outline-blue-400 outline-offset-[-2px] bg-blue-50/40 relative z-[3]"
      : ""
  }`;

  if (debugMode) {
    return (
      <div ref={rowHeaderRef} className={wrapperClass}>
        <div className="p-4 bg-gray-50 h-full border-r border-gray-200">
          <pre className="text-[10px] font-mono text-gray-600 leading-tight whitespace-pre-wrap break-all">
            {JSON.stringify(rowHeader, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (rowHeader.type === "pattern") {
    return (
      <div ref={rowHeaderRef} className={wrapperClass}>
        <div className="bg-gray-50 h-full border-r border-gray-200">
          <PatternRowHeader header={rowHeader} rowIndex={rowIndex} isHighlighted={isHighlighted} isSessionCountHighlighted={isSessionCountHighlighted} isDurationHighlighted={isDurationHighlighted} />
        </div>
      </div>
    );
  }

  if (rowHeader.type === "record-attribute") {
    return (
      <div ref={rowHeaderRef} className={wrapperClass}>
        <div className="bg-gray-50 h-full border-r border-gray-200">
          <RecordAttributeRowHeader header={rowHeader} rowIndex={rowIndex} isHighlighted={isHighlighted} isSessionCountHighlighted={isSessionCountHighlighted} isDurationHighlighted={isDurationHighlighted} />
        </div>
      </div>
    );
  }

  return (
    <div ref={rowHeaderRef} className={wrapperClass}>
      <div className="p-4 bg-gray-50 flex flex-col h-full">
        <pre className="whitespace-pre-wrap break-words text-xs font-mono">
          {JSON.stringify(rowHeader, null, 2)}
        </pre>
      </div>
    </div>
  );
}
function DataCell({
  cell,
  isHighlighted,
  highlightIds,
  cellRef,
}: {
  cell: Cell;
  isHighlighted: boolean;
  highlightIds?: string[];
  cellRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { debugMode } = useUiStore();

  // Wrap content with highlighting
  const wrapperClass = `h-full transition-all duration-200 ${
    isHighlighted
      ? "outline-2 outline-dashed outline-blue-400 outline-offset-[-2px] bg-blue-50/40 relative z-0"
      : ""
  }`;

  if (debugMode) {
    return (
      <div ref={cellRef} className={wrapperClass}>
        <div className="p-4">
          <pre className="text-[10px] font-mono text-gray-600 leading-tight whitespace-pre-wrap break-all">
            {JSON.stringify(cell, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (cell.type === "funnel") {
    return (
      <div ref={cellRef} className={wrapperClass}>
        <div className="p-4 min-w-[300px] flex flex-col h-full">
          <Funnel cell={cell} title="Funnel" highlightIds={highlightIds} />
        </div>
      </div>
    );
  }

  if (cell.type === "pattern-distribution") {
    return (
      <div ref={cellRef} className={wrapperClass}>
        <div className="p-4 min-w-[300px] flex flex-col h-full">
          <PatternDistribution cell={cell} title="Frequent Pattern" highlightIds={highlightIds} />
        </div>
      </div>
    );
  }

  if (cell.type === "number") {
    const title = (
      <>
        {cell.aggregation} • {cell.name}
      </>
    );
    return (
      <div ref={cellRef} className={wrapperClass}>
        <div className="p-4 min-w-[200px] flex flex-col h-full">
          <Number cell={cell} title={title} highlightIds={highlightIds} />
        </div>
      </div>
    );
  }

  if (cell.type === "category-distribution") {
    const title = (
      <>
        Distribution • {cell.name}
      </>
    );
    return (
      <div ref={cellRef} className={wrapperClass}>
        <div className="p-4 min-w-[250px] flex flex-col h-full">
          <CategoryDistribution cell={cell} title={title} highlightIds={highlightIds} />
        </div>
      </div>
    );
  }

  if (cell.type === "edge-analysis") {
    const title = (
      <>
        Edge Analysis • {cell.outcomeEvent.attribute}:{cell.outcomeEvent.value}
      </>
    );
    return (
      <div ref={cellRef} className={wrapperClass}>
        <div className="p-4 min-w-[400px] flex flex-col h-full">
          <EdgeAnalysis cell={cell} title={title} highlightIds={highlightIds} />
        </div>
      </div>
    );
  }

  return (
    <div ref={cellRef} className={wrapperClass}>
      <div className="p-4 flex flex-col h-full">
        <pre className="whitespace-pre-wrap break-words text-xs font-mono">
          {JSON.stringify(cell, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function DataTable({ table }: DataTableProps) {
  const { previewData } = useUiStore();
  const highlightCellIds = previewData?.highlightCellIds ?? [];
  const highlightSessionCountIds = previewData?.highlightSessionCountIds ?? [];
  const highlightDurationIds = previewData?.highlightDurationIds ?? [];
  const highlightedCellRef = React.useRef<HTMLDivElement | null>(null);
  const highlightedRowHeaderRef = React.useRef<HTMLDivElement | null>(null);

  // Scroll to first highlighted cell when it changes
  React.useEffect(() => {
    if (highlightCellIds.length > 0 && highlightedCellRef.current) {
      setTimeout(() => {
        highlightedCellRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 300); // Small delay to ensure rendering is complete
    }
  }, [highlightCellIds]);

  // Scroll to first highlighted row header (count or duration) when it changes
  React.useEffect(() => {
    if ((highlightSessionCountIds.length > 0 || highlightDurationIds.length > 0) && highlightedRowHeaderRef.current) {
      setTimeout(() => {
        highlightedRowHeaderRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }, 300); // Small delay to ensure rendering is complete
    }
  }, [highlightSessionCountIds, highlightDurationIds]);

  const numColumns = Math.max(...table.rows.map((row) => row.cells.length), 0);
  const numRows = table.rows.length;

  return (
    <div className="w-full bg-white">
      <table className="border-collapse w-full">
        <tbody>
          {table.rows.map((row, rowIndex) => {
            const isLastRow = rowIndex === numRows - 1;
            const totalCellsInRow = 1 + Math.max(row.cells.length, numColumns); // 1 for header + cells
            // Check if this row's count or duration is highlighted (prefix match for sub-element IDs)
            const isSessionCountHighlighted = highlightSessionCountIds.some(id => id === row.rowHeader.sessionCount.id || id.startsWith(row.rowHeader.sessionCount.id + '-'));
            const isDurationHighlighted = highlightDurationIds.some(id => id === row.rowHeader.duration.id || id.startsWith(row.rowHeader.duration.id + '-'));
            const isRowHeaderHighlighted = isSessionCountHighlighted || isDurationHighlighted;
            const rowHeaderRef = isRowHeaderHighlighted ? highlightedRowHeaderRef : undefined;

            return (
              <tr key={`row-${rowIndex}`}>
                {/* Row header cell (first column) */}
                <td
                  className={`sticky left-0 z-[2] bg-gray-50 min-w-[300px] align-top h-px ${
                    !isLastRow ? "border-b" : ""
                  } ${numColumns > 0 ? "border-r" : ""} border-gray-300`}
                >
                  <RowHeaderCell
                    rowHeader={row.rowHeader}
                    rowIndex={rowIndex}
                    isHighlighted={isRowHeaderHighlighted}
                    isSessionCountHighlighted={isSessionCountHighlighted}
                    isDurationHighlighted={isDurationHighlighted}
                    rowHeaderRef={rowHeaderRef}
                  />
                </td>

                {/* Data cells */}
                {row.cells.map((cell, cellIndex) => {
                  const isLastColumn = cellIndex === totalCellsInRow - 2; // -2 because row header is index 0

                  // Cell-level highlighting: prefix match (full ID or any sub-element ID)
                  const cellHighlightIds = highlightCellIds.filter(id =>
                    id === cell.id || id.startsWith(cell.id + '-')
                  );
                  const isHighlighted = cellHighlightIds.length > 0;

                  const cellRef = isHighlighted ? highlightedCellRef : undefined;

                  return (
                    <td
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className={`min-w-[250px] align-top h-px ${
                        !isLastColumn ? "border-r" : ""
                      } ${!isLastRow ? "border-b" : ""} border-gray-300`}
                    >
                      <DataCell
                        cell={cell}
                        isHighlighted={isHighlighted}
                        highlightIds={cellHighlightIds.length > 0 ? cellHighlightIds : undefined}
                        cellRef={cellRef}
                      />
                    </td>
                  );
                })}

                {/* Fill empty cells if row has fewer cells than max */}
                {Array.from({
                  length: Math.max(0, numColumns - row.cells.length),
                }).map((_, index) => {
                  const cellIndex = row.cells.length + index;
                  const isLastColumn = cellIndex === totalCellsInRow - 2;
                  return (
                    <td
                      key={`empty-${rowIndex}-${index}`}
                      className={`min-w-[250px] align-top h-px ${
                        !isLastColumn ? "border-r" : ""
                      } ${!isLastRow ? "border-b" : ""} border-gray-300`}
                    >
                      <div className="p-4 bg-gray-50 h-full" />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}