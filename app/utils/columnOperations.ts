import {
  EventSequence,
  NumberCell,
  CategoryDistributionCell,
  PatternDistributionCell,
  FunnelCell,
  EdgeAnalysisCell,
} from "../types/sandbox";
import {
  ColumnNumericalOperation,
  ColumnCategoricalOperation,
  ColumnPatternAnalysisOperation,
  ColumnEventAttributeAnalysisOperation,
  ColumnFunnelAnalysisOperation,
  ColumnEdgeAnalysisOperation,
} from "../types/operations";
import { getRecordAttributes } from "../storage/dataStore";
import { mineFrequentPatterns } from "./patternMining";

/**
 * Compute numerical column cell
 * Aggregates a numerical record attribute across sequences
 */
export async function computeNumericalColumn(
  sequences: EventSequence[],
  operation: ColumnNumericalOperation,
  cellId: string
): Promise<NumberCell> {
  const values: number[] = [];

  for (const seq of sequences) {
    const recordAttr = await getRecordAttributes(seq.sessionId);
    if (recordAttr) {
      const value = recordAttr[operation.recordAttribute.name];
      if (typeof value === "number" && !isNaN(value)) {
        values.push(value);
      }
    }
  }

  let result = 0;

  if (values.length > 0) {
    switch (operation.aggregation) {
      case "average":
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case "sum":
        result = values.reduce((a, b) => a + b, 0);
        break;
      case "min":
        result = Math.min(...values);
        break;
      case "max":
        result = Math.max(...values);
        break;
    }
  }

  return {
    id: cellId,
    type: "number",
    value: result,
    name: operation.recordAttribute.name,
    aggregation: operation.aggregation,
  };
}

/**
 * Compute categorical column cell
 * Shows distribution of categorical record attribute values
 */
export async function computeCategoricalColumn(
  sequences: EventSequence[],
  operation: ColumnCategoricalOperation,
  cellId: string
): Promise<CategoryDistributionCell> {
  const categoryCounts = new Map<string, number>();
  const totalSequences = sequences.length;

  for (const seq of sequences) {
    const recordAttr = await getRecordAttributes(seq.sessionId);
    if (recordAttr) {
      const value = String(recordAttr[operation.recordAttribute.name]);
      categoryCounts.set(value, (categoryCounts.get(value) || 0) + 1);
    }
  }

  const distribution = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([category, count], index) => ({
      id: `${cellId}-number-${index}`,
      category,
      percentage: totalSequences > 0 ? (count / totalSequences) * 100 : 0,
    }));

  return {
    id: cellId,
    type: "category-distribution",
    name: operation.recordAttribute.name,
    distribution,
  };
}

/**
 * Compute count-unique column cell
 * Counts distinct values of a categorical record attribute across sequences
 */
export async function computeCountUniqueColumn(
  sequences: EventSequence[],
  operation: ColumnCategoricalOperation,
  cellId: string
): Promise<NumberCell> {
  const uniqueValues = new Set<string>();

  for (const seq of sequences) {
    const recordAttr = await getRecordAttributes(seq.sessionId);
    if (recordAttr) {
      const value = recordAttr[operation.recordAttribute.name];
      if (value !== null && value !== undefined) {
        uniqueValues.add(String(value));
      }
    }
  }

  return {
    id: cellId,
    type: "number",
    value: uniqueValues.size,
    name: operation.recordAttribute.name,
    aggregation: "count-unique",
  };
}

/**
 * Compute pattern analysis column cell
 * Mines frequent patterns from sequences
 */
export async function computePatternAnalysisColumn(
  sequences: EventSequence[],
  operation: ColumnPatternAnalysisOperation,
  cellId: string
): Promise<PatternDistributionCell> {
  const patterns = await mineFrequentPatterns(sequences, operation.eventAttribute, 10);

  return {
    id: cellId,
    type: "pattern-distribution",
    distribution: patterns.map((p, index) => ({
      id: `${cellId}-number-${index}`,
      pattern: p.pattern,
      percentage: p.percentage,
    })),
  };
}

