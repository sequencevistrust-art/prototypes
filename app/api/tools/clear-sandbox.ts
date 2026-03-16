import { tool, zodSchema } from "ai";
import { z } from "zod";
import { clearSandbox } from "../../services/sandbox";
import { prefixTableIds } from "../../utils/transformCellIds";
import { buildCitationGrid } from "../../utils/buildCitationGrid";
import { toolUiData } from "./tool-ui-data";

interface ToolContext {
  agentSandboxId: string;
}

/**
 * Tool: Clear Sandbox
 * Clears all operations from the sandbox
 */
export const clearSandboxTool = tool({
  description: "Clear all operations from the sandbox to start fresh analysis",
  inputSchema: zodSchema(z.object({})),
  execute: async (_params, options) => {
    const { agentSandboxId } = options.experimental_context as ToolContext;
    const toolCallId = (options as any).toolCallId || (options as any).callId || 'tool_clear';
    console.log("[clearSandbox] Input:", { agentSandboxId, toolCallId });

    const result = await clearSandbox(agentSandboxId);
    console.log("[clearSandbox] Output - Table rows:", result.table?.rows?.length || 0);
    console.log("[clearSandbox] Transforming with toolCallId:", toolCallId);

    // Build citation grid with prefix-based IDs
    const citationGrid = buildCitationGrid(result.table, toolCallId);

    // Prefix table IDs for UI highlighting and store in side-channel (not sent to model)
    const prefixedTable = prefixTableIds(result.table, toolCallId);
    toolUiData.set(toolCallId, { table: prefixedTable });

    return {
      success: result.success,
      citationGrid,
      steps: result.steps,
      message: "Sandbox cleared successfully. All operations have been removed.",
    };
  },
});
