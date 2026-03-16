"use client";

interface EventValueSelectorProps {
  values: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function EventValueSelector({
  values,
  onSelect,
  onClose,
}: EventValueSelectorProps) {
  return (
    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 shadow-lg rounded-lg p-2 z-50">
      <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
        Select event value
      </div>
      <div className="max-h-48 overflow-y-auto">
        {values.map((value) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {value}
          </button>
        ))}
      </div>
      <div className="border-t border-gray-200 mt-2 pt-2">
        <button
          onClick={onClose}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 rounded hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
