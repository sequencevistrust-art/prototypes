/**
 * Step-based architecture types for the citation framework.
 * Each step represents a discrete operation in the citation/explanation flow.
 *
 * Shared by both the main app and explain app.
 * Originally in app/explain/steps/types.ts — moved here for cross-app access.
 */

// Re-export everything from the shared types location
export {
  type IdValue,
  type EventAttribute,
  type NoFilterStep,
  type PatternFilterStep,
  type CategoricalRecordAttributeFilterStep,
  type NumericalRecordAttributeFilterStep,
  type FilterStep,
  type SegmentStep,
  type SessionCountAnalysisStep,
  type EventCountAnalysisStep,
  type DurationAnalysisStep,
  type PatternDistributionAnalysisStep,
  type CategoryDistributionAnalysisStep,
  type NumberAnalysisStep,
  type FunnelAnalysisStep,
  type EdgeAnalysisStep,
  type AnalysisStep,
  type ComparisonStep,
  type SeparatorStep,
  type Step,
  type IIdGenerator,
  PrefixedIdGenerator,
  CitationIdGenerator,
} from "../../types/steps";
