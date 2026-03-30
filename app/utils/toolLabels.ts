import type { ToolCall } from "../types/chat";

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
