"use client";

import { RecordAttributeRowHeader as RecordAttributeRowHeaderType } from "../../types/sandbox";
import * as Tooltip from "@radix-ui/react-tooltip";
import AttributePill from "./attribute-pill";
import AppliedFiltersList from "./applied-filters-list";
import { Maximize2 } from "lucide-react";
import { useUiStore } from "../../store/ui-store";
import { formatDuration } from "../../utils/formatters";

interface RecordAttributeRowHeaderProps {
  header: RecordAttributeRowHeaderType;
  rowIndex: number;
  isHighlighted?: boolean;
  isCountHighlighted?: boolean;
  isDurationHighlighted?: boolean;
}

export default function RecordAttributeRowHeader({ header, rowIndex, isHighlighted, isCountHighlighted, isDurationHighlighted }: RecordAttributeRowHeaderProps) {
  const { setDrilldownRowIndex } = useUiStore();
  const { recordAttribute } = header;

  const valueDisplay = recordAttribute.type === "numerical" ? (
    recordAttribute.value ?
      `${recordAttribute.value.min} - ${recordAttribute.value.max}` :
      "Any"
  ) : recordAttribute.type === "categorical" ? (
    recordAttribute.value || "All"
  ) : "Any";

  const filtersDesc = header.appliedFilters.map(f => {
    const val = f.recordAttribute.type === "categorical"
      ? f.recordAttribute.value
      : `${f.recordAttribute.min}-${f.recordAttribute.max}`;
    return `${f.recordAttribute.name}: ${val}`;
  }).join(", ");

  const description = header.appliedFilters.length > 0
    ? `Sequences matching ${recordAttribute.name}: ${valueDisplay} with global filter(s): ${filtersDesc}`
    : `Sequences matching ${recordAttribute.name}: ${valueDisplay}`;

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="relative w-full h-full group/row">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="flex flex-col w-full h-full p-4 cursor-help transition-colors hover:bg-gray-100/50">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 text-left w-full">
                Filters Applied
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <AppliedFiltersList filters={header.appliedFilters} />
                {header.appliedFilters.length > 0 && (
                  <div className="w-full border-t border-gray-300" />
                )}
                <AttributePill 
                  name={recordAttribute.name} 
                  value={valueDisplay} 
                />
              </div>

              {/* Stats at bottom right */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold">
                <span className={`px-2 py-1 rounded transition-all duration-200 ${
                  isCountHighlighted
                    ? 'bg-blue-50 ring-1 ring-blue-300 text-blue-700'
                    : 'text-gray-500'
                }`}>COUNT: {header.count.value}</span>
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