/**
 * Compute event attribute analysis column cell
 * Shows event-level counts: percentage of total events matching each attribute value
 */
export function computeEventAttributeAnalysisColumn(
  sequences: EventSequence[],
  operation: ColumnEventAttributeAnalysisOperation,
  cellId: string
): CategoryDistributionCell {
  const attributeName = operation.eventAttribute;

  // Count every individual event occurrence (event-level, not session-level)
  const eventValueCounts = new Map<string, number>();
  let totalEvents = 0;

  sequences.forEach((seq) => {
    seq.events.forEach((event) => {
      const value = String(event[attributeName]);
      eventValueCounts.set(value, (eventValueCounts.get(value) || 0) + 1);
      totalEvents++;
    });
  });

  const distribution = Array.from(eventValueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([category, count], index) => ({
      id: `${cellId}-number-${index}`,
      category,
      percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
    }));

  return {
    id: cellId,
    type: "category-distribution",
    name: attributeName,
    distribution,
  };
}

/**
 * Compute funnel analysis column cell
 * Shows percentage of sequences passing through each step in funnel
 */
export function computeFunnelAnalysisColumn(
  sequences: EventSequence[],
  operation: ColumnFunnelAnalysisOperation,
  cellId: string
): FunnelCell {
  const funnel = operation.pattern.map((patternElement, index) => ({
    id: `${cellId}-number-${index}`,
    eventAttribute: patternElement,
    percentage: 0,
  }));

  // Initialize durations and eventCounts with IDs
  // ID format: cellId-duration-{fromIndex}-{toIndex} for duration between event at fromIndex and toIndex
  const durations: { id: string; value: number }[] = [];
  const eventCounts: { id: string; value: number }[] = [];
  for (let i = 0; i < operation.pattern.length - 1; i++) {
    durations.push({ id: `${cellId}-duration-${i}-${i + 1}`, value: 0 });
    eventCounts.push({ id: `${cellId}-count-${i}-${i + 1}`, value: 0 });
  }

  if (sequences.length === 0) {
    return {
      id: cellId,
      type: "funnel",
      funnel,
      durations,
      eventCounts,
    };
  }

  // For each step in the funnel, count how many sequences reach it
  const stepCounts: number[] = new Array(operation.pattern.length).fill(0);
  
  // To calculate averages, we need to track how many sequences reached each transition
  const transitionReachedCounts: number[] = new Array(operation.pattern.length - 1).fill(0);
  const totalDurations: number[] = new Array(operation.pattern.length - 1).fill(0);
  const totalEventCounts: number[] = new Array(operation.pattern.length - 1).fill(0);

  sequences.forEach((seq) => {
    let currentStep = 0;
    let lastMatchedIndex = -1;
    let lastMatchedTimestamp: number | null = null;

    for (let i = 0; i < seq.events.length && currentStep < operation.pattern.length; i++) {
      const event = seq.events[i];
      const patternElement = operation.pattern[currentStep];
      const eventValue = event[patternElement.attribute];

      if (String(eventValue) === patternElement.value) {
        // We found a match for the current step
        stepCounts[currentStep]++;
        
        const currentTimestamp = new Date(event.timestamp).getTime();

        if (currentStep > 0) {
          // Calculate duration and event count from the previous step
          if (lastMatchedIndex !== -1 && lastMatchedTimestamp !== null) {
            const duration = (currentTimestamp - lastMatchedTimestamp) / 1000; // in seconds
            const gap = i - lastMatchedIndex - 1;

            totalDurations[currentStep - 1] += duration;
            totalEventCounts[currentStep - 1] += gap;
            transitionReachedCounts[currentStep - 1]++;
          }
        }

        lastMatchedIndex = i;
        lastMatchedTimestamp = currentTimestamp;
        currentStep++;
      }
    }
  });

  // Calculate percentages
  funnel.forEach((step, index) => {
    step.percentage = (stepCounts[index] / sequences.length) * 100;
  });

  // Calculate average durations and event counts between steps
  for (let i = 0; i < operation.pattern.length - 1; i++) {
    if (transitionReachedCounts[i] > 0) {
      durations[i].value = totalDurations[i] / transitionReachedCounts[i];
      eventCounts[i].value = totalEventCounts[i] / transitionReachedCounts[i];
    } else {
      durations[i].value = 0;
      eventCounts[i].value = 0;
    }
  }

  return {
    id: cellId,
    type: "funnel",
    funnel,
    durations,
    eventCounts,
  };
}

