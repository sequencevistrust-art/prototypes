"use client";

import { useState, useEffect, useRef } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import PatternEditor from "../common/pattern-editor";
import RecordAttributeEditor from "../common/record-attribute-editor";
import { useOperationsStore, StoredOperation } from "../../store/operations-store";
import { RowOperation } from "../../types/operations";

interface RowMenuProps {
  onClose: () => void;
  initialOperation?: StoredOperation;
}

export default function RowMenu({ onClose, initialOperation }: RowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const addOperation = useOperationsStore((state) => state.addOperation);
  const updateOperation = useOperationsStore((state) => state.updateOperation);
  const [activeTab, setActiveTab] = useState<"pattern" | "attribute">("pattern");
  const [mode, setMode] = useState<"single" | "multiple">("single");

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Delay attaching to avoid the click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (initialOperation) {
      if (initialOperation.subType === "add-one-row-by-pattern") {
        setActiveTab("pattern");
        setMode("single");
      } else if (initialOperation.subType === "add-rows-by-pattern") {
        setActiveTab("pattern");
        setMode("multiple");
      } else if (initialOperation.subType === "add-one-row-by-record-attribute") {
        setActiveTab("attribute");
        setMode("single");
      } else if (initialOperation.subType === "add-rows-by-record-attribute") {
        setActiveTab("attribute");
        setMode("multiple");
      }
    }
  }, [initialOperation]);

  const handleConfirmPattern = (data: {
    events: { attribute: string; value: string; negated: boolean }[];
    segmentStart: number | null;
    segmentEnd: number | null;
  }) => {
    const operation = {
      type: "row" as const,
      subType: "add-one-row-by-pattern" as const,
      pattern: data.events,
      segment: {
        startIndex: data.segmentStart,
        endIndex: data.segmentEnd,
      },
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const handleConfirmAttribute = (data: { attribute: string; value?: string; min?: number; max?: number }) => {
    let operation: RowOperation | undefined;

    if (data.value !== undefined) {
      operation = {
        type: "row",
        subType: "add-one-row-by-record-attribute",
        recordAttribute: {
          name: data.attribute,
          type: "categorical",
          value: data.value,
        },
      };
    } else if (data.min !== undefined && data.max !== undefined) {
      operation = {
        type: "row",
        subType: "add-one-row-by-record-attribute",
        recordAttribute: {
          name: data.attribute,
          type: "numerical",
          min: data.min,
          max: data.max,
        },
      };
    }

    if (operation) {
      if (initialOperation) {
        updateOperation(initialOperation.id, operation);
      } else {
        addOperation(operation);
      }
    }
    onClose();
  };

  const handleConfirmMultipleAttributes = (data: { attribute: string }) => {
    const operation = {
      type: "row" as const,
      subType: "add-rows-by-record-attribute" as const,
      recordAttribute: {
        name: data.attribute,
        type: "categorical" as const,
      },
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const handleConfirmFrequentPatterns = (data: {
    attribute: string;
    events: { attribute: string; value: string; negated: boolean }[];
    segmentStart: number | null;
    segmentEnd: number | null;
  }) => {
    const operation = {
      type: "row" as const,
      subType: "add-rows-by-pattern" as const,
      eventAttribute: data.attribute,
      pattern: data.events,
      segment: {
        startIndex: data.segmentStart,
        endIndex: data.segmentEnd,
      },
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };


  // Helper to extract initial values for editors
  const getInitialPatternProps = () => {
    if (initialOperation?.type === "row") {
      if (initialOperation.subType === "add-one-row-by-pattern") {
        return {
          initialAttribute: initialOperation.pattern[0]?.attribute || "",
          initialEvents: initialOperation.pattern.map((e: { attribute: string; value: string; negated: boolean }) => ({ ...e })),
          initialSegmentStart: initialOperation.segment?.startIndex ?? null,
          initialSegmentEnd: initialOperation.segment?.endIndex ?? null,
        };
      } else if (initialOperation.subType === "add-rows-by-pattern" && "pattern" in initialOperation) {
        return {
          initialAttribute: initialOperation.pattern[0]?.attribute || "",
          initialEvents: initialOperation.pattern.map((e: { attribute: string; value: string; negated: boolean }) => ({ ...e })),
          initialSegmentStart: initialOperation.segment?.startIndex ?? null,
          initialSegmentEnd: initialOperation.segment?.endIndex ?? null,
        };
      }
    }
    return {};
  };

  const getInitialAttributeProps = () => {
    if (initialOperation?.type === "row" && (initialOperation.subType === "add-one-row-by-record-attribute" || initialOperation.subType === "add-rows-by-record-attribute")) {
      const recordAttribute = initialOperation.recordAttribute;
      return {
        initialAttribute: recordAttribute.name,
        initialValue: "value" in recordAttribute ? recordAttribute.value : "",
        initialRange: recordAttribute.type === "numerical"
            ? [recordAttribute.min, recordAttribute.max] as [number, number]
            : undefined,
      };
    }
    return {};
  };

  const initialPatternProps = getInitialPatternProps();
  const initialAttributeProps = getInitialAttributeProps();

  return (
    <div ref={menuRef} className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50">
      <Tooltip.Provider delayDuration={0}>
        {/* Top Level Tabs */}
        <div className="flex gap-4 border-b border-gray-200 pb-2 mb-4">
          <button
            className={`text-sm font-medium pb-1 px-2 rounded-t-md transition-all cursor-pointer ${
              activeTab === "pattern"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => {
              setActiveTab("pattern");
              setMode("single");
            }}
          >
            Pattern
          </button>
          <button
            className={`text-sm font-medium pb-1 px-2 rounded-t-md transition-all cursor-pointer ${
              activeTab === "attribute"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => {
              setActiveTab("attribute");
              setMode("single");
            }}
          >
            Record Attribute
          </button>
        </div>

        {activeTab === "pattern" && (
          <div className="space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => setMode("single")}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all cursor-pointer ${
                      mode === "single"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Add One Row
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="left"
                    className="z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-md max-w-[240px] text-center leading-relaxed"
                    sideOffset={5}
                  >
                    Add a new row representing all sequences that match your defined pattern.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => setMode("multiple")}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all cursor-pointer ${
                      mode === "multiple"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Add Multiple Rows
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    className="z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-md max-w-[240px] text-center leading-relaxed"
                    sideOffset={5}
                  >
                    Automatically mine and add multiple rows, each representing a discovered frequent pattern.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>

            {mode === "single" ? (
              <PatternEditor
                key={initialOperation?.id || "new-pattern-single"}
                onCancel={onClose}
                onConfirm={handleConfirmPattern}
                {...initialPatternProps}
              />
            ) : (
              <PatternEditor
                key={initialOperation?.id || "new-pattern-multiple"}
                onCancel={onClose}
                onConfirm={handleConfirmFrequentPatterns}
                {...initialPatternProps}
              />
            )}
          </div>
        )}

        {activeTab === "attribute" && (
          <div className="space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => setMode("single")}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all cursor-pointer ${
                      mode === "single"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Add One Row
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="left"
                    className="z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-md max-w-[240px] text-center leading-relaxed"
                    sideOffset={5}
                  >
                    Add a single row representing sequences that have a specific attribute value.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => setMode("multiple")}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all cursor-pointer ${
                      mode === "multiple"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    Add Multiple Rows
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    className="z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-md max-w-[240px] text-center leading-relaxed"
                    sideOffset={5}
                  >
                    Automatically add multiple rows, one for each unique value of the selected attribute.
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>

            {mode === "single" ? (
              <RecordAttributeEditor
                key={initialOperation?.id || "new-attribute-single"}
                mode="single"
                attributeType="all"
                onCancel={onClose}
                onConfirm={handleConfirmAttribute}
                {...initialAttributeProps}
              />
            ) : (
              <RecordAttributeEditor
                key={initialOperation?.id || "new-attribute-multiple"}
                mode="multiple"
                attributeType="categorical"
                onCancel={onClose}
                onConfirm={handleConfirmMultipleAttributes}
                {...initialAttributeProps}
              />
            )}          </div>
        )}

      </Tooltip.Provider>
    </div>
  );
}
