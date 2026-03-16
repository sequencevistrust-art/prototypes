"use client";

import { CitationCell, CitationGrid } from "../types/citation";
import { lookupCitationCell } from "../utils/citationIds";

// Operators used in derived citations
const DERIVED_OPERATORS = ['+', '-', '*', '/', '>', '<', '=', '~', ','];

interface DebugViewProps {
  highlightedText: string;
  reference: string;
  citationGrid?: CitationGrid;
  errorId?: string;
}

/**
 * Parse individual IDs from a reference string (splitting by all operators)
 */
function parseIds(reference: string): string[] {
  const escapedOps = DERIVED_OPERATORS.map(op =>
    op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const opPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');
  return reference.split(opPattern)
    .filter(s => !DERIVED_OPERATORS.includes(s.trim()) && s.trim())
    .map(s => s.trim());
}

export default function DebugView({
  highlightedText,
  reference,
  citationGrid,
  errorId,
}: DebugViewProps) {
  const ids = parseIds(reference);

  // Look up citation cells for each ID, deduplicated by cell ID
  const cellLookups: { ids: string[]; cell: CitationCell | null }[] = [];
  const seenCellIds = new Map<string, number>(); // cell.id -> index in cellLookups

  for (const id of ids) {
    const cell = citationGrid ? lookupCitationCell(citationGrid, id) : null;
    if (cell && seenCellIds.has(cell.id)) {
      // Same cell already seen — add this ID to the existing entry
      cellLookups[seenCellIds.get(cell.id)!].ids.push(id);
    } else {
      const index = cellLookups.length;
      cellLookups.push({ ids: [id], cell });
      if (cell) seenCellIds.set(cell.id, index);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Cited Text */}
      <div>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cited Text</div>
        <div className="bg-slate-50 rounded p-2 text-[10px] text-slate-700 font-mono">
          {highlightedText || "N/A"}
        </div>
      </div>

      {/* 2. Reference */}
      <div>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Reference</div>
        <div className="bg-slate-50 rounded p-2 text-[10px] text-slate-700 font-mono break-all">
          {reference || "N/A"}
        </div>
      </div>

      {/* 3. Error ID (if present) */}
      {errorId && (
        <div>
          <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Error ID</div>
          <div className="bg-red-50 rounded p-2 text-[10px] text-red-700 font-mono break-all">
            {errorId}
          </div>
        </div>
      )}

      {/* 3. Data — one section per unique cell */}
      {cellLookups.map((lookup, index) => (
        <div key={index}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {cellLookups.length > 1 ? `Data ${index + 1}` : "Data"}
            {lookup.cell && (
              <span className="ml-2 font-normal text-slate-400">{lookup.cell.id}</span>
            )}
          </div>
          {lookup.ids.length > 1 && (
            <div className="text-[10px] text-slate-400 font-mono mb-1">
              Referenced IDs: {lookup.ids.join(", ")}
            </div>
          )}
          {lookup.cell ? (
            <pre className="bg-slate-50 rounded p-2 text-[10px] text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(lookup.cell, null, 2)}
            </pre>
          ) : (
            <div className="bg-slate-50 rounded p-2 text-[10px] text-red-500 font-mono">
              No cell found for: {lookup.ids.join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
