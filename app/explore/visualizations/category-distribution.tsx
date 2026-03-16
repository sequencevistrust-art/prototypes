"use client";

import { CategoryDistributionCell } from "../../types/sandbox";

interface CategoryDistributionProps {
  cell: CategoryDistributionCell;
  title: React.ReactNode;
  highlightIds?: string[];
}

export default function CategoryDistribution({ cell, title, highlightIds }: CategoryDistributionProps) {
  const { distribution } = cell;

  // Sort distribution by percentage descending
  const sortedDistribution = [...distribution]
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
        {title}
      </div>
      <div className="flex-1 flex flex-col justify-center gap-2">
        {sortedDistribution.map((item, index) => {
          const isHighlighted = highlightIds?.includes(item.id) ?? false;
          return (
            <div key={index} className={`flex flex-col gap-1 w-full p-2 rounded-md transition-all duration-200 ${
              isHighlighted ? 'bg-blue-50 ring-1 ring-blue-400 shadow-sm' : 'hover:bg-gray-50'
            }`}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-gray-700 truncate max-w-[150px]" title={item.category}>
                  {item.category}
                </span>
                <span className={`font-mono transition-all duration-200 ${
                  isHighlighted ? 'text-blue-700 font-bold' : 'text-gray-500'
                }`}>
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isHighlighted ? 'bg-blue-600' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(item.percentage, 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
