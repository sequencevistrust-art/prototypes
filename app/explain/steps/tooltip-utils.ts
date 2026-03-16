import {
  EventAttribute,
  PatternFilterStep,
  CategoricalRecordAttributeFilterStep,
  NumericalRecordAttributeFilterStep,
  SegmentStep,
  PatternDistributionAnalysisStep,
  CategoryDistributionAnalysisStep,
  NumberAnalysisStep,
  FunnelAnalysisStep,
  EdgeAnalysisStep,
} from "./types";

/**
 * Format a pattern as a readable string
 * e.g., "PAGE = add_to_cart → PAGE = checkout"
 */
export function formatPattern(pattern: EventAttribute[]): string {
  return pattern
    .map((event) => {
      const negated = event.negated?.value;
      return negated
        ? `${event.attribute.value} ≠ ${event.value.value}`
        : `${event.attribute.value} = ${event.value.value}`;
    })
    .join(" → ");
}

/**
 * Generate tooltip for pattern filter step
 */
export function getPatternFilterTooltip(step: PatternFilterStep): string {
  return `Filter by pattern: ${formatPattern(step.pattern)}`;
}

/**
 * Generate tooltip for categorical record attribute filter step
 */
export function getCategoricalFilterTooltip(step: CategoricalRecordAttributeFilterStep): string {
  return `Filter by ${step.recordAttribute.name.value} = ${step.recordAttribute.value.value}`;
}

/**
 * Generate tooltip for numerical record attribute filter step
 */
export function getNumericalFilterTooltip(step: NumericalRecordAttributeFilterStep): string {
  const range = step.recordAttribute.range.value;
  return `Filter by ${step.recordAttribute.name.value} between ${range.min} and ${range.max}`;
}

/**
 * Generate tooltip for segment step
 */
export function getSegmentTooltip(step: SegmentStep): string {
  const label = step.label.value;

  if (label === "FOCUS BETWEEN") {
    const events = step.events as [EventAttribute, EventAttribute];
    const startEvent = events[0];
    const endEvent = events[1];
    return `Analyze segment from ${startEvent.attribute.value} = ${startEvent.value.value} to ${endEvent.attribute.value} = ${endEvent.value.value}`;
  }

  if (label === "FOCUS BEFORE") {
    const event = step.events as EventAttribute;
    return `Analyze events before ${event.attribute.value} = ${event.value.value}`;
  }

  if (label === "FOCUS AFTER") {
    const event = step.events as EventAttribute;
    return `Analyze events after ${event.attribute.value} = ${event.value.value}`;
  }

  return "Analyze entire sequence";
}

/**
 * Generate tooltip for pattern distribution analysis step
 */
export function getPatternDistributionTooltip(step: PatternDistributionAnalysisStep): string {
  const attributes = new Set<string>();
  step.distribution.forEach((item) => {
    item.pattern.forEach((event) => attributes.add(event.attribute.value));
  });
  const attrList = Array.from(attributes);
  if (attrList.length === 1) {
    return `Find frequent patterns for ${attrList[0]}`;
  }
  return "Find frequent patterns in the data";
}

/**
 * Generate tooltip for category distribution analysis step
 */
export function getCategoryDistributionTooltip(step: CategoryDistributionAnalysisStep): string {
  // Label is like "DISTRIBUTION: DEVICE" - extract the attribute name
  const label = step.label.value;
  const match = label.match(/DISTRIBUTION:\s*(.+)/i);
  const attributeName = match ? match[1] : "attribute";
  return `Compute distribution of ${attributeName}`;
}

/**
 * Generate tooltip for number analysis step
 */
export function getNumberAnalysisTooltip(step: NumberAnalysisStep): string {
  // Label contains the aggregation and name, e.g., "AVERAGE TOTALAMOUNT"
  return step.label.value;
}

/**
 * Generate tooltip for funnel analysis step
 */
export function getFunnelAnalysisTooltip(_step: FunnelAnalysisStep): string {
  return "Compute funnel conversion rates between events";
}

/**
 * Generate tooltip for edge analysis step
 */
export function getEdgeAnalysisTooltip(step: EdgeAnalysisStep): string {
  return `Analyze factors leading to ${step.outcomeEvent.attribute.value} = ${step.outcomeEvent.value.value}`;
}
