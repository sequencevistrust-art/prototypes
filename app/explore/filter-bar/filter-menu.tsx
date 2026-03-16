"use client";

import { StoredOperation } from "../../store/operations-store";

interface FilterMenuProps {
  operation: StoredOperation;
  onRemove: () => void;
}

export default function FilterMenu({ operation, onRemove }: FilterMenuProps) {
  const getLabel = () => {
    if (operation.type !== "filter") return "Unknown";

    const attr = operation.recordAttribute;
    if (attr.type === "categorical") {
      return `Attribute: ${attr.name} = ${attr.value}`;
    } else {
      return `Attribute: ${attr.name} in [${attr.min.toLocaleString()}, ${attr.max.toLocaleString()}]`;
    }
  };

  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-full text-sm">
      <span className="font-medium whitespace-nowrap">{getLabel()}</span>
      <button
        onClick={onRemove}
        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-600 transition-colors cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
