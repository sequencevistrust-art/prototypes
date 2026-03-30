/**
 * Conversion layer: transforms table data (ReferencedCell) into Step[]
 * This is the bridge between the current data structure and the step-based architecture
 */

import {
  Step,
  NoFilterStep,
  PatternFilterStep,
  CategoricalRecordAttributeFilterStep,
  NumericalRecordAttributeFilterStep,
  SegmentStep,
  SessionCountAnalysisStep,
  EventCountAnalysisStep,
  DurationAnalysisStep,
  PatternDistributionAnalysisStep,
  CategoryDistributionAnalysisStep,
  NumberAnalysisStep,
  FunnelAnalysisStep,
  EdgeAnalysisStep,
  ComparisonStep,
  SeparatorStep,
  EventAttribute,
  IdValue,
  IIdGenerator,
  PrefixedIdGenerator,
  CitationIdGenerator,
} from "./types";
import { ReferencedCell } from "../../utils/extractReferencedCells";
import {
  RowHeader,
  PatternRowHeader,
  RecordAttributeRowHeader,
  Cell,
} from "../../types/sandbox";
import { FilterOperation, EventAttribute as OperationEventAttribute } from "../../types/operations";
import { formatDuration } from "../../utils/formatters";

/**
 * Create an IdValue with an ID from a simple generator.
 * Only used by createComparisonStep (for explain popup compatibility).
 */
function idValue<T>(gen: IIdGenerator, value: T): IdValue<T> {
  return { id: gen.next(), value };
}

/**
 * Convert operation EventAttribute to step EventAttribute format
 */
function convertEventAttribute(
  gen: CitationIdGenerator,
  event: OperationEventAttribute | Omit<OperationEventAttribute, "negated">,
  stepIndex: number,
  pathPrefix: string, // e.g., 'pattern-0', 'funnel-2', 'outcomeEvent'
): EventAttribute {
  const result: EventAttribute = {
    attribute: { id: gen.stepId(stepIndex, pathPrefix, 'attribute'), value: event.attribute },
    value: { id: gen.stepId(stepIndex, pathPrefix, 'value'), value: event.value },
  };
  if ("negated" in event && event.negated !== undefined) {
    result.negated = { id: gen.stepId(stepIndex, pathPrefix, 'negated'), value: event.negated };
  }
  return result;
}

/**
 * Get pattern with segment info from row header operation
 */
function getPatternWithSegment(rowHeader: RowHeader): {
  pattern: OperationEventAttribute[];
  segment: { startIndex: number | null; endIndex: number | null };
} | null {
  if (rowHeader.type !== "pattern") return null;

  const operation = rowHeader.operation;

  if (
    operation.subType === "add-one-row-by-pattern" ||
    operation.subType === "add-rows-by-pattern"
  ) {
    if ("pattern" in operation && "segment" in operation) {
      const op = operation as {
        pattern: OperationEventAttribute[];
        segment: { startIndex: number | null; endIndex: number | null };
      };
      const hasSegmentation =
        op.segment.startIndex !== null || op.segment.endIndex !== null;
      if (hasSegmentation) {
        return { pattern: op.pattern, segment: op.segment };
      }
    }
  }

  return null;
}

/**
 * Convert filter operations to filter steps
 */