/**
 * Calculate chi-square test p-value for 2x2 contingency table
 * Uses Yates' continuity correction for small sample sizes
 */
function calculateChiSquarePValue(
  a: number, // has event & positive outcome
  b: number, // has event & negative outcome
  c: number, // no event & positive outcome
  d: number  // no event & negative outcome
): number {
  const n = a + b + c + d;

  if (n === 0) return 1.0;

  // Apply Yates' continuity correction
  const numerator = Math.abs(a * d - b * c) - n / 2;
  const denominator = (a + b) * (c + d) * (a + c) * (b + d);

  if (denominator === 0) return 1.0;

  const chiSquare = (n * numerator * numerator) / denominator;

  // Approximate p-value using chi-square distribution with 1 degree of freedom
  // For chi-square with df=1, we can use a lookup or approximation
  // Simple approximation: p ≈ exp(-chiSquare/2) for large chi-square
  // More accurate: use error function approximation

  if (chiSquare < 0) return 1.0;

  // Approximation using normal distribution
  const z = Math.sqrt(chiSquare);

  // Complementary error function approximation for p-value
  // This is a simplified approximation
  const t = 1 / (1 + 0.2316419 * z);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pValue = 0.5 * Math.exp(-z * z / 2) * poly * 2; // *2 for two-tailed

  return Math.min(1.0, Math.max(0.0, pValue));
}

/**
 * Compute edge analysis column cell
 * Analyzes correlation between event attributes and outcome event
 */
