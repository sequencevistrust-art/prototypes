import { FilterOperation } from "../../types/operations";

interface AppliedFiltersProps {
  filters: FilterOperation[];
}

export default function AppliedFilters({ filters }: AppliedFiltersProps) {
  if (filters.length === 0) {
    return (
      <div className="px-2 py-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border border-gray-200 rounded">
        None
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full items-center">
      {filters.map((filter, index) => {
        const label = filter.recordAttribute.name;
        const value = filter.recordAttribute.type === "categorical"
          ? filter.recordAttribute.value
          : `${filter.recordAttribute.min} - ${filter.recordAttribute.max}`;

        return (
          <div
            key={index}
            className="flex items-center px-2 py-0.5 text-[10px] font-medium border rounded bg-gray-100 border-gray-400 text-gray-900 shadow-sm w-fit max-w-full"
          >
            <span className="opacity-70 mr-1 uppercase tracking-tight whitespace-nowrap">
              {label}:
            </span>
            <span className="truncate">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