function convertFiltersToSteps(
  gen: CitationIdGenerator,
  rowHeader: RowHeader,
  startIndex: number,
  skipPattern: boolean,
  showSessionCount: boolean,
): Step[] {
  const steps: Step[] = [];
  let currentIndex = startIndex;

  const filters: FilterOperation[] = [...rowHeader.appliedFilters];

  // Count total filters to know which is last
  let totalFilters = filters.length;
  if (rowHeader.type === "record-attribute") totalFilters++;
  if (rowHeader.type === "pattern" && !skipPattern && rowHeader.pattern.length > 0) totalFilters++;

  let filterIndex = 0;

  // Applied filters
  for (const filter of filters) {
    const isLast = filterIndex === totalFilters - 1;
    const attr = filter.recordAttribute;

    if (attr.type === "categorical") {
      const step: CategoricalRecordAttributeFilterStep = {
        type: "categorical-record-attribute-filter",
        label: { id: gen.stepId(currentIndex, 'label'), value: "FILTER BY" as const },
        index: currentIndex,
        recordAttribute: {
          name: { id: gen.stepId(currentIndex, 'recordAttribute', 'name'), value: attr.name },
          value: { id: gen.stepId(currentIndex, 'recordAttribute', 'value'), value: attr.value ?? "All" },
        },
        sessionCount: isLast && showSessionCount
          ? { id: gen.dataId(rowHeader.sessionCount.id), value: rowHeader.sessionCount.value }
          : undefined,
      };
      steps.push(step);
    } else {
      const step: NumericalRecordAttributeFilterStep = {
        type: "numerical-record-attribute-filter",
        label: { id: gen.stepId(currentIndex, 'label'), value: "FILTER BY" as const },
        index: currentIndex,
        recordAttribute: {
          name: { id: gen.stepId(currentIndex, 'recordAttribute', 'name'), value: attr.name },
          range: { id: gen.stepId(currentIndex, 'recordAttribute', 'range'), value: { min: String(attr.min), max: String(attr.max) } },
        },
        sessionCount: isLast && showSessionCount
          ? { id: gen.dataId(rowHeader.sessionCount.id), value: rowHeader.sessionCount.value }
          : undefined,
      };
      steps.push(step);
    }

    currentIndex++;
    filterIndex++;
  }

  // Record attribute row header's own attribute
  if (rowHeader.type === "record-attribute") {
    const isLast = filterIndex === totalFilters - 1;
    const recordHeader = rowHeader as RecordAttributeRowHeader;
    const attr = recordHeader.recordAttribute;

    if (attr.type === "categorical") {
      const step: CategoricalRecordAttributeFilterStep = {
        type: "categorical-record-attribute-filter",
        label: { id: gen.stepId(currentIndex, 'label'), value: "FILTER BY" as const },
        index: currentIndex,
        recordAttribute: {
          name: { id: gen.stepId(currentIndex, 'recordAttribute', 'name'), value: attr.name },
          value: { id: gen.stepId(currentIndex, 'recordAttribute', 'value'), value: attr.value ?? "All" },
        },
        sessionCount: isLast && showSessionCount
          ? { id: gen.dataId(rowHeader.sessionCount.id), value: rowHeader.sessionCount.value }
          : undefined,
      };
      steps.push(step);
    } else {
      const value = attr.value;
      let range = { min: "0", max: "∞" };
      if (value && typeof value === "object" && "min" in value && "max" in value) {
        range = { min: String(value.min), max: String(value.max) };
      }

      const step: NumericalRecordAttributeFilterStep = {
        type: "numerical-record-attribute-filter",
        label: { id: gen.stepId(currentIndex, 'label'), value: "FILTER BY" as const },
        index: currentIndex,
        recordAttribute: {
          name: { id: gen.stepId(currentIndex, 'recordAttribute', 'name'), value: attr.name },
          range: { id: gen.stepId(currentIndex, 'recordAttribute', 'range'), value: range },
        },
        sessionCount: isLast && showSessionCount
          ? { id: gen.dataId(rowHeader.sessionCount.id), value: rowHeader.sessionCount.value }
          : undefined,
      };
      steps.push(step);
    }

    currentIndex++;
    filterIndex++;
  }

  // Pattern filter (if not skipped)
  if (rowHeader.type === "pattern" && !skipPattern && rowHeader.pattern.length > 0) {
    const isLast = filterIndex === totalFilters - 1;
    const patternHeader = rowHeader as PatternRowHeader;

    const step: PatternFilterStep = {
      type: "pattern-filter",
      label: { id: gen.stepId(currentIndex, 'label'), value: "FILTER BY" as const },
      index: currentIndex,
      pattern: patternHeader.pattern.map((e, i) => convertEventAttribute(gen, e, currentIndex, `pattern-${i}`)),
      sessionCount: isLast && showSessionCount
        ? { id: gen.dataId(rowHeader.sessionCount.id), value: rowHeader.sessionCount.value }
        : undefined,
    };
    steps.push(step);

    currentIndex++;
  }

  return steps;
}

