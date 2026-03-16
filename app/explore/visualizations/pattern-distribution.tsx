"use client";

import { PatternDistributionCell } from "../../types/sandbox";
import PatternDisplay from "../common/pattern-display";

interface PatternDistributionProps {
  cell: PatternDistributionCell;
  title: React.ReactNode;
  highlightIds?: string[];
}

export default function PatternDistribution({ cell, title, highlightIds }: PatternDistributionProps) {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
        {title}
      </div>
      <div className="flex-1 flex flex-col justify-center gap-2">
        {cell.distribution.map((item, index) => {
          const isHighlighted = highlightIds?.includes(item.id) ?? false;
          return (
            <div
              key={index}
              className={`flex items-center gap-3 w-full group rounded-md px-1 -mx-1 py-0.5 transition-all duration-200 ${
                isHighlighted ? 'bg-blue-50 ring-1 ring-blue-300' : ''
              }`}
            >
              <div className="flex-shrink-0 w-14 flex items-center justify-end">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap transition-all duration-200 text-gray-700 bg-gray-100 group-hover:bg-gray-200">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex-1 flex items-center">
                <PatternDisplay pattern={item.pattern} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
