import { tool, zodSchema } from "ai";
import { z } from "zod";
import { operationSchema } from "./schemas";
import { removeOperationFromSandbox } from "../../services/sandbox";
import { prefixTableIds } from "../../utils/transformCellIds";
import { buildCitationGrid } from "../../utils/buildCitationGrid";
import { toolUiData } from "./tool-ui-data";

interface ToolContext {
  agentSandboxId: string;
}

/**
 * Tool: Remove Operation from Sandbox
 * Removes an operation from the sandbox by its ID
 */
const removeOperationParameters = z.object({
  operationId: z.string().describe("ID of the operation to remove"),
  operation: operationSchema.describe("The operation being removed"),
});

export const removeOperationFromSandboxTool = tool({
  description: "Remove an operation from the sandbox by its ID. Returns the updated citation grid.",
  inputSchema: zodSchema(removeOperationParameters),
  execute: async (params, options) => {
    const { operationId, operation } = params as z.infer<typeof removeOperationParameters>;
    const { agentSandboxId } = options.experimental_context as ToolContext;
    const toolCallId = (options as any).toolCallId || (options as any).callId || `tool_remove_${operationId}`;
    console.log("[removeOperationFromSandbox] Input:", { agentSandboxId, operationId, operation, toolCallId });

    const result = await removeOperationFromSandbox(agentSandboxId, operationId);
    console.log("[removeOperationFromSandbox] Output - Table rows:", result.table?.rows?.length || 0);
    console.log("[removeOperationFromSandbox] Transforming with toolCallId:", toolCallId);

    // Build citation grid with prefix-based IDs
    const citationGrid = buildCitationGrid(result.table, toolCallId);

    // Prefix table IDs for UI highlighting and store in side-channel (not sent to model)
    const prefixedTable = prefixTableIds(result.table, toolCallId);
    toolUiData.set(toolCallId, { table: prefixedTable });

    return {
      citationGrid,
      steps: result.steps,
      message: `Operation removed successfully.`,
    };
  },
});
