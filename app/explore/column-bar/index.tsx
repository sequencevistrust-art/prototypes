"use client";

import { useMemo, useRef, useEffect } from "react";
import { useOperationsStore } from "../../store/operations-store";
import { useUiStore } from "../../store/ui-store";
import ColumnMenu from "./column-menu";
import ColumnPill from "./column-pill";

interface ColumnBarProps {
  isOpen: boolean;
  editingId?: string;
  onToggleMenu: () => void;
  onOpenEdit: (id: string) => void;
  onClose: () => void;
}

export default function ColumnBar({
  isOpen,
  editingId,
  onToggleMenu,
  onOpenEdit,
  onClose,
}: ColumnBarProps) {
  const operations = useOperationsStore((state) => state.operations);
  const removeOperation = useOperationsStore((state) => state.removeOperation);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Preview mode state
  const previewMode = useUiStore((state) => state.previewMode);
  const previewData = useUiStore((state) => state.previewData);

  // Extract only column operations (use preview data if in preview mode)
  const columns = useMemo(() => {
    if (previewMode && previewData) {
      return previewData.columnOperations.map((op, idx) => ({
        ...op,
        id: `preview-column-${idx}`,
      }));
    }
    return operations.filter((op) => op.type === "column");
  }, [operations, previewMode, previewData]);

  // Auto-scroll to the right when a new pill is added
  const prevCountRef = useRef(columns.length);
  useEffect(() => {
    if (columns.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
    prevCountRef.current = columns.length;
  }, [columns.length]);

  const handleRemoveColumn = (id: string) => {
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
          d="M6 4v16M12 4v16M18 4v16"
        />
      </svg>

      <span className="text-sm font-medium text-gray-700 w-16">Column</span>

      {previewMode && (
        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide bg-blue-50 px-1.5 py-0.5 rounded">
          Preview
        </span>
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0"
      >
        {columns.map((column) => (
          <ColumnPill
            key={column.id}
            operation={column}
            onRemove={previewMode ? undefined : () => handleRemoveColumn(column.id)}
            onEdit={previewMode ? undefined : () => onOpenEdit(column.id)}
            isEditing={!previewMode && editingId === column.id}
          />
        ))}
      </div>

      {!previewMode && (
        <button
          onClick={onToggleMenu}
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
        <ColumnMenu
          onClose={onClose}
          initialOperation={operations.find((op) => op.id === editingId)}
        />
      )}
    </div>
  );
}