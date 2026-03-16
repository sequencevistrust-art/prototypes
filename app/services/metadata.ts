import {
  getAllEventSequences,
  getRecordAttributesMap,
} from "../storage/dataStore";
import { EventSequence, Event, RecordAttributes } from "../types/sandbox";

// Known columns to exclude from metadata detection
const EXCLUDED_EVENT_COLUMNS = new Set(["eventId", "sessionId", "timestamp"]);
const EXCLUDED_RECORD_COLUMNS = new Set(["sessionId"]);

const SAMPLE_SIZE = 100;

interface CategoricalAttributeMetadata {
  name: string;
  type: "categorical";
  values: string[];
}

interface NumericalAttributeMetadata {
  name: string;
  type: "numerical";
  min: number;
  max: number;
}

export type AttributeMetadata = CategoricalAttributeMetadata | NumericalAttributeMetadata;

function getUniqueEventValues(sequences: EventSequence[], column: string): string[] {
  const values = new Set<string>();
  sequences.forEach((sequence) => {
    sequence.events.forEach((event: Event) => {
      const value = event[column];
      if (value !== undefined && value !== null && value !== "") {
        values.add(String(value));
      }
    });
  });
  return Array.from(values).sort();
}

function getEventMinMax(sequences: EventSequence[], column: string): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  sequences.forEach((sequence) => {
    sequence.events.forEach((event: Event) => {
      const value = event[column];
      if (typeof value === "number" && !isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
  });

  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
}

function getUniqueRecordValues(recordMap: Map<number, RecordAttributes>, column: string): string[] {
  const values = new Set<string>();
  recordMap.forEach((record: RecordAttributes) => {
    const value = record[column];
    if (value !== undefined && value !== null && value !== "") {
      values.add(String(value));
    }
  });
  return Array.from(values).sort();
}

function getRecordMinMax(recordMap: Map<number, RecordAttributes>, column: string): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  recordMap.forEach((record: RecordAttributes) => {
    const value = record[column];
    if (typeof value === "number" && !isNaN(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  });

  return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
}

export interface MetadataResult {
  eventAttributes: AttributeMetadata[];
  recordAttributes: AttributeMetadata[];
}

/**
 * Detect if a column name suggests it contains ID values
 */
function isIdColumnName(name: string): boolean {
  return (
    name === "id" ||
    name.endsWith("Id") || // camelCase: customerId, sessionId
    name.endsWith("_id")   // snake_case: customer_id, session_id
  );
}

// Threshold for high cardinality detection (unique values / sample size)
// If > 50% of sampled values are unique, it's likely a high-cardinality field
const HIGH_CARDINALITY_THRESHOLD = 0.5;

/**
 * Detect if a column has too many unique values (high cardinality)
 * Fields like name, email, etc. will have mostly unique values
 */
function isHighCardinalityColumn(values: unknown[]): boolean {
  const nonEmptyValues = values.filter(
    (v) => v !== undefined && v !== null && v !== ""
  );
  if (nonEmptyValues.length === 0) return false;

  const uniqueValues = new Set(nonEmptyValues.map(String));
  const ratio = uniqueValues.size / nonEmptyValues.length;

  return ratio > HIGH_CARDINALITY_THRESHOLD;
}

/**
 * Detect if a column name suggests it contains time/date values
 */
function isTimeColumnName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    lowerName.includes("time") ||
    lowerName.includes("date") ||
    lowerName.endsWith("at") // createdAt, updatedAt, etc.
  );
}

/**
 * Detect if a column contains time/date values
 * Returns true if values look like ISO timestamps or common date formats
 */
function isTimeColumnValues(values: unknown[]): boolean {
  const nonEmptyValues = values.filter(
    (v) => v !== undefined && v !== null && v !== ""
  );
  if (nonEmptyValues.length === 0) return false;

  // Check if most values match common date/time patterns
  const timePatterns = [
    /^\d{4}-\d{2}-\d{2}(T|\s)/, // ISO datetime: 2021-10-01T03:26:00 or 2021-10-01 03:26:00
    /^\d{4}-\d{2}-\d{2}$/, // ISO date only: 2021-10-01
    /^\d{2}\/\d{2}\/\d{4}/, // US date: 10/01/2021
    /^\d{2}-\d{2}-\d{4}/, // EU date: 01-10-2021
  ];

  const matchCount = nonEmptyValues.filter((v) => {
    if (typeof v !== "string") return false;
    return timePatterns.some((pattern) => pattern.test(v));
  }).length;

  // If >50% of non-empty values match a time pattern, consider it a time column
  return matchCount / nonEmptyValues.length > 0.5;
}

/**
 * Detect if a column is numerical by sampling values
 * Returns true if all non-empty sampled values are numbers
 */
function isNumericalColumn(values: unknown[]): boolean {
  const nonEmptyValues = values.filter(
    (v) => v !== undefined && v !== null && v !== ""
  );
  if (nonEmptyValues.length === 0) return false;

  return nonEmptyValues.every((v) => typeof v === "number" && !isNaN(v));
}

/**
 * Get all column names from event data (excluding known columns)
 */
function getEventColumnNames(sequences: EventSequence[]): string[] {
  const columns = new Set<string>();
  const sampled = sequences.slice(0, SAMPLE_SIZE);

  sampled.forEach((sequence) => {
    sequence.events.forEach((event: Event) => {
      Object.keys(event).forEach((key) => {
        if (!EXCLUDED_EVENT_COLUMNS.has(key)) {
          columns.add(key);
        }
      });
    });
  });

  return Array.from(columns);
}

/**
 * Get all column names from record data (excluding known columns)
 */
function getRecordColumnNames(recordMap: Map<number, RecordAttributes>): string[] {
  const columns = new Set<string>();
  let count = 0;

  for (const record of recordMap.values()) {
    if (count >= SAMPLE_SIZE) break;
    Object.keys(record).forEach((key) => {
      if (!EXCLUDED_RECORD_COLUMNS.has(key)) {
        columns.add(key);
      }
    });
    count++;
  }

  return Array.from(columns);
}

/**
 * Sample values from event data for a specific column
 */
function sampleEventValues(sequences: EventSequence[], column: string): unknown[] {
  const values: unknown[] = [];
  const sampled = sequences.slice(0, SAMPLE_SIZE);

  sampled.forEach((sequence) => {
    sequence.events.forEach((event: Event) => {
      if (column in event) {
        values.push(event[column]);
      }
    });
  });

  return values;
}

/**
 * Sample values from record data for a specific column
 */
function sampleRecordValues(recordMap: Map<number, RecordAttributes>, column: string): unknown[] {
  const values: unknown[] = [];
  let count = 0;

  for (const record of recordMap.values()) {
    if (count >= SAMPLE_SIZE) break;
    if (column in record) {
      values.push(record[column]);
    }
    count++;
  }

  return values;
}

/**
 * Get metadata about the dataset
 * Used by both /api/metadata route and getMetadata tool
 */
export async function getMetadata(): Promise<MetadataResult> {
  const sequences = await getAllEventSequences();
  const recordMap = await getRecordAttributesMap();

  // Auto-detect event attributes
  const eventColumnNames = getEventColumnNames(sequences);
  const eventAttributes: AttributeMetadata[] = [];

  for (const name of eventColumnNames) {
    const sampledValues = sampleEventValues(sequences, name);

    // Skip ID and time columns
    if (isIdColumnName(name) || isTimeColumnName(name) || isTimeColumnValues(sampledValues)) {
      continue;
    }

    if (isNumericalColumn(sampledValues)) {
      const { min, max } = getEventMinMax(sequences, name);
      eventAttributes.push({
        name,
        type: "numerical" as const,
        min,
        max,
      });
    } else {
      // Include high cardinality columns with empty values (name only, no enumeration)
      if (isHighCardinalityColumn(sampledValues)) {
        eventAttributes.push({
          name,
          type: "categorical" as const,
          values: [],
        });
        continue;
      }
      eventAttributes.push({
        name,
        type: "categorical" as const,
        values: getUniqueEventValues(sequences, name),
      });
    }
  }

  // Auto-detect record attributes
  const recordColumnNames = getRecordColumnNames(recordMap);
  const recordAttributes: AttributeMetadata[] = [];

  for (const name of recordColumnNames) {
    const sampledValues = sampleRecordValues(recordMap, name);

    // Skip ID and time columns
    if (isIdColumnName(name) || isTimeColumnName(name) || isTimeColumnValues(sampledValues)) {
      continue;
    }

    if (isNumericalColumn(sampledValues)) {
      const { min, max } = getRecordMinMax(recordMap, name);
      recordAttributes.push({
        name,
        type: "numerical" as const,
        min,
        max,
      });
    } else {
      // Include high cardinality columns with empty values (name only, no enumeration)
      if (isHighCardinalityColumn(sampledValues)) {
        recordAttributes.push({
          name,
          type: "categorical" as const,
          values: [],
        });
        continue;
      }
      recordAttributes.push({
        name,
        type: "categorical" as const,
        values: getUniqueRecordValues(recordMap, name),
      });
    }
  }

  return {
    eventAttributes,
    recordAttributes,
  };
}
