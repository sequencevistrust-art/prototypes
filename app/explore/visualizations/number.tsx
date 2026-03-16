"use client";

import { NumberCell } from "../../types/sandbox";

interface NumberProps {
  cell: NumberCell;
  title: React.ReactNode;
  highlightIds?: string[];
}

export default function Number({ cell, title, highlightIds }: NumberProps) {
  const { value } = cell;
  const isHighlighted = highlightIds?.includes(cell.id) ?? false;

  // Format the number to be more readable
  const formattedValue = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  return (
    <div className="flex flex-col w-full h-full">
      {title && (
        <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 text-left">
          {title}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-2xl font-light tracking-tight transition-all duration-200 ${
          isHighlighted ? 'text-blue-700 font-medium' : 'text-gray-900'
        }`}>
          {formattedValue}
        </div>
      </div>
    </div>
  );
}
