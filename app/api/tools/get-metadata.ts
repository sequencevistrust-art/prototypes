import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getMetadata } from "../../services/metadata";

/**
 * Tool: Get Metadata
 * Retrieves metadata about the dataset, including available event attributes and record attributes.
 */
const getMetadataParameters = z.object({});

export const getMetadataTool = tool({
  description:
    "Get metadata about the dataset to understand available attributes. Returns a list of event attributes (categorical and numerical) and record attributes (categorical and numerical) with their possible values or ranges.",
  inputSchema: zodSchema(getMetadataParameters),
  execute: async () => {
    console.log("[getMetadata] Fetching metadata...");

    try {
      const result = await getMetadata();
      console.log("[getMetadata] Output - Event attributes:", result.eventAttributes?.length || 0);
      console.log("[getMetadata] Output - Record attributes:", result.recordAttributes?.length || 0);

      return {
        eventAttributes: result.eventAttributes,
        recordAttributes: result.recordAttributes,
        message: `Metadata retrieved successfully. Found ${result.eventAttributes?.length || 0} event attributes and ${result.recordAttributes?.length || 0} record attributes.`,
      };
    } catch (error) {
      console.error("[getMetadata] Error:", error);
      throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
