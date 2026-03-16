"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { useOperationsStore } from "../store/operations-store";
import { useUiStore } from "../store/ui-store";

export default function ClearAllButton() {
  const clearOperations = useOperationsStore((state) => state.clearOperations);
  const { previewMode, exitPreviewMode } = useUiStore();

  const handleClick = () => {
    if (previewMode) {
      // Exit preview mode
      exitPreviewMode();
    } else {
      // Clear operations store - useSandboxSync will automatically clear the sandbox
      clearOperations();
    }
  };

  const tooltipText = previewMode ? "Leave preview mode" : "Clear all operations";

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={handleClick}
          className={`w-full h-full border shadow-md rounded-lg bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer ${
            previewMode
              ? "border-blue-400 ring-2 ring-blue-200"
              : "border-gray-200"
          }`}
        >
          <span className="text-xl">✕</span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          className="z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-md"
          sideOffset={5}
        >
          {tooltipText}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
