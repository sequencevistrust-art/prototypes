import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getPaginatedSegments } from "../../services/sandbox";

interface ToolContext {
  agentSandboxId: string;
}

/**
 * Tool: Get Paginated Segments
 * Retrieves a paginated list of segments from a specific row
 */
const getPaginatedSegmentsParameters = z.object({
  rowIndex: z.number().describe("Index of the row to get segments from (0-based)"),
  offset: z.number().describe("Starting position in the segment list"),
  size: z.number().describe("Number of segments to retrieve"),
});

export const getPaginatedSegmentsTool = tool({
  description:
    "Get paginated segments (event sequences) from a specific row in the table. Use this to examine the actual data that makes up each row. It works only if you have added rows using addOperationToSandbox tool.",
  inputSchema: zodSchema(getPaginatedSegmentsParameters),
  execute: async (params, options) => {
    const { rowIndex, offset, size } = params as z.infer<typeof getPaginatedSegmentsParameters>;
    const { agentSandboxId } = options.experimental_context as ToolContext;
    console.log("[getPaginatedSegments] Input:", { agentSandboxId, rowIndex, offset, size });

    const result = await getPaginatedSegments(agentSandboxId, rowIndex, offset, size);
    console.log("[getPaginatedSegments] Output - segments count:", result.segments?.length || 0);

    return {
      segments: result.segments,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      message: `Retrieved ${result.segments?.length || 0} segments out of ${result.totalCount} total.`,
    };
  },
});
