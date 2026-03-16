import { EventSequence, Event } from "../types/sandbox";
import { EventAttribute, PatternItem } from "../types/operations";
import { getRecordAttributes } from "../storage/dataStore";

/**
 * Check if an event matches a pattern element
 */
function eventMatchesPatternElement(
  event: Event,
  patternElement: PatternItem
): boolean {
  const eventValue = event[patternElement.attribute];
  const matches = String(eventValue) === patternElement.value;
  return patternElement.negated ? !matches : matches;
}

/**
 * Check if a sequence matches a pattern
 * Pattern matching is sequential: events must occur in order
 * Negated patterns are constraints: they specify values that should NOT appear
 * between the previous match and the next positive match
 */
function sequenceMatchesPattern(
  sequence: EventSequence,
  pattern: PatternItem[]
): boolean {
  if (pattern.length === 0) return true;
  if (sequence.events.length === 0) return false;

  let patternIndex = 0;
  let eventIndex = 0;
  let lastMatchIndex = -1;
  const negatedConstraints: PatternItem[] = [];

  while (eventIndex < sequence.events.length && patternIndex < pattern.length) {
    const event = sequence.events[eventIndex];
    const patternElement = pattern[patternIndex];

    if (patternElement.negated) {
      // Collect negated constraints to check later
      negatedConstraints.push(patternElement);
      patternIndex++;
    } else {
      // Positive pattern - try to match
      if (eventMatchesPatternElement(event, patternElement)) {
        // Before accepting this match, verify no negated constraints were violated
        // Check all events from the last match position to current position (exclusive)
        if (negatedConstraints.length > 0) {
          const rangeStart = lastMatchIndex + 1;
          const rangeEnd = eventIndex;

          for (let i = rangeStart; i < rangeEnd; i++) {
            const intermediateEvent = sequence.events[i];
            for (const constraint of negatedConstraints) {
              const eventValue = intermediateEvent[constraint.attribute];
              if (eventValue !== undefined && String(eventValue) === constraint.value) {
                // Found a violated constraint
                return false;
              }
            }
          }
          negatedConstraints.length = 0; // Clear constraints after checking
        }

        lastMatchIndex = eventIndex;
        patternIndex++;
        eventIndex++;
      } else {
        eventIndex++;
      }
    }
  }

  // If pattern matched but there are unchecked negated constraints at the end,
  // verify they aren't violated in the remaining events after the last match
  if (patternIndex === pattern.length && negatedConstraints.length > 0) {
    for (let i = lastMatchIndex + 1; i < sequence.events.length; i++) {
      const event = sequence.events[i];
      for (const constraint of negatedConstraints) {
        const eventValue = event[constraint.attribute];
        if (eventValue !== undefined && String(eventValue) === constraint.value) {
          // Found a violated constraint in remaining events
          return false;
        }
      }
    }
  }

  return patternIndex === pattern.length; // All pattern elements matched
}

/**
 * Filter sequences by pattern
 * Returns only sequences that match the given pattern
 */
export function filterByPattern(
  sequences: EventSequence[],
  pattern: PatternItem[]
): EventSequence[] {
  return sequences.filter((seq) => sequenceMatchesPattern(seq, pattern));
}

/**
 * Filter sequences by categorical record attribute
 */
export async function filterByRecordAttributeCategorical(
  sequences: EventSequence[],
  attributeName: string,
  attributeValue: string
): Promise<EventSequence[]> {
  const filtered: EventSequence[] = [];

  for (const seq of sequences) {
    const recordAttr = await getRecordAttributes(seq.sessionId);
    // Convert to string for comparison since attribute values from the UI are always strings
    // This handles cases where the actual data has boolean/number values (e.g., converted: true)
    if (recordAttr && String(recordAttr[attributeName]) === attributeValue) {
      filtered.push(seq);
    }
  }

  return filtered;
}

/**
 * Filter sequences by numerical record attribute
 */
export async function filterByRecordAttributeNumerical(
  sequences: EventSequence[],
  attributeName: string,
  min: number,
  max: number
): Promise<EventSequence[]> {
  const filtered: EventSequence[] = [];

  for (const seq of sequences) {
    const recordAttr = await getRecordAttributes(seq.sessionId);
    if (recordAttr) {
      const value = recordAttr[attributeName];
      if (typeof value === "number" && value >= min && value <= max) {
        filtered.push(seq);
      }
    }
  }

  return filtered;
}

/**
 * Convert a pattern index to a match position index.
 * Pattern indices include negated elements, but matchPositions only has positive elements.
 * For pattern [A, NOT B, C], pattern index 2 (C) maps to match position index 1.
 */
function patternIndexToMatchIndex(pattern: PatternItem[], patternIndex: number): number {
  let matchIndex = 0;
  for (let i = 0; i < patternIndex; i++) {
    if (!pattern[i].negated) {
      matchIndex++;
    }
  }
  return matchIndex;
}

