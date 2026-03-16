import { tool, zodSchema } from "ai";
import { z } from "zod";
import { operationSchema, generateOperationId } from "./schemas";
import { normalizeSubType } from "./normalize";
import { addOperationToSandbox } from "../../services/sandbox";
import { prefixTableIds } from "../../utils/transformCellIds";
import { buildCitationGrid } from "../../utils/buildCitationGrid";
import { toolUiData } from "./tool-ui-data";

interface ToolContext {
  agentSandboxId: string;
}

/**
 * Tool: Add Operation to Sandbox
 * Adds a new operation (filter, row, or column) to the sandbox
 */
const normalizedOperationSchema = z.preprocess(normalizeSubType, operationSchema);

const normalizedAddOperationParameters = z.object({
  operation: normalizedOperationSchema.describe("The operation configuration object"),
});

export const addOperationToSandboxTool = tool({
  description:
    "Add a new operation to the sandbox. Operations can be filters (to filter data), rows (to segment data), or columns (to compute metrics). Returns the updated citation grid.",
  inputSchema: zodSchema(normalizedAddOperationParameters),
  execute: async (params, options) => {
    const { operation } = params as z.infer<typeof normalizedAddOperationParameters>;
    const { agentSandboxId } = options.experimental_context as ToolContext;
    const operationId = generateOperationId();

    // Try to get the actual toolCallId from options
    const toolCallId = (options as any).toolCallId || (options as any).callId || `tool_${operationId}`;
    console.log("[addOperationToSandbox] Input:", { agentSandboxId, operationId, operation, toolCallId });

    const result = await addOperationToSandbox(agentSandboxId, operationId, operation);
    console.log("[addOperationToSandbox] Output - Table rows:", result.table?.rows?.length || 0);
    console.log("[addOperationToSandbox] Transforming with toolCallId:", toolCallId);

    // Build citation grid with prefix-based IDs
    const citationGrid = buildCitationGrid(result.table, toolCallId);

    // Prefix table IDs for UI highlighting and store in side-channel (not sent to model)
    const prefixedTable = prefixTableIds(result.table, toolCallId);
    toolUiData.set(toolCallId, { table: prefixedTable });

    return {
      citationGrid,
      steps: result.steps,
      message: `Operation added successfully. Table now has ${result.table?.rows?.length || 0} rows and ${result.table?.header?.length || 0} columns.`,
    };
  },
});
