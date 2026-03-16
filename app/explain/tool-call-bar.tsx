"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Wrench, Check } from "lucide-react";
import type { ToolCall } from "./chat-types";

interface ToolCallBarProps {
  toolCalls: ToolCall[];
  hasTextContent: boolean; // True when text content exists, signaling tools are done
}

export function getToolCallLabel(toolCall: ToolCall): string {
  const { toolName, args } = toolCall;

  if (toolName === "clearSandbox") {
    return "Clearing sandbox";
  }

  if (toolName === "getMetadata") {
    return "Getting metadata";
  }

  const operation = args?.operation || args?.newOperation;
  if (!operation) {
    if (toolName === "removeOperationFromSandbox") return "Removing operation";
    if (toolName === "updateOperationInSandbox") return "Updating operation";
    return toolName;
  }

  if (operation.type === "filter") {
    return "Adding filter by attribute";
  }

  if (operation.type === "row") {
    if (operation.subType === "add-one-row-by-pattern") {
      return "Adding row by pattern";
    }
    if (operation.subType === "add-one-row-by-record-attribute") {
      const attr = operation.recordAttribute;
      const value = attr.type === "categorical" ? attr.value : "...";
      return `Adding row: ${attr.name} = ${value}`;
    }
    if (operation.subType === "add-rows-by-pattern") {
      return "Adding rows by frequent patterns";
    }
    if (operation.subType === "add-rows-by-record-attribute") {
      return `Adding rows by ${operation.recordAttribute.name || "attribute"}`;
    }
    return "Adding row";
  }

  if (operation.type === "column") {
    if (operation.subType === "numerical") {
      return `Adding column: ${operation.aggregation || "average"} of ${operation.recordAttribute.name || "..."}`;
    }
    if (operation.subType === "categorical") {
      if (operation.aggregation === "count-unique") {
        return `Adding column: count unique ${operation.recordAttribute.name || "..."}`;
      }
      return `Adding column: ${operation.recordAttribute.name || "..."} distribution`;
    }
    if (operation.subType === "pattern") {
      if (operation.analysis === "funnel") return "Adding funnel analysis";
      if (operation.analysis === "edge") return "Adding edge analysis";
      if (operation.analysis === "event-attribute") return "Adding event attribute analysis";
      return "Adding pattern analysis";
    }
    return "Adding column";
  }

  return toolName;
}

export default function ToolCallBar({ toolCalls, hasTextContent }: ToolCallBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if all tool calls have results
  const allCompleted = toolCalls.length > 0 && toolCalls.every(tc => tc.result);

  if (toolCalls.length === 0) {
    return null;
  }

  // Always show the last (most recent) tool call
  const currentToolCall = toolCalls[toolCalls.length - 1];
  const currentLabel = getToolCallLabel(currentToolCall);
  const isCurrentCompleted = !!currentToolCall.result;

  // Show completed count only when all tools are done AND text content exists (streaming text started)
  const displayText = (allCompleted && hasTextContent)
    ? `${toolCalls.length} tool call${toolCalls.length > 1 ? "s" : ""} completed`
    : currentLabel;

  return (
    <div className="w-fit">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer"
      >
        <Wrench size={12} className={`text-gray-400 shrink-0 ${!isCurrentCompleted ? "animate-pulse" : ""}`} />
        <span className="text-gray-600">{displayText}</span>
        {isExpanded ? (
          <ChevronUp size={12} className="text-gray-400" />
        ) : (
          <ChevronDown size={12} className="text-gray-400" />
        )}
      </button>

      {/* Expanded list */}
      {isExpanded && (
        <div className="mt-1 border border-gray-200 rounded-lg bg-white overflow-hidden">
          {toolCalls.map((tc, idx) => (
            <div
              key={tc.toolCallId}
              className={`px-3 py-2 text-[11px] flex items-center gap-4 ${
                idx !== toolCalls.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <span className="text-gray-600 flex-1">{getToolCallLabel(tc)}</span>
              {tc.result && (
                <div className="w-4 h-4 rounded-full border border-green-500 flex items-center justify-center shrink-0">
                  <Check size={10} className="text-green-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
