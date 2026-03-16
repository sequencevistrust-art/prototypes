import { tool, zodSchema } from "ai";
import { z } from "zod";
import { operationSchema } from "./schemas";
import { normalizeSubType } from "./normalize";
import { updateOperationInSandbox } from "../../services/sandbox";
import { prefixTableIds } from "../../utils/transformCellIds";
import { buildCitationGrid } from "../../utils/buildCitationGrid";
import { toolUiData } from "./tool-ui-data";

interface ToolContext {
  agentSandboxId: string;
}

const normalizedOperationSchema = z.preprocess(normalizeSubType, operationSchema);

/**
 * Tool: Update Operation in Sandbox
 * Updates an existing operation in the sandbox
 */
const updateOperationParameters = z.object({
  operationId: z.string().describe("ID of the operation to update (from table data)"),
  oldOperation: normalizedOperationSchema.describe("The current operation being replaced"),
  newOperation: normalizedOperationSchema.describe("The new operation configuration"),
}).refine(
  (data) => data.oldOperation.type === data.newOperation.type,
  {
    message: "oldOperation and newOperation must have the same type (both filter, both row, or both column)",
    path: ["newOperation"],
  }
);

export const updateOperationInSandboxTool = tool({
  description: "Update an existing operation in the sandbox by its ID. Returns the updated citation grid.",
  inputSchema: zodSchema(updateOperationParameters),
  execute: async (params, options) => {
    const { operationId, oldOperation, newOperation } = params as z.infer<typeof updateOperationParameters>;
    const { agentSandboxId } = options.experimental_context as ToolContext;
    const toolCallId = (options as any).toolCallId || (options as any).callId || `tool_update_${operationId}`;
    console.log("[updateOperationInSandbox] Input:", { agentSandboxId, operationId, oldOperation, newOperation, toolCallId });

    const result = await updateOperationInSandbox(agentSandboxId, operationId, newOperation);
    console.log("[updateOperationInSandbox] Output - Table rows:", result.table?.rows?.length || 0);
    console.log("[updateOperationInSandbox] Transforming with toolCallId:", toolCallId);

    // Build citation grid with prefix-based IDs
    const citationGrid = buildCitationGrid(result.table, toolCallId);

    // Prefix table IDs for UI highlighting and store in side-channel (not sent to model)
    const prefixedTable = prefixTableIds(result.table, toolCallId);
    toolUiData.set(toolCallId, { table: prefixedTable });

    return {
      citationGrid,
      steps: result.steps,
      message: `Operation updated successfully.`,
    };
  },
});
