/**
 * Step-based architecture types for the citation framework.
 * Each step represents a discrete operation in the citation/explanation flow.
 *
 * Shared by both the main app and explain app.
 * Originally in app/explain/steps/types.ts — moved here for cross-app access.
 */

// Utility type for values with citation IDs
export interface IdValue<T> {
  id: string;
  value: T;
}

// Event attribute with ID support for citations
export interface EventAttribute {
  attribute: IdValue<string>;
  value: IdValue<string>;
  negated?: IdValue<boolean>;
}

// ============================================================================
// NO FILTER STEP
// ============================================================================

export interface NoFilterStep {
  type: "no-filter";
  label: IdValue<"NO FILTER APPLIED">;
  sessionCount: IdValue<number>;
}

// ============================================================================
// FILTER STEPS
// ============================================================================

export interface PatternFilterStep {
  type: "pattern-filter";
  label: IdValue<"FILTER BY">;
  index: number;
  pattern: EventAttribute[];
  sessionCount?: IdValue<number>; // Only exists for the last filter
}

export interface CategoricalRecordAttributeFilterStep {
  type: "categorical-record-attribute-filter";
  label: IdValue<"FILTER BY">;
  index: number;
  recordAttribute: {
    name: IdValue<string>;
    value: IdValue<string>;
  };
  sessionCount?: IdValue<number>; // Only exists for the last filter
}

export interface NumericalRecordAttributeFilterStep {
  type: "numerical-record-attribute-filter";
  label: IdValue<"FILTER BY">;
  index: number;
  recordAttribute: {
    name: IdValue<string>;
    range: IdValue<{ min: string; max: string }>;
  };
  sessionCount?: IdValue<number>; // Only exists for the last filter
}

export type FilterStep =
  | PatternFilterStep
  | CategoricalRecordAttributeFilterStep
  | NumericalRecordAttributeFilterStep;

// ============================================================================
// SEGMENT STEP
// ============================================================================

export interface SegmentStep {
  type: "segment";
  index: number;
  label: IdValue<"FOCUS BETWEEN" | "FOCUS BEFORE" | "FOCUS AFTER">;
  events: EventAttribute | [EventAttribute, EventAttribute];
}

// ============================================================================
// ANALYSIS STEPS
// ============================================================================

export interface SessionCountAnalysisStep {
  type: "session-count-analysis";
  index: number;
  label: IdValue<"SESSION COUNT">;
  sessionCount: IdValue<number>;
}

export interface EventCountAnalysisStep {
  type: "event-count-analysis";
  index: number;
  label: IdValue<"EVENT COUNT">;
  eventCount: IdValue<number>;
}

export interface DurationAnalysisStep {
  type: "duration-analysis";
  index: number;
  label: IdValue<"AVERAGE DURATION">;
  duration: IdValue<number>; // Duration in seconds
}

export interface PatternDistributionAnalysisStep {
  type: "pattern-distribution-analysis";
  index: number;
  label: IdValue<string>; // e.g., "FREQUENT PATTERNS: PAGE"
  distribution: {
    pattern: EventAttribute[];
    percentage: IdValue<number>;
  }[];
}

export interface CategoryDistributionAnalysisStep {
  type: "category-distribution-analysis";
  index: number;
  label: IdValue<string>; // e.g., "DISTRIBUTION: DEVICE"
  distribution: {
    category: IdValue<string>;
    percentage: IdValue<number>;
  }[];
}

export interface NumberAnalysisStep {
  type: "number-analysis";
  index: number;
  label: IdValue<string>; // e.g., "AVERAGE TOTALAMOUNT"
  value: IdValue<number>;
}

export interface FunnelAnalysisStep {
  type: "funnel-analysis";
  index: number;
  label: IdValue<"FUNNEL ANALYSIS">;
  funnel: {
    eventAttribute: Omit<EventAttribute, "negated">;
    percentage: IdValue<number>;
  }[];
  durations: IdValue<number>[]; // Duration in seconds between consecutive funnel events
  eventCounts: IdValue<number>[]; // Event counts between consecutive funnel events
}

export interface EdgeAnalysisStep {
  type: "edge-analysis";
  index: number;
  label: IdValue<string>; // e.g., "EDGE ANALYSIS: PAGE = purchase"
  outcomeEvent: Omit<EventAttribute, "negated">;
  oddsRatios: {
    eventAttribute: Omit<EventAttribute, "negated">;
    oddsRatio: IdValue<number>;
  }[];
}

export type AnalysisStep =
  | SessionCountAnalysisStep
  | EventCountAnalysisStep
  | DurationAnalysisStep
  | PatternDistributionAnalysisStep
  | CategoryDistributionAnalysisStep
  | NumberAnalysisStep
  | FunnelAnalysisStep
  | EdgeAnalysisStep;

// ============================================================================
// COMPARISON STEP
// ============================================================================

export interface ComparisonStep {
  type: "comparison";
  index: number;
  label: IdValue<"Based on the above...">;
  values: IdValue<string>[];
  operators: IdValue<string>[];
}

// ============================================================================
// SEPARATOR STEP
// ============================================================================

export interface SeparatorStep {
  type: "separator";
}

// ============================================================================
// UNION TYPE FOR ALL STEPS
// ============================================================================

export type Step =
  | NoFilterStep
  | PatternFilterStep
  | CategoricalRecordAttributeFilterStep
  | NumericalRecordAttributeFilterStep
  | SegmentStep
  | SessionCountAnalysisStep
  | EventCountAnalysisStep
  | DurationAnalysisStep
  | PatternDistributionAnalysisStep
  | CategoryDistributionAnalysisStep
  | NumberAnalysisStep
  | FunnelAnalysisStep
  | EdgeAnalysisStep
  | ComparisonStep
  | SeparatorStep;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * ID Generator interface — shared by all generator implementations.
 */
export interface IIdGenerator {
  next(): string;
}

/**
 * Prefix-based ID generator.
 * Produces deterministic IDs like "{prefix}-0", "{prefix}-1", etc.
 * Used by explain popup for comparison steps.
 */
export class PrefixedIdGenerator implements IIdGenerator {
  private counter = 0;

  constructor(private prefix: string) {}

  next(): string {
    return `${this.prefix}-${this.counter++}`;
  }
}

/**
 * Citation ID generator for the citation grid.
 * Produces two kinds of IDs:
 * - stepId(): semantic path IDs for values without table IDs
 *   e.g., "{toolCallId}-cell-0-0-step-1-label"
 * - dataId(): prefixed original table IDs for values with existing IDs
 *   e.g., "{toolCallId}-cell-0-0-number-0"
 */
export class CitationIdGenerator {
  constructor(
    private toolCallId: string,
    private cellPrefix: string // e.g., "cell-0-1" or "row-header-0-session-count"
  ) {}

  /** For values WITHOUT table IDs — semantic path within a step */
  stepId(stepIndex: number, ...path: (string | number)[]): string {
    return `${this.toolCallId}-${this.cellPrefix}-step-${stepIndex}-${path.join('-')}`;
  }

  /** For values WITH table IDs — prefix original ID with toolCallId */
  dataId(originalTableId: string): string {
    return `${this.toolCallId}-${originalTableId}`;
  }
}
