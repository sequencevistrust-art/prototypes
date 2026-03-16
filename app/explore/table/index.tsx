"use client";

import { useEffect, useRef } from "react";
import { useSandboxStore } from "../../store/sandbox-store";
import { useUiStore } from "../../store/ui-store";
import { useOperationsStore } from "../../store/operations-store";
import Table from "./table";
import { useSandboxSync } from "../../hooks/use-sandbox-sync";
import DrilldownView from "./drilldown-view";
import DebugToggle from "../../debug-toggle";

export default function Workspace() {
  const { table: sandboxTable, isLoading, error, createSandbox } = useSandboxStore();
  const { previewMode, previewData } = useUiStore();
  const operations = useOperationsStore((state) => state.operations);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevColumnCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  // Use preview table if in preview mode, otherwise use sandbox table
  const table = previewMode && previewData ? previewData.table : sandboxTable;

  // Check if there are filter operations but no rows
  const hasFilters = operations.some((op) => op.type === "filter");
  const hasNoRows = table && table.rows.length === 0;

  // Sync operations store with sandbox
  useSandboxSync();

  // Create sandbox on mount
  useEffect(() => {
    createSandbox().then(() => {
      isInitialLoadRef.current = false;
    });
  }, [createSandbox]);

  // Scroll to right when new column is added
  useEffect(() => {
    if (!table) return;

    const currentColumnCount = table.header.length;

    // Only scroll if we have a previous count (not initial load) and count increased
    if (
      prevColumnCountRef.current > 0 &&
      currentColumnCount > prevColumnCountRef.current
    ) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: scrollContainerRef.current.scrollWidth,
            behavior: "smooth",
          });
        }
      }, 100);
    }

    prevColumnCountRef.current = currentColumnCount;
  }, [table]);

  // Skip showing loading screen on initial load (already covered by MetadataProvider)
  if (isLoading && !table && !isInitialLoadRef.current) {
    return (
      <div className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading sandbox...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-red-600">
          <svg
            className="w-12 h-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  // Skip showing "No data" during initial load (sandbox being created)
  if (!table && !isInitialLoadRef.current) {
    return (
      <div className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }

  // During initial load with no table yet, show empty container
  if (!table) {
    return (
      <div className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-white" />
    );
  }

  return (
    <div className={`w-full h-full border shadow-md rounded-lg bg-white relative overflow-hidden ${
      previewMode ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"
    }`}>
      {/* Preview indicator */}
      {previewMode && (
        <div className="absolute top-4 left-4 z-40">
          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide bg-blue-50 px-2 py-1 rounded border border-blue-200">
            Preview Mode
          </span>
        </div>
      )}

      {/* Debug Toggle */}
      <div className="absolute top-4 right-4 z-40">
        <DebugToggle />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-sm">Updating...</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-auto"
      >
        <Table table={table} />
      </div>

      {/* Informative message when filters exist but no rows */}
      {hasFilters && hasNoRows && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm px-6">
            <p className="text-gray-500 text-sm">
              Add rows to start your analysis.
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Filters apply global filtering to all rows in the table.
            </p>
          </div>
        </div>
      )}

      <DrilldownView />
    </div>
  );
}