/**
 * Filter and segment sequences by pattern
 * Returns matched sequences with only the segment of events BETWEEN the specified indices
 * (excludes the start and end boundary events themselves)
 *
 * Supports flexible boundaries:
 * - startIndex: null means "from beginning of sequence"
 * - endIndex: null means "to end of sequence"
 * - Both null: returns entire sequence (no segmentation, but still filters by pattern)
 *
 * Note: startIndex and endIndex are pattern indices (including negated elements),
 * which get converted to match position indices internally.
 */
export function filterAndSegmentByPattern(
  sequences: EventSequence[],
  pattern: PatternItem[],
  startIndex: number | null,
  endIndex: number | null
): EventSequence[] {
  const segmented: EventSequence[] = [];

  // Convert pattern indices to match position indices
  const startMatchIndex = startIndex !== null ? patternIndexToMatchIndex(pattern, startIndex) : null;
  const endMatchIndex = endIndex !== null ? patternIndexToMatchIndex(pattern, endIndex) : null;

  // Special case: empty pattern with no segmentation = return all sequences unchanged
  if (pattern.length === 0 && startMatchIndex === null && endMatchIndex === null) {
    return sequences;
  }

  for (const seq of sequences) {
    // Find pattern match positions using the updated algorithm
    const matchPositions = getPatternMatchPositions(seq, pattern);

    // If pattern matched, extract segment
    // Empty pattern returns [] which always matches, non-empty pattern returns positions or null
    if (matchPositions && (pattern.length === 0 || matchPositions.length > 0)) {
      let sliceStart: number;
      let sliceEnd: number;

      if (startMatchIndex === null && endMatchIndex === null) {
        // No segmentation - return entire sequence
        sliceStart = 0;
        sliceEnd = seq.events.length;
      } else if (startMatchIndex === null) {
        // Segment from beginning to end boundary (exclusive)
        const segmentEnd = matchPositions[endMatchIndex!];
        if (segmentEnd === undefined) continue;
        sliceStart = 0;
        sliceEnd = segmentEnd; // Exclude the end boundary event
      } else if (endMatchIndex === null) {
        // Segment from start boundary (exclusive) to end of sequence
        const segmentStart = matchPositions[startMatchIndex];
        if (segmentStart === undefined) continue;
        sliceStart = segmentStart + 1; // Exclude the start boundary event
        sliceEnd = seq.events.length;
      } else {
        // Both specified - segment between them (excluding both boundaries)
        const segmentStart = matchPositions[startMatchIndex];
        const segmentEnd = matchPositions[endMatchIndex];
        if (segmentStart === undefined || segmentEnd === undefined) continue;
        sliceStart = segmentStart + 1;
        sliceEnd = segmentEnd;
      }

      const segmentedEvents = seq.events.slice(sliceStart, sliceEnd);

      segmented.push({
        sessionId: seq.sessionId,
        events: segmentedEvents,
      });
    }
  }

  return segmented;
}

/**
 * Get match positions for pattern in a sequence
 * Returns the indices where POSITIVE pattern elements matched, or null if no match
 * Negated elements are constraints, not matches, so they don't have positions
 */
export function getPatternMatchPositions(
  sequence: EventSequence,
  pattern: PatternItem[]
): number[] | null {
  if (pattern.length === 0) return [];

  let patternIndex = 0;
  let eventIndex = 0;
  let lastMatchIndex = -1;
  const matchPositions: number[] = [];
  const negatedConstraints: PatternItem[] = [];

  while (eventIndex < sequence.events.length && patternIndex < pattern.length) {
    const event = sequence.events[eventIndex];
    const patternElement = pattern[patternIndex];

    if (patternElement.negated) {
      // Collect negated constraints to check later
      negatedConstraints.push(patternElement);
      patternIndex++;
    } else {
      // Positive pattern - try to match
      if (eventMatchesPatternElement(event, patternElement)) {
        // Before accepting this match, verify no negated constraints were violated
        if (negatedConstraints.length > 0) {
          const rangeStart = lastMatchIndex + 1;
          const rangeEnd = eventIndex;

          for (let i = rangeStart; i < rangeEnd; i++) {
            const intermediateEvent = sequence.events[i];
            for (const constraint of negatedConstraints) {
              const eventValue = intermediateEvent[constraint.attribute];
              if (eventValue !== undefined && String(eventValue) === constraint.value) {
                // Found a violated constraint
                return null;
              }
            }
          }
          negatedConstraints.length = 0; // Clear constraints after checking
        }

        matchPositions.push(eventIndex);
        lastMatchIndex = eventIndex;
        patternIndex++;
        eventIndex++;
      } else {
        eventIndex++;
      }
    }
  }

  // If pattern matched but there are unchecked negated constraints at the end,
  // verify they aren't violated in the remaining events after the last match
  if (patternIndex === pattern.length && negatedConstraints.length > 0) {
    for (let i = lastMatchIndex + 1; i < sequence.events.length; i++) {
      const event = sequence.events[i];
      for (const constraint of negatedConstraints) {
        const eventValue = event[constraint.attribute];
        if (eventValue !== undefined && String(eventValue) === constraint.value) {
          // Found a violated constraint in remaining events
          return null;
        }
      }
    }
  }

  return patternIndex === pattern.length ? matchPositions : null;
}
