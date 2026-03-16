import { z } from "zod";

// Helper to generate unique IDs (same as operations-store)
export const generateOperationId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// EventAttribute schema - base schema without negated being optional
const eventAttributeSchema = z.object({
  attribute: z.string().min(1, "Event attribute name is required").describe("The event attribute name (e.g., 'page', 'action')"),
  value: z.string().describe("The value to match"),
  negated: z.boolean().optional().default(false).describe("Whether this is a negation (NOT condition)"),
});

// EventAttribute schema that does not include negation field
// Used for operations where negation is not supported
const eventAttributeNoNegationSchema = z.object({
  attribute: z.string().min(1, "Event attribute name is required").describe("The event attribute name (e.g., 'page', 'action')"),
  value: z.string().describe("The value to match"),
});

// Filter Operation Schemas
const filterRecordAttributeCategoricalSchema = z.object({
  type: z.literal("filter"),
  subType: z.literal("record-attribute"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Name of the record attribute"),
    type: z.literal("categorical"),
    value: z.string().min(1, "Categorical value is required").describe("The categorical value to filter by"),
  }),
});

const filterRecordAttributeNumericalSchema = z.object({
  type: z.literal("filter"),
  subType: z.literal("record-attribute"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Name of the record attribute"),
    type: z.literal("numerical"),
    min: z.number().describe("Minimum value (inclusive)"),
    max: z.number().describe("Maximum value (inclusive)"),
  }),
});

export const filterOperationSchema = z.union([
  filterRecordAttributeCategoricalSchema,
  filterRecordAttributeNumericalSchema,
]);

// Row Operation Schemas
const rowAddOneByPatternSchema = z.object({
  type: z.literal("row"),
  subType: z.literal("add-one-row-by-pattern"),
  pattern: z.array(eventAttributeSchema)
    .default([])
    .describe("Pattern to match sequences (empty array = all sequences)"),
  segment: z.object({
    startIndex: z.number().nullable().describe("Start index in pattern (0-based), or null for beginning of sequence"),
    endIndex: z.number().nullable().describe("End index in pattern (0-based), or null for end of sequence"),
  }).describe("Segment boundaries for extraction"),
}).refine(
  (data) => {
    const { startIndex, endIndex } = data.segment;
    // Validate indices are within pattern bounds if not null
    if (startIndex !== null && (startIndex < 0 || startIndex >= data.pattern.length)) {
      return false;
    }
    if (endIndex !== null && (endIndex < 0 || endIndex >= data.pattern.length)) {
      return false;
    }
    // Validate startIndex <= endIndex when both are specified
    if (startIndex !== null && endIndex !== null && startIndex > endIndex) {
      return false;
    }
    return true;
  },
  {
    message: "Segment indices must be valid (within pattern bounds and startIndex <= endIndex when both specified).",
  }
);

const rowAddOneByRecordAttributeCategoricalSchema = z.object({
  type: z.literal("row"),
  subType: z.literal("add-one-row-by-record-attribute"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Record attribute name"),
    type: z.literal("categorical"),
    value: z.string().min(1, "Categorical value is required").describe("Categorical value"),
  }),
});

const rowAddOneByRecordAttributeNumericalSchema = z.object({
  type: z.literal("row"),
  subType: z.literal("add-one-row-by-record-attribute"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Record attribute name"),
    type: z.literal("numerical"),
    min: z.number().describe("Minimum value"),
    max: z.number().describe("Maximum value"),
  }),
});

