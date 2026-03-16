import { StoredOperation } from "../../store/operations-store";
import PatternDisplay from "../common/pattern-display";

interface RowPillProps {
  operation: StoredOperation;
  onRemove?: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
}

export default function RowPill({
  operation,
  onRemove,
  onEdit,
  isEditing = false,
}: RowPillProps) {
  const isReadOnly = !onRemove && !onEdit;
  if (operation.type !== "row") return null;

  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-[10px] whitespace-nowrap shrink-0">
      <div className="flex items-center gap-1">
        {operation.subType === "add-one-row-by-pattern" ? (
          <>
            <span className="uppercase font-light text-gray-900">One Row</span>
            <span className="text-gray-400">|</span>
            <PatternDisplay
              pattern={operation.pattern}
              segment={operation.segment}
              showSegmentMarkers
            />
          </>
        ) : operation.subType === "add-one-row-by-record-attribute" ? (
          <>
            <span className="uppercase font-light text-gray-900">One Row</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {operation.recordAttribute.name}:{" "}
              {operation.recordAttribute.type === "categorical"
                ? operation.recordAttribute.value
                : `${operation.recordAttribute.min} - ${operation.recordAttribute.max}`}
            </span>
          </>
        ) : operation.subType === "add-rows-by-pattern" ? (
          <>
            <span className="uppercase font-light text-gray-900">Rows</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{operation.eventAttribute}</span>
            <PatternDisplay
              pattern={operation.pattern}
              segment={operation.segment}
              showSegmentMarkers
            />
          </>
        ) : (
          <>
            <span className="uppercase font-light text-gray-900">Rows</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{operation.recordAttribute.name}</span>
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