export function computeEdgeAnalysisColumn(
  sequences: EventSequence[],
  operation: ColumnEdgeAnalysisOperation,
  cellId: string
): EdgeAnalysisCell {
  const outcomeEvent = operation.eventAttribute;

  // Split sequences into positive (has outcome) and negative (no outcome)
  const positiveSequences: EventSequence[] = [];
  const negativeSequences: EventSequence[] = [];

  sequences.forEach((seq) => {
    const hasOutcome = seq.events.some(
      (event) => String(event[outcomeEvent.attribute]) === outcomeEvent.value
    );

    if (hasOutcome) {
      positiveSequences.push(seq);
    } else {
      negativeSequences.push(seq);
    }
  });

  const positiveEpisodes = positiveSequences.length;
  const negativeEpisodes = negativeSequences.length;

  // Collect all unique event attributes
  const eventAttributeMap = new Map<string, {
    name: string;
    value: string;
    positiveCount: number;
    negativeCount: number;
    totalFrequency: number;
  }>();

  // Count occurrences in positive sequences
  positiveSequences.forEach((seq) => {
    const seenAttributes = new Set<string>();

    seq.events.forEach((event) => {
      // Check all attributes of the event
      Object.keys(event).forEach((attrName) => {
        if (attrName === 'eventId' || attrName === 'sessionId' || attrName === 'timestamp') {
          return; // Skip metadata fields
        }

        const rawValue = event[attrName];
        // Skip empty, null, or undefined values
        if (rawValue === null || rawValue === undefined || rawValue === '' ||
            String(rawValue).trim() === '' || String(rawValue) === 'undefined' || String(rawValue) === 'null') {
          return;
        }

        const attrValue = String(rawValue);
        const key = `${attrName}:${attrValue}`;

        if (!seenAttributes.has(key)) {
          seenAttributes.add(key);

          if (!eventAttributeMap.has(key)) {
            eventAttributeMap.set(key, {
              name: attrName,
              value: attrValue,
              positiveCount: 0,
              negativeCount: 0,
              totalFrequency: 0,
            });
          }

          const attr = eventAttributeMap.get(key)!;
          attr.positiveCount++;
          attr.totalFrequency++;
        }
      });
    });
  });

  // Count occurrences in negative sequences
  negativeSequences.forEach((seq) => {
    const seenAttributes = new Set<string>();

    seq.events.forEach((event) => {
      Object.keys(event).forEach((attrName) => {
        if (attrName === 'eventId' || attrName === 'sessionId' || attrName === 'timestamp') {
          return;
        }

        const rawValue = event[attrName];
        // Skip empty, null, or undefined values
        if (rawValue === null || rawValue === undefined || rawValue === '' ||
            String(rawValue).trim() === '' || String(rawValue) === 'undefined' || String(rawValue) === 'null') {
          return;
        }

        const attrValue = String(rawValue);
        const key = `${attrName}:${attrValue}`;

        if (!seenAttributes.has(key)) {
          seenAttributes.add(key);

          if (!eventAttributeMap.has(key)) {
            eventAttributeMap.set(key, {
              name: attrName,
              value: attrValue,
              positiveCount: 0,
              negativeCount: 0,
              totalFrequency: 0,
            });
          }

          const attr = eventAttributeMap.get(key)!;
          attr.negativeCount++;
          attr.totalFrequency++;
        }
      });
    });
  });

  // Calculate statistics for each event attribute and filter by p-value
  const oddsRatios: Array<{
    eventAttribute: { attribute: string; value: string };
    oddsRatio: number;
  }> = [];

  eventAttributeMap.forEach((attr) => {
    // Calculate odds ratio
    // Odds Ratio = [P(Event|Positive) / P(¬Event|Positive)] / [P(Event|Negative) / P(¬Event|Negative)]
    // Which simplifies to: (a * d) / (b * c) where:
    // a = positive episodes with event
    // b = negative episodes with event
    // c = positive episodes without event
    // d = negative episodes without event

    const a = attr.positiveCount;
    const b = attr.negativeCount;
    const c = positiveEpisodes - a;
    const d = negativeEpisodes - b;

    let oddsRatio = 0;

    if (b === 0 && c === 0) {
      // Both denominators would be zero, odds ratio undefined
      oddsRatio = 1.0;
    } else if (b === 0) {
      // Would divide by zero in denominator, infinite odds ratio
      oddsRatio = Infinity;
    } else if (c === 0) {
      // Would multiply by infinity in numerator
      oddsRatio = Infinity;
    } else if (d === 0) {
      // Would result in 0 odds ratio
      oddsRatio = 0;
    } else {
      oddsRatio = (a * d) / (b * c);
    }

    // Calculate p-value using chi-square test
    const pValue = calculateChiSquarePValue(a, b, c, d);

    // Only include results where p-value < 0.05 (statistically significant)
    if (pValue < 0.05) {
      oddsRatios.push({
        eventAttribute: {
          attribute: attr.name,
          value: attr.value,
        },
        oddsRatio: isFinite(oddsRatio) ? oddsRatio : 999.99, // Cap at a large number for display
      });
    }
  });

  // Limit to top 20 risk factors and top 20 protective factors
  const riskFactors = oddsRatios
    .filter(item => item.oddsRatio > 1)
    .sort((a, b) => b.oddsRatio - a.oddsRatio)
    .slice(0, 20);

  const protectiveFactors = oddsRatios
    .filter(item => item.oddsRatio < 1)
    .sort((a, b) => a.oddsRatio - b.oddsRatio)
    .slice(0, 20);

  // Combine and sort by odds ratio (descending) to show risk factors first
  const limitedOddsRatios = [...riskFactors, ...protectiveFactors]
    .sort((a, b) => b.oddsRatio - a.oddsRatio);

  return {
    id: cellId,
    type: "edge-analysis",
    outcomeEvent,
    oddsRatios: limitedOddsRatios.map((item, index) => ({
      id: `${cellId}-number-${index}`,
      eventAttribute: item.eventAttribute,
      oddsRatio: item.oddsRatio,
    })),
  };
}
