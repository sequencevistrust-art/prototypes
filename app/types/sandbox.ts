import {
  EventAttribute,
  RowAddOneByPatternOperation,
  RowAddRowsByPatternOperation,
  RowAddOneByRecordAttributeCategoricalOperation,
  RowAddOneByRecordAttributeNumericalOperation,
  RowAddRowsByRecordAttributeOperation,
  ColumnOperation,
  RowOperation,
  Operation,
  FilterOperation,
} from "./operations";

// ===== DATA STRUCTURES =====

/**
 * Represents a single event in a sequence
 * Guaranteed fields: eventId, sessionId, timestamp
 * Other fields are dynamic based on the CSV data
 */
export interface Event {
  eventId: number;
  sessionId: number;
  timestamp: string;
  [key: string]: string | number; // Dynamic attributes from CSV
}

/**
 * Represents a sequence of events for a single session
 */
export interface EventSequence {
  sessionId: number;
  events: Event[];
}

/**
 * Record attributes for a session (from record-attributes.csv)
 * Guaranteed fields: sessionId
 * Other fields are dynamic based on the CSV data
 */
export interface RecordAttributes {
  sessionId: number;
  [key: string]: string | number | boolean; // Dynamic attributes from CSV
}

// ===== ATTRIBUTE TYPES =====

export interface NumericalAttribute {
  type: "numerical";
  name: string;
  value?: { min: number; max: number };
}

export interface CategoricalAttribute {
  type: "categorical";
  name: string;
  value?: string;
}

export type Attribute = CategoricalAttribute | NumericalAttribute;

// ===== ROW HEADER TYPES =====

export interface PatternRowHeader {
  type: "pattern";
  operation: RowAddOneByPatternOperation | RowAddRowsByPatternOperation;
  pattern: EventAttribute[];
  appliedFilters: FilterOperation[];
  sessionCount: { id: string; value: number };
  eventCount: { id: string; value: number };
  duration: { id: string; value: number }; // Average duration in seconds between start and end events (0 if fewer than 2 events)
}

export interface RecordAttributeRowHeader {
  type: "record-attribute";
  operation:
    | RowAddOneByRecordAttributeCategoricalOperation
    | RowAddOneByRecordAttributeNumericalOperation
    | RowAddRowsByRecordAttributeOperation;
  recordAttribute: Attribute;
  appliedFilters: FilterOperation[];
  sessionCount: { id: string; value: number };
  eventCount: { id: string; value: number };
  duration: { id: string; value: number }; // Average duration in seconds between start and end events (0 if fewer than 2 events)
}

export type RowHeader =
  | PatternRowHeader
  | RecordAttributeRowHeader;

// ===== CELL TYPES =====

export interface PatternDistributionCell {
  id: string;
  type: "pattern-distribution";
  distribution: {
    id: string;
    pattern: EventAttribute[];
    percentage: number;
  }[];
}

export interface NumberCell {
  id: string;
  type: "number";
  value: number;
  name: string;
  aggregation: "average" | "sum" | "min" | "max" | "count-unique";
}

export interface CategoryDistributionCell {
  id: string;
  type: "category-distribution";
  name: string;
  distribution: {
    id: string;
    category: string;
    percentage: number;
  }[];
}

export interface FunnelCell {
  id: string;
  type: "funnel";
  funnel: {
    id: string;
    eventAttribute: Omit<EventAttribute, "negated">;
    percentage: number;
  }[];
  durations: { id: string; value: number }[]; // duration in seconds between consecutive funnel events (index i = duration between event i and event i+1)
  eventCounts: { id: string; value: number }[]; // event counts between consecutive funnel events (index i = events between event i and event i+1)
}

export interface EdgeAnalysisCell {
  id: string;
  type: "edge-analysis";
  outcomeEvent: Omit<EventAttribute, "negated">;
  oddsRatios: {
    id: string;
    eventAttribute: Omit<EventAttribute, "negated">;
    oddsRatio: number;
  }[];
}

export type Cell =
  | PatternDistributionCell
  | NumberCell
  | CategoryDistributionCell
  | FunnelCell
  | EdgeAnalysisCell;

// ===== TABLE TYPE =====

export interface TableRow {
  rowHeader: RowHeader;
  cells: Cell[];
}

export interface Table {
  header: ColumnOperation[];
  rows: TableRow[];
}

// ===== SANDBOX OPERATIONS WITH IDs =====

/**
 * Extended operation type that includes an ID for tracking
 */
export interface OperationWithId {
  id: string;
  operation: Operation;
}

export interface CreateSandboxRequest {
  type: "create-sandbox";
}

export interface CreateSandboxResponse {
  sandboxId: string;
}

export interface ClearSandboxRequest {
  type: "clear-sandbox";
  sandboxId: string;
}

export interface ClearSandboxResponse {
  success: boolean;
  table: Table;
  steps: OperationWithId[];
}

export interface AddOperationToSandboxRequest {
  type: "add-operation";
  sandboxId: string;
  operationId: string;
  operation: Operation;
}

export interface AddOperationToSandboxResponse {
  table: Table;
  steps: OperationWithId[];
}

export interface RemoveOperationFromSandboxRequest {
  type: "remove-operation";
  sandboxId: string;
  operationId: string;
}

export interface RemoveOperationFromSandboxResponse {
  table: Table;
  steps: OperationWithId[];
}

export interface UpdateOperationInSandboxRequest {
  type: "update-operation";
  sandboxId: string;
  operationId: string;
  newOperation: Operation;
}

export interface UpdateOperationInSandboxResponse {
  table: Table;
  steps: OperationWithId[];
}

export interface DeleteSandboxRequest {
  type: "delete-sandbox";
  sandboxId: string;
}

export interface DeleteSandboxResponse {
  success: boolean;
}

export interface RecreateSandboxRequest {
  type: "recreate-sandbox";
  steps: OperationWithId[];
}

export interface RecreateSandboxResponse {
  sandboxId: string;
  table: Table;
  steps: OperationWithId[];
}

export type SandboxOperation =
  | CreateSandboxRequest
  | ClearSandboxRequest
  | AddOperationToSandboxRequest
  | RemoveOperationFromSandboxRequest
  | UpdateOperationInSandboxRequest;

// ===== SANDBOX TYPE =====

/**
 * Represents a sandbox instance
 * - segments: list of sequence lists, each corresponding to a row in the table
 * - table: the computed table displayed in UI
 * - steps: history of operations applied to this sandbox
 */
export interface Sandbox {
  id: string;
  segments: EventSequence[][]; // Array of segment lists (one per row)
  table: Table;
  steps: OperationWithId[]; // Track operations with their IDs
}

// ===== PATTERN MATCHING TYPES =====

/**
 * Pattern match result
 */
export interface PatternMatch {
  sessionId: number;
  matchedEvents: Event[];
  startIndex: number;
  endIndex: number;
}

/**
 * Frequent pattern from pattern mining
 */
export interface FrequentPattern {
  pattern: EventAttribute[];
  support: number; // Number of sequences containing this pattern
  percentage: number; // Percentage of sequences containing this pattern
}
