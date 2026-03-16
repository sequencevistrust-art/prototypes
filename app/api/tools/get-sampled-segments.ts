import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getSampledSegments } from "../../services/sandbox";

interface ToolContext {
  agentSandboxId: string;
}

/**
 * Tool: Get Sampled Segments
 * Retrieves a random sample of segments from a specific row
 */
const getSampledSegmentsParameters = z.object({
  rowIndex: z.number().describe("Index of the row to sample from (0-based)"),
  sampleSize: z.number().describe("Number of segments to randomly sample"),
});

export const getSampledSegmentsTool = tool({
  description:
    "Get a random sample of segments (event sequences) from a specific row. Useful for quickly understanding the data without retrieving all sequences. It works only if you have added rows using addOperationToSandbox tool.",
  inputSchema: zodSchema(getSampledSegmentsParameters),
  execute: async (params, options) => {
    const { rowIndex, sampleSize } = params as z.infer<typeof getSampledSegmentsParameters>;
    const { agentSandboxId } = options.experimental_context as ToolContext;
    console.log("[getSampledSegments] Input:", { agentSandboxId, rowIndex, sampleSize });

    const result = await getSampledSegments(agentSandboxId, rowIndex, sampleSize);
    console.log("[getSampledSegments] Output - segments count:", result.segments?.length || 0);

    return {
      segments: result.segments,
      totalCount: result.totalCount,
      sampledCount: result.sampledCount,
      message: `Sampled ${result.sampledCount} segments out of ${result.totalCount} total.`,
    };
  },
});