/**
 * Convert pattern with segment to steps (PatternFilterStep + SegmentStep)
 */
function convertPatternSegmentToSteps(
  gen: CitationIdGenerator,
  patternWithSegment: {
    pattern: OperationEventAttribute[];
    segment: { startIndex: number | null; endIndex: number | null };
  },
  sessionCount: { id: string; value: number },
  startIndex: number,
): Step[] {
  const steps: Step[] = [];
  const { pattern, segment } = patternWithSegment;

  // Pattern filter step
  const patternStep: PatternFilterStep = {
    type: "pattern-filter",
    label: { id: gen.stepId(startIndex, 'label'), value: "FILTER BY" as const },
    index: startIndex,
    pattern: pattern.map((e, i) => convertEventAttribute(gen, e, startIndex, `pattern-${i}`)),
    sessionCount: { id: gen.dataId(sessionCount.id), value: sessionCount.value },
  };
  steps.push(patternStep);

  // Segment step
  const segStepIndex = startIndex + 1;
  const { startIndex: segStart, endIndex: segEnd } = segment;
  let segmentLabel: "FOCUS BETWEEN" | "FOCUS BEFORE" | "FOCUS AFTER";
  let events: EventAttribute | [EventAttribute, EventAttribute];

  if (segStart === null && segEnd !== null) {
    segmentLabel = "FOCUS BEFORE";
    events = convertEventAttribute(gen, pattern[segEnd], segStepIndex, 'event');
  } else if (segStart !== null && segEnd === null) {
    segmentLabel = "FOCUS AFTER";
    events = convertEventAttribute(gen, pattern[segStart], segStepIndex, 'event');
  } else if (segStart !== null && segEnd !== null) {
    segmentLabel = "FOCUS BETWEEN";
    events = [
      convertEventAttribute(gen, pattern[segStart], segStepIndex, 'startEvent'),
      convertEventAttribute(gen, pattern[segEnd], segStepIndex, 'endEvent'),
    ];
  } else {
    // Both null - full pattern (shouldn't normally happen with segmentation)
    segmentLabel = "FOCUS BETWEEN";
    events = [
      convertEventAttribute(gen, pattern[0], segStepIndex, 'startEvent'),
      convertEventAttribute(gen, pattern[pattern.length - 1], segStepIndex, 'endEvent'),
    ];
  }

  const segmentStep: SegmentStep = {
    type: "segment",
    index: segStepIndex,
    label: { id: gen.stepId(segStepIndex, 'label'), value: segmentLabel },
    events,
  };
  steps.push(segmentStep);

  return steps;
}

/**
 * Convert a cell to an analysis step.
 */
