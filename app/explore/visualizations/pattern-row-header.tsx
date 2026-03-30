"use client";

import { PatternRowHeader as PatternRowHeaderType } from "../../types/sandbox";
import PatternPill from "./pattern-pill";
import AppliedFiltersList from "./applied-filters-list";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Maximize2 } from "lucide-react";
import { useUiStore } from "../../store/ui-store";
import { formatDuration } from "../../utils/formatters";

interface PatternRowHeaderProps {
  header: PatternRowHeaderType;
  rowIndex: number;
  isHighlighted?: boolean;
  isSessionCountHighlighted?: boolean;
  isDurationHighlighted?: boolean;
}

// Check if this represents "all data" (no pattern filter, no segmentation)
function isAllDataPattern(header: PatternRowHeaderType): boolean {
  const op = header.operation;
  if (op.subType === "add-one-row-by-pattern") {
    return op.pattern.length === 0 && op.segment.startIndex === null && op.segment.endIndex === null;
  }
  return false;
}

export default function PatternRowHeader({ header, rowIndex, isHighlighted, isSessionCountHighlighted, isDurationHighlighted }: PatternRowHeaderProps) {
  const { setDrilldownRowIndex } = useUiStore();
  const isAllData = isAllDataPattern(header);

  const patternDesc = header.pattern
    .map(p => (p.negated ? `NOT ${p.value}` : p.value))
    .join(" → ");

  const filtersDesc = header.appliedFilters.map(f => {
    const val = f.recordAttribute.type === "categorical"
      ? f.recordAttribute.value
      : `${f.recordAttribute.min}-${f.recordAttribute.max}`;
    return `${f.recordAttribute.name}: ${val}`;
  }).join(", ");

  const description = isAllData
    ? (header.appliedFilters.length > 0
        ? `All sequences with global filter(s): ${filtersDesc}`
        : `All sequences in the dataset`)
    : (header.appliedFilters.length > 0
        ? `Sequences matching pattern [${patternDesc}] with global filter(s): ${filtersDesc}`
        : `Sequences matching pattern [${patternDesc}]`);

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="relative w-full h-full group/row">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="flex flex-col w-full h-full p-4 cursor-help transition-colors hover:bg-gray-100/50">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 text-left w-full">
                Filters Applied
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                <AppliedFiltersList filters={header.appliedFilters} />
                {isAllData ? (
                  // "All data" case - show "None" if no filters applied
                  header.appliedFilters.length === 0 && (
                    <div className="flex items-center px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded bg-gray-100 text-gray-900 shadow-sm">
                      <span className="uppercase tracking-widest text-[10px]">None</span>
                    </div>
                  )
                ) : (
                  // Pattern case - show pattern pill
                  <>
                    {header.appliedFilters.length > 0 && (
                      <div className="w-full border-t border-gray-300" />
                    )}
                    <div className="flex flex-col items-center gap-4">
                      {/* For add-rows-by-pattern, show filter pattern first, then mined pattern */}
                      {header.operation.subType === "add-rows-by-pattern" && header.operation.pattern.length > 0 && (
                        <>
                          <PatternPill pattern={header.operation.pattern} segment={header.operation.segment} />
                          <div className="w-full border-t border-gray-300" />
                        </>
                      )}
                      {/* Show the row's pattern (mined pattern for add-rows-by-pattern, or the pattern itself for add-one-row-by-pattern) */}
                      <PatternPill
                        pattern={header.pattern}
                        segment={header.operation.subType === "add-one-row-by-pattern" ? header.operation.segment : undefined}
                      />
                    </div>
                  </>
                )}
              </div>
              
              {/* Stats at bottom right */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold">
                <span className={`px-2 py-1 rounded transition-all duration-200 ${
                  isSessionCountHighlighted
                    ? 'bg-blue-50 ring-1 ring-blue-300 text-blue-700'
                    : 'text-gray-500'
                }`}>SESSIONS: {header.sessionCount.value}</span>
                <span className={`px-2 py-1 rounded transition-all duration-200 ${
                  isDurationHighlighted
                    ? 'bg-blue-50 ring-1 ring-blue-300 text-blue-700'
                    : 'text-gray-500'
                }`}>AVG: {formatDuration(header.duration.value)}</span>
              </div>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-gray-900 text-white text-xs px-2 py-1.5 rounded shadow-xl z-50 max-w-xs animate-in fade-in-0 zoom-in-95"
              side="right"
              sideOffset={5}
            >
              {description}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        {/* Drilldown button at top right */}
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDrilldownRowIndex(rowIndex);
              }}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Maximize2 size={12} />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="bg-gray-900 text-white text-xs px-2 py-1.5 rounded shadow-xl z-[100]"
              side="right"
              sideOffset={5}
            >
              Detailed Sequences
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </Tooltip.Provider>
  );
}
