import { FilterOperation } from "../../types/operations";
import AttributePill from "./attribute-pill";

interface AppliedFiltersListProps {
  filters: FilterOperation[];
  align?: "left" | "center";
}

export default function AppliedFiltersList({ filters, align = "center" }: AppliedFiltersListProps) {
  if (filters.length === 0) return null;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${align === "center" ? "items-center" : "items-start"}`}>
      {filters.map((filter, index) => {
        const value = filter.recordAttribute.type === "categorical"
          ? filter.recordAttribute.value
          : `${filter.recordAttribute.min} - ${filter.recordAttribute.max}`;

        return (
          <AttributePill
            key={index}
            name={filter.recordAttribute.name}
            value={value}
          />
        );
      })}
    </div>
  );
}