function convertCellToAnalysisStep(
  gen: CitationIdGenerator,
  cell: Cell,
  index: number,
): Step {
  switch (cell.type) {
    case "funnel": {
      const step: FunnelAnalysisStep = {
        type: "funnel-analysis",
        index,
        label: { id: gen.stepId(index, 'label'), value: "FUNNEL ANALYSIS" as const },
        funnel: cell.funnel.map((f, idx) => ({
          eventAttribute: {
            attribute: { id: gen.stepId(index, 'funnel', idx, 'attribute'), value: f.eventAttribute.attribute },
            value: { id: gen.stepId(index, 'funnel', idx, 'value'), value: f.eventAttribute.value },
          },
          percentage: { id: gen.dataId(f.id), value: f.percentage },
        })),
        durations: cell.durations.map((d) => ({
          id: gen.dataId(d.id),
          value: d.value,
        })),
        eventCounts: cell.eventCounts.map((c) => ({
          id: gen.dataId(c.id),
          value: c.value,
        })),
      };
      return step;
    }

    case "pattern-distribution": {
      // Extract unique attributes from patterns for label
      const attributes = new Set<string>();
      cell.distribution.forEach((item) => {
        item.pattern.forEach((event) => attributes.add(event.attribute));
      });
      const attrList = Array.from(attributes);
      const labelText =
        attrList.length === 1
          ? `FREQUENT PATTERNS: ${attrList[0]}`
          : "FREQUENT PATTERNS";

      const step: PatternDistributionAnalysisStep = {
        type: "pattern-distribution-analysis",
        index,
        label: { id: gen.stepId(index, 'label'), value: labelText },
        distribution: cell.distribution.map((item, idx) => ({
          pattern: item.pattern.map((e, eIdx) => convertEventAttribute(gen, e, index, `distribution-${idx}-pattern-${eIdx}`)),
          percentage: { id: gen.dataId(item.id), value: item.percentage },
        })),
      };
      return step;
    }

    case "category-distribution": {
      const step: CategoryDistributionAnalysisStep = {
        type: "category-distribution-analysis",
        index,
        label: { id: gen.stepId(index, 'label'), value: `DISTRIBUTION: ${cell.name}` },
        distribution: cell.distribution.map((item, idx) => ({
          category: { id: gen.stepId(index, 'category', idx, 'value'), value: item.category },
          percentage: { id: gen.dataId(item.id), value: item.percentage },
        })),
      };
      return step;
    }

    case "number": {
      const step: NumberAnalysisStep = {
        type: "number-analysis",
        index,
        label: { id: gen.stepId(index, 'label'), value: `${cell.aggregation.toUpperCase()} ${cell.name.toUpperCase()}` },
        value: { id: gen.dataId(cell.id), value: cell.value },
      };
      return step;
    }

    case "edge-analysis": {
      const step: EdgeAnalysisStep = {
        type: "edge-analysis",
        index,
        label: { id: gen.stepId(index, 'label'), value: `EDGE ANALYSIS: ${cell.outcomeEvent.attribute} = ${cell.outcomeEvent.value}` },
        outcomeEvent: {
          attribute: { id: gen.stepId(index, 'outcomeEvent', 'attribute'), value: cell.outcomeEvent.attribute },
          value: { id: gen.stepId(index, 'outcomeEvent', 'value'), value: cell.outcomeEvent.value },
        },
        oddsRatios: cell.oddsRatios.map((or, idx) => ({
          eventAttribute: {
            attribute: { id: gen.stepId(index, 'oddsRatio', idx, 'attribute'), value: or.eventAttribute.attribute },
            value: { id: gen.stepId(index, 'oddsRatio', idx, 'value'), value: or.eventAttribute.value },
          },
          oddsRatio: { id: gen.dataId(or.id), value: or.oddsRatio },
        })),
      };
      return step;
    }

    default:
      // Fallback for unknown cell types
      const unknownStep: NumberAnalysisStep = {
        type: "number-analysis",
        index,
        label: { id: gen.stepId(index, 'label'), value: "ANALYSIS" },
        value: { id: gen.stepId(index, 'value'), value: 0 },
      };
      return unknownStep;
  }
}

/**
 * Convert row header to session count/event count/duration analysis steps.
 */
