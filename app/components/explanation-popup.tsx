"use client";

import { X, Filter, ChevronDown } from "lucide-react";
import { useEffect, useState, forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import useScrollIndicator from "../hooks/useScrollIndicator";
import { Table } from "../types/sandbox";
import { ReferencedCell } from "../utils/extractReferencedCells";
import { CitationGrid } from "../types/citation";
import { lookupCitationCell, highlightEntityInSteps, findEntityValue, parseOperators } from "../utils/citationIds";
import DebugView from "../explain/debug-view";
import { StepRenderer, Step, PrefixedIdGenerator } from "../explain/steps";
import { createComparisonStep } from "../explain/steps/convertToSteps";
import { HighlightIdsProvider } from "../explain/steps/HighlightIdsContext";
import { parseReference } from "../utils/citations";

// Operators used in derived citations
const DERIVED_OPERATORS = ['+', '-', '*', '/', '>', '<', '=', '~', ','];
const IS_DEV = process.env.NODE_ENV !== "production";

interface PopupData {
  referencedCells: ReferencedCell[];
  reference: string;
  highlightedText: string;
  table: Table | null;
  steps: import("../types/sandbox").OperationWithId[] | null;
  citationGrid?: CitationGrid;
  explanationSteps?: Step[];
  reason?: string;
  traceIds?: {
    toolCallId?: string;
    reference?: string;
    errorId?: string;
    referenceIds?: string;
  };
}

interface ExplanationPopupProps {
  isOpen: boolean;
  popupData: PopupData | null;
  position: { x: number; y: number };
  isPinned: boolean;
  onClose: () => void;
  onPin: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}


/**
 * Split reference into groups by comma operator
 * Returns array of { segment: string, cellCount: number }
 */
function splitReferenceByComma(reference: string): { segment: string; cellCount: number }[] {
  // Split by " , " (comma with spaces)
  const segments = reference.split(' , ');

  return segments.map(segment => {
    // Count cell references in this segment (by counting toolCallId patterns or slash-separated ids)
    // Each cell reference is separated by operators
    const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
    const escapedOps = nonCommaOps.map(op =>
      op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const opPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');

    // Split by operators to count cells
    const cellRefs = segment.split(opPattern).filter(s => !nonCommaOps.includes(s.trim()) && s.trim());

    return {
      segment,
      cellCount: cellRefs.length
    };
  });
}

/**
 * Render steps for a group of cells
 */
function StepsRenderer({ steps }: { steps: Step[] }) {
  return (
    <div className="pl-1 flex flex-col gap-2">
      {steps.map((step, idx) => (
        <StepRenderer key={idx} step={step} />
      ))}
    </div>
  );
}

const ExplanationPopup = forwardRef<HTMLDivElement, ExplanationPopupProps>(({
  isOpen,
  popupData,
  position,
  isPinned,
  onClose,
  onPin,
  onMouseEnter,
  onMouseLeave,
}, ref) => {
  const [anchorPosition, setAnchorPosition] = useState<{ x: number; y: number; corner: string; maxHeight: number } | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  const { scrollContainerRef, canScrollDown, handleScrollDown } = useScrollIndicator(
    isOpen && !!anchorPosition,
    { contentKey: popupData?.reference }
  );

  const cellGroupsWithSteps = useMemo(() => {
    if (!popupData) return [];

    const { referencedCells, reference, explanationSteps, citationGrid } = popupData;

    // If we have cached explanation steps, use them directly (single group)
    if (explanationSteps && explanationSteps.length > 0) {
      // Extract IDs from reference for render-time highlighting
      const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
      const escapedOps = nonCommaOps.map(op =>
        op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      const opPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');
      const ids = reference.split(opPattern)
        .filter(s => !nonCommaOps.includes(s.trim()) && s.trim())
        .map(s => s.trim());

      return [{
        cells: referencedCells,
        operators: parseOperators(reference),
        steps: explanationSteps,
        highlightIds: ids,
      }];
    }

    // Use citationGrid for all lookups (single and derived)
    if (citationGrid) {
      const referenceGroups = splitReferenceByComma(reference);

      const groups: {
        cells: ReferencedCell[];
        operators: string[];
        steps: Step[];
        highlightIds: string[];
      }[] = [];

      for (const group of referenceGroups) {
        const groupOperators = parseOperators(group.segment);

        // Parse IDs from this group's segment
        const nonCommaOps = DERIVED_OPERATORS.filter(op => op !== ',');
        const escapedOps = nonCommaOps.map(op =>
          op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
        const opPattern = new RegExp(` (${escapedOps.join('|')}) `, 'g');
        const ids = group.segment.split(opPattern)
          .filter(s => !nonCommaOps.includes(s.trim()) && s.trim())
          .map(s => s.trim());

        if (ids.length === 1) {
          // Single cell
          const cell = lookupCitationCell(citationGrid, ids[0]);
          if (cell) {
            const steps = highlightEntityInSteps(cell.steps, ids[0]);
            groups.push({ cells: referencedCells, operators: groupOperators, steps, highlightIds: ids });
          }
        } else if (ids.length >= 2) {
          // Derived: look up each cell, combine with separators + comparison
          // Deduplicate by cell ID — if multiple IDs resolve to the same cell,
          // show the cell once and highlight all referenced values
          const combinedSteps: Step[] = [];
          const comparisonValues: { id: string; value: string }[] = [];
          const seenCellIds = new Set<string>();

          for (let i = 0; i < ids.length; i++) {
            const cell = lookupCitationCell(citationGrid, ids[i]);
            if (cell) {
              // Only add cell steps once per unique cell
              if (!seenCellIds.has(cell.id)) {
                if (seenCellIds.size > 0) combinedSteps.push({ type: "separator" });
                const highlighted = highlightEntityInSteps(cell.steps, ids[i]);
                combinedSteps.push(...highlighted);
                seenCellIds.add(cell.id);
              }

              const value = findEntityValue(cell.steps, ids[i]);
              if (value) comparisonValues.push({ id: ids[i], value });
            }
          }

          // Add comparison step if operators present
          if (groupOperators.length > 0 && comparisonValues.length >= 2) {
            const gen = new PrefixedIdGenerator("cmp");
            const comparisonStep = createComparisonStep(
              gen,
              comparisonValues,
              groupOperators,
              combinedSteps.length + 1
            );
            combinedSteps.push(comparisonStep);
          }

          groups.push({ cells: referencedCells, operators: groupOperators, steps: combinedSteps, highlightIds: ids });
        }
      }

      if (groups.length > 0) return groups;
    }

    // No citationGrid available — return empty
    return [];
  }, [popupData]);

  // Calculate and lock anchor position when popup opens
  useEffect(() => {
    if (!isOpen) {
      setAnchorPosition(null);
      return;
    }

    if (typeof window === "undefined") return;

    const popupMaxWidth = 500; // Max width for positioning calculations
    const popupMaxHeight = 500;
    const padding = 16;
    const cursorOffset = 16;

    const spaceRight = window.innerWidth - position.x;
    const spaceBottom = window.innerHeight - position.y;
    const spaceTop = position.y;

    let corner: string;
    let x: number;
    let y: number;
    let maxHeight: number;

    if (spaceRight >= popupMaxWidth + padding) {
      if (spaceBottom >= popupMaxHeight + padding) {
        corner = "top-left";
        x = position.x + cursorOffset;
        y = position.y + cursorOffset;
        maxHeight = popupMaxHeight;
      } else if (spaceTop >= popupMaxHeight + padding) {
        corner = "bottom-left";
        x = position.x + cursorOffset;
        y = position.y - cursorOffset;
        maxHeight = popupMaxHeight;
      } else {
        corner = "top-left";
        x = position.x + cursorOffset;
        y = position.y + cursorOffset;
        maxHeight = spaceBottom - cursorOffset - padding;
      }
    } else {
      if (spaceBottom >= popupMaxHeight + padding) {
        corner = "top-right";
        x = position.x - cursorOffset;
        y = position.y + cursorOffset;
        maxHeight = popupMaxHeight;
      } else if (spaceTop >= popupMaxHeight + padding) {
        corner = "bottom-right";
        x = position.x - cursorOffset;
        y = position.y - cursorOffset;
        maxHeight = popupMaxHeight;
      } else {
        corner = "top-right";
        x = position.x - cursorOffset;
        y = position.y + cursorOffset;
        maxHeight = spaceBottom - cursorOffset - padding;
      }
    }

    setAnchorPosition({ x, y, corner, maxHeight });
  }, [isOpen, position.x, position.y]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !anchorPosition || !popupData) return null;

  const popupMinWidth = 340;
  const padding = 16;

  // Calculate max width based on available space from anchor to edge of viewport
  let maxWidth: number;
  if (anchorPosition.corner === "top-left" || anchorPosition.corner === "bottom-left") {
    maxWidth = window.innerWidth - anchorPosition.x - padding;
  } else {
    maxWidth = anchorPosition.x - padding;
  }

  const positionStyle: React.CSSProperties = {
    minWidth: `${popupMinWidth}px`,
    maxWidth: `${Math.max(maxWidth, popupMinWidth)}px`,
    maxHeight: `${anchorPosition.maxHeight}px`,
  };

  switch (anchorPosition.corner) {
    case "top-left":
      positionStyle.left = `${anchorPosition.x}px`;
      positionStyle.top = `${anchorPosition.y}px`;
      break;
    case "bottom-left":
      positionStyle.left = `${anchorPosition.x}px`;
      positionStyle.bottom = `${window.innerHeight - anchorPosition.y}px`;
      break;
    case "top-right":
      positionStyle.right = `${window.innerWidth - anchorPosition.x}px`;
      positionStyle.top = `${anchorPosition.y}px`;
      break;
    case "bottom-right":
      positionStyle.right = `${window.innerWidth - anchorPosition.x}px`;
      positionStyle.bottom = `${window.innerHeight - anchorPosition.y}px`;
      break;
  }

  const { referencedCells } = popupData;

  const handlePopupMouseDown = () => {
    if (!isPinned) {
      onPin();
    }
  };

  const popupContent = (
    <div
      ref={ref}
      className={`fixed z-[9999] flex flex-col animate-in fade-in zoom-in-95 duration-200`}
      style={positionStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={handlePopupMouseDown}
    >
      <div className={`relative w-full flex flex-col bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/80 overflow-hidden ${
        isPinned
          ? "shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
          : "shadow-[0_4px_20px_rgb(0,0,0,0.08)]"
      }`} style={{ maxHeight: positionStyle.maxHeight }}>
        {/* Body */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto p-4 custom-scrollbar">
            {debugMode && popupData && (
              <DebugView
                highlightedText={popupData.highlightedText}
                reference={popupData.reference}
                citationGrid={popupData.citationGrid}
                errorId={popupData.traceIds?.errorId}
              />
            )}

            {!debugMode && (cellGroupsWithSteps.length > 0 ? (
              <div className="flex flex-col gap-1 min-w-max pr-1">
                {cellGroupsWithSteps.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {groupIdx > 0 && (
                      <StepRenderer step={{ type: "separator" }} />
                    )}
                    <HighlightIdsProvider
                      highlightIds={group.highlightIds}
                      errorIds={popupData.traceIds?.errorId && parseOperators(popupData.traceIds.errorId).length === 0 ? parseReference(popupData.traceIds.errorId).ids : undefined}
                      comparisonErrorIds={popupData.traceIds?.errorId && parseOperators(popupData.traceIds.errorId).length > 0 ? parseReference(popupData.traceIds.errorId).ids : undefined}
                    >
                      <StepsRenderer steps={group.steps} />
                    </HighlightIdsProvider>
                  </div>
                ))}
              </div>
            ) : popupData.reason ? (
              <div className="flex flex-col gap-2.5 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Data Source</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{popupData.reason}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Filter className="text-slate-300" size={20} />
                </div>
                <p className="text-sm font-medium text-slate-900">No context available</p>
                <p className="text-xs text-slate-500 mt-1">This reference doesn't link to specific data cells.</p>
              </div>
            ))}

        </div>
      </div>

      {isPinned && (
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-30 p-1.5 bg-white text-slate-500 hover:text-slate-700 rounded-full transition-all cursor-pointer shadow-md border border-slate-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          aria-label="Close"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}

      {/* Debug mode toggle button */}
      {isPinned && process.env.NODE_ENV !== "production" && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`absolute -top-9 -right-2 z-30 flex items-center gap-1.5 px-2 py-1 rounded-full cursor-pointer transition-all duration-200 border shadow-sm ${
            debugMode
              ? "bg-gray-900 border-gray-900 text-white"
              : "bg-white border-gray-200 text-gray-400 opacity-80 hover:opacity-100 hover:border-gray-300"
          }`}
          aria-label="Toggle debug mode"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${debugMode ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
          <span className="text-[8px] font-bold uppercase tracking-widest leading-none select-none">Debug</span>
        </button>
      )}

      {/* Scroll down indicator - at the bottom center */}
      {canScrollDown && (
        <button
          onClick={handleScrollDown}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 p-1.5 bg-white text-slate-500 hover:text-slate-700 rounded-full transition-all cursor-pointer shadow-md border border-slate-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          aria-label="Scroll down"
        >
          <ChevronDown size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(popupContent, document.body);
  }

  return popupContent;
});

ExplanationPopup.displayName = "ExplanationPopup";

export default ExplanationPopup;
