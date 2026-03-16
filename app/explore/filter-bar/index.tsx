"use client";

import { useMemo, useRef, useEffect } from "react";
import { useOperationsStore } from "../../store/operations-store";
import { useUiStore } from "../../store/ui-store";
import CommonFilter from "../common/common-filter";
import FilterPill from "./filter-pill";
import { FilterOperation } from "../../types/operations";
import type { RecordAttributeEditorData } from "../common/record-attribute-editor";

interface FilterBarProps {
  isOpen: boolean;
  editingId?: string;
  onToggleAdd: () => void;
  onOpenEdit: (id: string) => void;
  onClose: () => void;
}

export default function FilterBar({
  isOpen,
  editingId,
  onToggleAdd,
  onOpenEdit,
  onClose,
}: FilterBarProps) {
  const operations = useOperationsStore((state) => state.operations);
  const addOperation = useOperationsStore((state) => state.addOperation);
  const removeOperation = useOperationsStore((state) => state.removeOperation);
  const updateOperation = useOperationsStore((state) => state.updateOperation);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Preview mode state
  const previewMode = useUiStore((state) => state.previewMode);
  const previewData = useUiStore((state) => state.previewData);

  // Extract only filter operations (use preview data if in preview mode)
  const filters = useMemo(() => {
    if (previewMode && previewData) {
      // In preview mode, return preview filter operations with generated IDs
      return previewData.filterOperations.map((op, idx) => ({
        ...op,
        id: `preview-filter-${idx}`,
      }));
    }
    return operations.filter((op) => op.type === "filter");
  }, [operations, previewMode, previewData]);

  // Auto-scroll to the right when a new pill is added
  const prevCountRef = useRef(filters.length);
  useEffect(() => {
    if (filters.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
    prevCountRef.current = filters.length;
  }, [filters.length]);

  const handleAddFilter = (filter: { type: "attribute"; data: RecordAttributeEditorData }) => {
    let operation: FilterOperation | undefined;

    if (filter.data.value !== undefined) {
      operation = {
        type: "filter",
        subType: "record-attribute",
        recordAttribute: {
          name: filter.data.attribute,
          type: "categorical",
          value: filter.data.value,
        },
      };
    } else if (filter.data.min !== undefined && filter.data.max !== undefined) {
      operation = {
        type: "filter",
        subType: "record-attribute",
        recordAttribute: {
          name: filter.data.attribute,
          type: "numerical",
          min: filter.data.min,
          max: filter.data.max,
        },
      };
    }

    if (operation) {
      if (editingId) {
        updateOperation(editingId, operation);
        onClose();
      } else {
        addOperation(operation);
        onClose();
      }
    }
  };

  const handleRemoveFilter = (id: string) => {
    removeOperation(id);
    if (editingId === id) {
      onClose();
    }
  };

  return (
    <div className={`w-full h-full border shadow-md rounded-lg bg-white px-3 flex items-center gap-2 relative ${
      previewMode ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"
    }`}>
      <svg
        className="w-5 h-5 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>

      <span className="text-sm font-medium text-gray-700 w-16">Filter</span>

      {previewMode && (
        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide bg-blue-50 px-1.5 py-0.5 rounded">
          Preview
        </span>
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0"
      >
        {filters.map((filter) => (
          <FilterPill
            key={filter.id}
            operation={filter}
            onRemove={previewMode ? undefined : () => handleRemoveFilter(filter.id)}
            onEdit={previewMode ? undefined : () => onOpenEdit(filter.id)}
            isEditing={!previewMode && editingId === filter.id}
          />
        ))}
      </div>

      {!previewMode && (
        <button
          onClick={onToggleAdd}
          className={`ml-auto w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 hover:text-gray-900 text-gray-600 transition-colors cursor-pointer ${
            isOpen && !editingId ? "bg-gray-200 text-gray-900" : ""
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      )}

      {isOpen && !previewMode && (
        <CommonFilter
          onCancel={onClose}
          onConfirm={handleAddFilter}
          initialOperation={operations.find((op) => op.id === editingId)}
        />
      )}
    </div>
  );
}