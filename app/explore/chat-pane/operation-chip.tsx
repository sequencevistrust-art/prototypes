import { Operation } from "../../types/operations";
import PatternDisplay from "../common/pattern-display";

interface OperationChipProps {
  operation: Operation;
  oldOperation?: Operation;
  action: "add" | "update" | "remove" | "clear";
  isExpanded?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function OperationChip({
  operation,
  oldOperation,
  action,
  isExpanded = false,
  isClickable = false,
  onClick,
  onSave,
  onCancel,
}: OperationChipProps) {
  const renderOperationContent = (op: Operation) => {
    // FILTER operations
    if (op.type === "filter") {
      return (
        <>
          <span className="uppercase font-light text-gray-900">Record Attribute</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-800">
            {op.recordAttribute.name}:{" "}
            {op.recordAttribute.type === "categorical"
              ? op.recordAttribute.value
              : `${op.recordAttribute.min} - ${op.recordAttribute.max}`}
          </span>
        </>
      );
    }

    // ROW operations
    if (op.type === "row") {
      if (op.subType === "add-one-row-by-pattern") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">One Row</span>
            <span className="text-gray-400">|</span>
            <PatternDisplay
              pattern={op.pattern}
              segment={op.segment}
              showSegmentMarkers
            />
          </>
        );
      } else if (op.subType === "add-one-row-by-record-attribute") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">One Row</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {op.recordAttribute.name}:{" "}
              {op.recordAttribute.type === "categorical"
                ? op.recordAttribute.value
                : `${op.recordAttribute.min} - ${op.recordAttribute.max}`}
            </span>
          </>
        );
      } else if (op.subType === "add-rows-by-pattern") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">Rows</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{op.eventAttribute}</span>
            <PatternDisplay
              pattern={op.pattern}
              segment={op.segment}
              showSegmentMarkers
            />
          </>
        );
      } else {
        // add-rows-by-record-attribute
        return (
          <>
            <span className="uppercase font-light text-gray-900">Rows</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{op.recordAttribute.name}</span>
          </>
        );
      }
    }

    // COLUMN operations
    if (op.type === "column") {
      if (op.subType === "numerical") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">Numerical</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {op.recordAttribute.name} ({op.aggregation})
            </span>
          </>
        );
      } else if (op.subType === "categorical") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">Categorical</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{op.recordAttribute.name}</span>
          </>
        );
      } else if (op.analysis === "pattern") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">Pattern</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{op.eventAttribute}</span>
          </>
        );
      } else if (op.analysis === "event-attribute") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">Event Attribute</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">{op.eventAttribute}</span>
          </>
        );
      } else if (op.analysis === "funnel") {
        return (
          <>
            <span className="uppercase font-light text-gray-900">Funnel</span>
            <span className="text-gray-400">|</span>
            <PatternDisplay pattern={op.pattern} />
          </>
        );
      } else {
        // edge analysis
        return (
          <>
            <span className="uppercase font-light text-gray-900">Edge</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-800">
              {op.eventAttribute.attribute}: {op.eventAttribute.value}
            </span>
          </>
        );
      }
    }

    return null;
  };

  // Get action label
  const actionLabel = (() => {
    if (action === "clear") return "Clear";
    
    const verb = action === "add" ? "Add" : action === "update" ? "Update" : "Remove";
    const type = operation.type === "filter" ? "Filter" : operation.type === "row" ? "Row" : "Column";
    
    return `${verb} ${type}`;
  })();
  const actionColor = action === "remove" ? "text-red-600" : action === "add" ? "text-green-600" : "text-blue-600";

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`inline-flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-[10px] shrink-0 ${
          isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""
        } ${isExpanded ? "ring-2 ring-blue-400 shadow-md bg-white border-blue-300" : ""} ${action === "update" && oldOperation ? "flex-wrap" : "whitespace-nowrap"}`}
        onClick={isClickable ? onClick : undefined}
      >
        <span className={`text-[9px] font-semibold uppercase ${actionColor}`}>{actionLabel}</span>
        <span className="text-gray-400">→</span>
        {action === "update" && oldOperation ? (
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-semibold text-gray-500 uppercase">Old:</span>
              {renderOperationContent(oldOperation)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-semibold text-gray-500 uppercase">New:</span>
              {renderOperationContent(operation)}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {renderOperationContent(operation)}
          </div>
        )}
      </div>

      {/* Save/Cancel buttons when expanded */}
      {isExpanded && (
        <div className="flex gap-1.5 pl-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave?.();
            }}
            className="px-2 py-0.5 text-[9px] font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.();
            }}
            className="px-2 py-0.5 text-[9px] font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}