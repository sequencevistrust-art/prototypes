"use client";

import { FunnelCell } from "../../types/sandbox";
import * as Tooltip from "@radix-ui/react-tooltip";
import { formatDuration } from "../../utils/formatters";

interface FunnelProps {
  cell: FunnelCell;
  title: React.ReactNode;
  highlightIds?: string[];
}

export default function Funnel({ cell, title, highlightIds }: FunnelProps) {
  const { funnel, durations, eventCounts } = cell;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
        {title}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        {funnel.map((step, index) => {
          const isLast = index === funnel.length - 1;
          const durationData = !isLast ? durations[index] : null;
          const countData = !isLast ? eventCounts[index] : null;
          const isHighlighted = highlightIds?.includes(step.id) ?? false;
          const isDurationHighlighted = durationData ? (highlightIds?.includes(durationData.id) ?? false) : false;
          const isCountHighlighted = countData ? (highlightIds?.includes(countData.id) ?? false) : false;

          const pillStyle = isHighlighted
            ? "bg-blue-50 border-blue-400 text-blue-900 shadow-sm"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50";

          return (
            <div key={index} className="flex flex-col items-center w-full">
              {/* Event Pill */}
              <div
                className={`flex items-center justify-between gap-2 px-2 py-1 border rounded-md shadow-sm transition-all duration-200 ${pillStyle}`}
                style={{
                  width: `${Math.max(step.percentage, 0)}%`,
                  minWidth: "fit-content"
                }}
              >
                <span
                  className="font-medium truncate max-w-[150px] text-xs"
                  title={step.eventAttribute.value}
                >
                  {step.eventAttribute.value}
                </span>
                <span className={`font-bold px-1 py-0.5 rounded text-[10px] whitespace-nowrap transition-all duration-200 ${
                  isHighlighted ? 'bg-blue-200 text-blue-900' : 'text-gray-900 bg-gray-100'
                }`}>
                  {step.percentage.toFixed(1)}%
                </span>
              </div>

              {/* Connector */}
              {!isLast && durationData !== null && countData !== null && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-0.5 h-3 bg-gray-300"></div>
                  <Tooltip.Provider delayDuration={100}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <div className={`cursor-help px-2 py-0.5 border rounded-full text-[10px] font-mono transition-colors ${
                          isDurationHighlighted || isCountHighlighted
                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}>
                          {isDurationHighlighted && !isCountHighlighted && formatDuration(durationData.value)}
                          {isCountHighlighted && !isDurationHighlighted && `${Math.round(countData.value).toLocaleString()} events`}
                          {!isDurationHighlighted && !isCountHighlighted && formatDuration(durationData.value)}
                          {isDurationHighlighted && isCountHighlighted && formatDuration(durationData.value)}
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded shadow-lg z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                          side="right"
                          sideOffset={5}
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className={isDurationHighlighted ? 'text-blue-300 font-semibold' : ''}>
                              <span className="text-gray-400">Avg Duration:</span> <span className="font-mono ml-1">{formatDuration(durationData.value)}</span>
                            </div>
                            <div className={isCountHighlighted ? 'text-blue-300 font-semibold' : ''}>
                              <span className="text-gray-400">Avg Events:</span> <span className="font-mono ml-1">{Math.round(countData.value).toLocaleString()}</span>
                            </div>
                          </div>
                          <Tooltip.Arrow className="fill-gray-800" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                  <div className="w-0.5 h-3 bg-gray-300"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
