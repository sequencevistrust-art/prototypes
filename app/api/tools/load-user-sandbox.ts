import { tool, zodSchema } from "ai";
import { z } from "zod";
import { copyUserSandboxToAgent } from "../../services/sandbox";
import { prefixTableIds } from "../../utils/transformCellIds";
import { buildCitationGrid } from "../../utils/buildCitationGrid";
import { toolUiData } from "./tool-ui-data";

interface ToolContext {
  agentSandboxId: string;
  userSandboxId: string | null;
}

/**
 * Tool: Load User Sandbox
 * Copies the user's current sandbox state into the agent's sandbox
 */
export const loadUserSandboxTool = tool({
  description:
    "Load the user's current sandbox state (their visualization on the left pane) into your sandbox. Call this when the user references what they are currently looking at, wants you to continue or build upon their analysis, asks about their current view or table, or says things like 'explain this', 'what am I seeing', 'add a column to this', etc. This replaces your current sandbox state with the user's. After loading, you can inspect the citation grid to understand their view and continue modifying with other tools.",
  inputSchema: zodSchema(z.object({})),
  execute: async (_params, options) => {
    const { agentSandboxId, userSandboxId } = options.experimental_context as ToolContext;
    const toolCallId =
      (options as any).toolCallId || (options as any).callId || "tool_load_user";
    console.log("[loadUserSandbox] Input:", { agentSandboxId, userSandboxId, toolCallId });

    if (!userSandboxId) {
      return {
        citationGrid: [],
        steps: [],
        message:
          "The user has not created a sandbox yet. Their view is empty. You can start a fresh analysis instead.",
      };
    }

    try {
      const result = await copyUserSandboxToAgent(userSandboxId, agentSandboxId);
      console.log(
        "[loadUserSandbox] Output - Table rows:",
        result.table?.rows?.length || 0
      );

      if (!result.steps || result.steps.length === 0) {
        return {
          citationGrid: [],
          steps: [],
          message:
            "The user's sandbox is empty (no operations applied). You can start building from scratch.",
        };
      }

      const citationGrid = buildCitationGrid(result.table, toolCallId);

      const prefixedTable = prefixTableIds(result.table, toolCallId);
      toolUiData.set(toolCallId, { table: prefixedTable });

      return {
        citationGrid,
        steps: result.steps,
        message: `Successfully loaded the user's sandbox. The table has ${result.table?.rows?.length || 0} rows and ${result.table?.header?.length || 0} columns with ${result.steps.length} operations applied.`,
      };
    } catch (error) {
      console.error("[loadUserSandbox] Error:", error);
      return {
        citationGrid: [],
        steps: [],
        message: `Failed to load user sandbox: ${error instanceof Error ? error.message : "Unknown error"}. The user may not have an active analysis.`,
      };
    }
  },
});