function convertRowHeaderToAnalysisSteps(
  gen: CitationIdGenerator,
  rowHeader: RowHeader,
  refType: "row-header" | "row-header-session-count" | "row-header-event-count" | "row-header-duration",
  index: number,
): Step[] {
  const steps: Step[] = [];

  if (refType === "row-header" || refType === "row-header-session-count") {
    const step: SessionCountAnalysisStep = {
      type: "session-count-analysis",
      index,
      label: { id: gen.stepId(index, 'label'), value: "SESSION COUNT" as const },
      sessionCount: { id: gen.dataId(rowHeader.sessionCount.id), value: rowHeader.sessionCount.value },
    };
    steps.push(step);
  }

  if (refType === "row-header" || refType === "row-header-event-count") {
    const stepIndex = refType === "row-header-event-count" ? index : index + steps.length;
    const step: EventCountAnalysisStep = {
      type: "event-count-analysis",
      index: stepIndex,
      label: { id: gen.stepId(stepIndex, 'label'), value: "EVENT COUNT" as const },
      eventCount: { id: gen.dataId(rowHeader.eventCount.id), value: rowHeader.eventCount.value },
    };
    steps.push(step);
  }

  if (refType === "row-header" || refType === "row-header-duration") {
    const stepIndex = refType === "row-header" ? index + steps.length : index;
    const step: DurationAnalysisStep = {
      type: "duration-analysis",
      index: stepIndex,
      label: { id: gen.stepId(stepIndex, 'label'), value: "AVERAGE DURATION" as const },
      duration: { id: gen.dataId(rowHeader.duration.id), value: rowHeader.duration.value },
    };
    steps.push(step);
  }

  return steps;
}

/**
 * Convert comparison operators and values to a ComparisonStep.
 * Uses IIdGenerator (not CitationIdGenerator) for explain popup compatibility.
 */
export function createComparisonStep(
  gen: IIdGenerator,
  values: { id: string; value: string }[],
  operators: string[],
  index: number
): ComparisonStep {
  return {
    type: "comparison",
    index,
    label: idValue(gen, "Based on the above..." as const),
    values: values.map((v) => idValue(gen, v.value)),
    sourceIds: values.map((v) => v.id),
    operators: operators.map((op) => idValue(gen, op)),
  };
}

/**
 * Main conversion function: converts ReferencedCell[] to Step[]
 * @param referencedCells - The cells to convert
 * @param operators - Operators between cells (for comparison steps)
 * @param gen - Citation ID generator
 */