// Mine frequent patterns after applying filtering and segmentation
// eventAttribute: the event attribute to mine patterns on
// pattern: filtering rules (empty array = no filtering)
// segment: segmentation rules (both null = no segmentation, use entire sequence)
const rowAddRowsByPatternSchema = z.object({
  type: z.literal("row"),
  subType: z.literal("add-rows-by-pattern"),
  eventAttribute: z.string().min(1, "Event attribute name is required").describe("The event attribute to mine patterns from (e.g., 'page')"),
  pattern: z.array(eventAttributeSchema)
    .default([])
    .describe("Pattern for filtering sequences. Empty array means no filtering. Supports negation."),
  segment: z.object({
    startIndex: z.number().nullable().describe("Start index in pattern (0-based), or null for beginning of sequence"),
    endIndex: z.number().nullable().describe("End index in pattern (0-based), or null for end of sequence"),
  }),
}).refine(
  (data) => {
    const { startIndex, endIndex } = data.segment;
    // If pattern is empty, indices must both be null (no segmentation without pattern)
    if (data.pattern.length === 0) {
      return startIndex === null && endIndex === null;
    }
    // Validate indices are within pattern bounds if not null
    if (startIndex !== null && (startIndex < 0 || startIndex >= data.pattern.length)) {
      return false;
    }
    if (endIndex !== null && (endIndex < 0 || endIndex >= data.pattern.length)) {
      return false;
    }
    // Validate startIndex <= endIndex when both are specified
    if (startIndex !== null && endIndex !== null && startIndex > endIndex) {
      return false;
    }
    return true;
  },
  {
    message: "Segment indices must be valid (within pattern bounds and startIndex <= endIndex when both specified). If pattern is empty, both indices must be null.",
  }
);

const rowAddRowsByRecordAttributeSchema = z.object({
  type: z.literal("row"),
  subType: z.literal("add-rows-by-record-attribute"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Record attribute name to group by"),
    type: z.literal("categorical"),
  }),
});

export const rowOperationSchema = z.union([
  rowAddOneByPatternSchema,
  rowAddOneByRecordAttributeCategoricalSchema,
  rowAddOneByRecordAttributeNumericalSchema,
  rowAddRowsByPatternSchema,
  rowAddRowsByRecordAttributeSchema,
]);

// Column Operation Schemas
const columnNumericalSchema = z.object({
  type: z.literal("column"),
  subType: z.literal("numerical"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Record attribute name"),
    type: z.literal("numerical"),
  }),
  aggregation: z.enum(["average", "sum", "min", "max"]).default("average").describe("Aggregation type (defaults to average)"),
});

const columnCategoricalSchema = z.object({
  type: z.literal("column"),
  subType: z.literal("categorical"),
  recordAttribute: z.object({
    name: z.string().min(1, "Record attribute name is required").describe("Record attribute name"),
    type: z.literal("categorical"),
  }),
  aggregation: z.enum(["distribution", "count-unique"]).default("distribution")
    .describe("Aggregation type: 'distribution' shows percentage breakdown, 'count-unique' returns the number of unique values"),
});

// Mine patterns from sequences
const columnPatternAnalysisSchema = z.object({
  type: z.literal("column"),
  subType: z.literal("pattern"),
  analysis: z.literal("pattern"),
  eventAttribute: z.string().min(1, "Event attribute name is required").describe("The event attribute to mine patterns from (e.g., 'page')"),
});

// Analyze event attribute distribution
const columnEventAttributeAnalysisSchema = z.object({
  type: z.literal("column"),
  subType: z.literal("pattern"),
  analysis: z.literal("event-attribute"),
  eventAttribute: z.string().min(1, "Event attribute name is required").describe("The event attribute to analyze (e.g., 'page')"),
});

const columnFunnelAnalysisSchema = z.object({
  type: z.literal("column"),
  subType: z.literal("pattern"),
  analysis: z.literal("funnel"),
  pattern: z.array(eventAttributeNoNegationSchema)
    .min(1, "Funnel must have at least one step")
    .describe("Funnel steps as pattern. Negation is not supported."),
});

export const columnOperationSchema = z.union([
  columnNumericalSchema,
  columnCategoricalSchema,
  columnPatternAnalysisSchema,
  columnEventAttributeAnalysisSchema,
  columnFunnelAnalysisSchema,
]);

// Unified operation schema - use union of the sub-schemas
export const operationSchema = z.union([
  filterOperationSchema,
  rowOperationSchema,
  columnOperationSchema,
]);
