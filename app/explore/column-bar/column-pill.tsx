import { StoredOperation } from "../../store/operations-store";
import PatternDisplay from "../common/pattern-display";

interface ColumnPillProps {
  operation: StoredOperation;
  onRemove?: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
}

export default function ColumnPill({
  operation,
  onRemove,
  onEdit,
  isEditing = false,
}: ColumnPillProps) {
  const isReadOnly = !onRemove && !onEdit;
  if (operation.type !== "column") return null;

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-[10px] whitespace-nowrap shrink-0">
      <div className="flex items-center gap-1">
        {operation.subType === "numerical" ? (
          <>
            <span className="uppercase font-light text-gray-900">Numerical</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {operation.recordAttribute.name} ({operation.aggregation})
            </span>
          </>
        ) : operation.subType === "categorical" ? (
          <>
            <span className="uppercase font-light text-gray-900">Categorical</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {operation.recordAttribute.name} ({operation.aggregation ?? "distribution"})
            </span>
          </>
        ) : operation.analysis === "pattern" ? (
          <>
            <span className="uppercase font-light text-gray-900">Pattern</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{operation.eventAttribute}</span>
          </>
        ) : operation.analysis === "event-attribute" ? (
          <>
            <span className="uppercase font-light text-gray-900">Event Attribute</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{operation.eventAttribute}</span>
          </>
        ) : operation.analysis === "funnel" ? (
          <>
            <span className="uppercase font-light text-gray-900">Funnel</span>
            <span className="text-gray-400">|</span>
            <PatternDisplay pattern={operation.pattern} />
          </>
        ) : (
          <>
            <span className="uppercase font-light text-gray-900">Edge</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {operation.eventAttribute.attribute}: {operation.eventAttribute.value}
            </span>
          </>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className={`w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer flex-shrink-0 ${
              isEditing ? "bg-gray-200 text-gray-900" : ""
            }`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