export function convertToSteps(
  referencedCells: ReferencedCell[],
  operators: string[],
  gen: CitationIdGenerator,
): Step[] {
  const steps: Step[] = [];
  let currentIndex = 1;

  // Check if we have only comma operators (no explicit operation)
  const hasOnlyCommaOperators =
    operators.length === 0 || operators.every((op) => op === ",");

  for (let i = 0; i < referencedCells.length; i++) {
    const refCell = referencedCells[i];
    const isFirstCell = i === 0;

    // Add separator between cells (except for first)
    if (!isFirstCell) {
      const separator: SeparatorStep = { type: "separator" };
      steps.push(separator);
    }

    const isRowHeader =
      refCell.type === "row-header" ||
      refCell.type === "row-header-session-count" ||
      refCell.type === "row-header-event-count" ||
      refCell.type === "row-header-duration";

    // Check for pattern with segment
    const patternWithSegment = getPatternWithSegment(refCell.rowHeader);
    const hasPatternSegment = !!patternWithSegment;

    // Get filter count (to know where to show session count)
    const filterCount = refCell.rowHeader.appliedFilters.length +
      (refCell.rowHeader.type === "record-attribute" ? 1 : 0) +
      (refCell.rowHeader.type === "pattern" && !hasPatternSegment && refCell.rowHeader.pattern.length > 0 ? 1 : 0);

    // Convert filters to steps
    if (filterCount === 0 && !hasPatternSegment) {
      // No filter step — use step index 0
      const noFilterStep: NoFilterStep = {
        type: "no-filter",
        label: { id: gen.stepId(0, 'label'), value: "NO FILTER APPLIED" as const },
        sessionCount: { id: gen.dataId(refCell.rowHeader.sessionCount.id), value: refCell.rowHeader.sessionCount.value },
      };
      steps.push(noFilterStep);
    } else {
      // Add filter steps
      const filterSteps = convertFiltersToSteps(
        gen,
        refCell.rowHeader,
        currentIndex,
        hasPatternSegment, // skip pattern if we have pattern with segment
        !hasPatternSegment, // show session count only if no pattern segment
      );
      steps.push(...filterSteps);
      currentIndex += filterSteps.length;

      // Add pattern segment steps if present
      if (hasPatternSegment && patternWithSegment) {
        const patternSegmentSteps = convertPatternSegmentToSteps(
          gen,
          patternWithSegment,
          refCell.rowHeader.sessionCount,
          currentIndex,
        );
        steps.push(...patternSegmentSteps);
        currentIndex += patternSegmentSteps.length;
      }
    }

    // Add analysis step
    if (isRowHeader) {
      const analysisSteps = convertRowHeaderToAnalysisSteps(
        gen,
        refCell.rowHeader,
        refCell.type as "row-header" | "row-header-session-count" | "row-header-event-count" | "row-header-duration",
        currentIndex,
      );
      steps.push(...analysisSteps);
      currentIndex += analysisSteps.length;
    } else {
      const cell = refCell.data as Cell;
      const analysisStep = convertCellToAnalysisStep(
        gen,
        cell,
        currentIndex,
      );
      steps.push(analysisStep);
      currentIndex++;
    }
  }

  // Add comparison step if we have multiple cells and non-comma operators
  if (referencedCells.length >= 2 && !hasOnlyCommaOperators) {
    // Extract values for comparison from the referenced cells
    const comparisonValues = referencedCells.map((refCell) => {
      if (refCell.type === "row-header-session-count") {
        return {
          id: gen.dataId(refCell.rowHeader.sessionCount.id),
          value: refCell.rowHeader.sessionCount.value.toString(),
        };
      }
      if (refCell.type === "row-header-event-count") {
        return {
          id: gen.dataId(refCell.rowHeader.eventCount.id),
          value: refCell.rowHeader.eventCount.value.toString(),
        };
      }
      if (refCell.type === "row-header-duration") {
        return {
          id: gen.dataId(refCell.rowHeader.duration.id),
          value: formatDuration(refCell.rowHeader.duration.value),
        };
      }
      if (refCell.type === "row-header") {
        return {
          id: gen.dataId(refCell.rowHeader.sessionCount.id),
          value: refCell.rowHeader.sessionCount.value.toString(),
        };
      }
      // Cell value
      const cell = refCell.data as Cell;
      if (cell.type === "number") {
        const rounded = Math.round(cell.value * 100) / 100;
        return { id: gen.dataId(cell.id), value: rounded.toString() };
      }
      if (cell.type === "category-distribution" && refCell.numberIndex !== undefined) {
        const item = cell.distribution[refCell.numberIndex];
        if (item) {
          const rounded = Math.round(item.percentage * 100) / 100;
          return { id: gen.dataId(item.id), value: rounded.toString() };
        }
      }
      if (cell.type === "pattern-distribution" && refCell.numberIndex !== undefined) {
        const item = cell.distribution[refCell.numberIndex];
        if (item) {
          const rounded = Math.round(item.percentage * 100) / 100;
          return { id: gen.dataId(item.id), value: rounded.toString() };
        }
      }
      if (cell.type === "funnel") {
        if (refCell.durationIndex !== undefined && cell.durations[refCell.durationIndex]) {
          const dur = cell.durations[refCell.durationIndex];
          return { id: gen.dataId(dur.id), value: formatDuration(dur.value) };
        }
        if (refCell.countIndex !== undefined && cell.eventCounts[refCell.countIndex]) {
          const count = cell.eventCounts[refCell.countIndex];
          return { id: gen.dataId(count.id), value: count.value.toString() };
        }
      }
      return { id: refCell.id, value: "N/A" };
    });

    // Only add comparison step if all values are valid (not N/A)
    const allValuesValid = comparisonValues.every((v) => v.value !== "N/A");
    if (allValuesValid) {
      // Use PrefixedIdGenerator for comparison step (these IDs are display-only)
      const cmpGen = new PrefixedIdGenerator("cmp");
      const comparisonStep = createComparisonStep(
        cmpGen,
        comparisonValues,
        operators,
        currentIndex
      );
      steps.push(comparisonStep);
    }
  }

  return steps;
}

export default convertToSteps;
