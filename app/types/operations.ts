// Base event attribute interface (used in patterns)
export interface EventAttribute {
  attribute: string;
  value: string;
  negated: boolean;
}

// Event attribute with optional negated (for functions that accept both)
export type PatternItem = Omit<EventAttribute, "negated"> & { negated?: boolean };

// ===== FILTER OPERATIONS =====

export interface FilterRecordAttributeCategoricalOperation {
  type: "filter";
  subType: "record-attribute";
  recordAttribute: {
    name: string;
    type: "categorical";
    value: string;
  };
}

export interface FilterRecordAttributeNumericalOperation {
  type: "filter";
  subType: "record-attribute";
  recordAttribute: {
    name: string;
    type: "numerical";
    min: number;
    max: number;
  };
}

export type FilterOperation =
  | FilterRecordAttributeCategoricalOperation
  | FilterRecordAttributeNumericalOperation;

// ===== ROW OPERATIONS =====

// Filter by pattern with segmentation
// Returns only the segment of matched sequences (excluding boundary events)
// startIndex: null means "from beginning of sequence", endIndex: null means "to end of sequence"
export interface RowAddOneByPatternOperation {
  type: "row";
  subType: "add-one-row-by-pattern";
  pattern: EventAttribute[];
  segment: {
    startIndex: number | null;
    endIndex: number | null;
  };
}

export interface RowAddOneByRecordAttributeCategoricalOperation {
  type: "row";
  subType: "add-one-row-by-record-attribute";
  recordAttribute: {
    name: string;
    type: "categorical";
    value: string;
  };
}

export interface RowAddOneByRecordAttributeNumericalOperation {
  type: "row";
  subType: "add-one-row-by-record-attribute";
  recordAttribute: {
    name: string;
    type: "numerical";
    min: number;
    max: number;
  };
}

// Mine frequent patterns after applying filtering and segmentation
// eventAttribute: the event attribute to mine patterns on
// pattern: filtering rules (empty array = no filtering)
// segment: segmentation rules (both null = no segmentation, use entire sequence)
export interface RowAddRowsByPatternOperation {
  type: "row";
  subType: "add-rows-by-pattern";
  eventAttribute: string;
  pattern: EventAttribute[];
  segment: {
    startIndex: number | null;
    endIndex: number | null;
  };
}

export interface RowAddRowsByRecordAttributeOperation {
  type: "row";
  subType: "add-rows-by-record-attribute";
  recordAttribute: {
    name: string;
    type: "categorical";
  };
}

export type RowOperation =
  | RowAddOneByPatternOperation
  | RowAddOneByRecordAttributeCategoricalOperation
  | RowAddOneByRecordAttributeNumericalOperation
  | RowAddRowsByPatternOperation
  | RowAddRowsByRecordAttributeOperation;

// ===== COLUMN OPERATIONS =====

export interface ColumnNumericalOperation {
  type: "column";
  subType: "numerical";
  recordAttribute: {
    name: string;
    type: "numerical";
  };
  aggregation: "average" | "sum" | "min" | "max";
}

export interface ColumnCategoricalOperation {
  type: "column";
  subType: "categorical";
  recordAttribute: {
    name: string;
    type: "categorical";
  };
  aggregation: "distribution" | "count-unique";
}

// Mine patterns directly from sequences
export interface ColumnPatternAnalysisOperation {
  type: "column";
  subType: "pattern";
  analysis: "pattern";
  eventAttribute: string;
}

// Analyze event attribute distribution directly from sequences
export interface ColumnEventAttributeAnalysisOperation {
  type: "column";
  subType: "pattern";
  analysis: "event-attribute";
  eventAttribute: string;
}

export interface ColumnFunnelAnalysisOperation {
  type: "column";
  subType: "pattern";
  analysis: "funnel";
  pattern: Omit<EventAttribute, "negated">[];
}

export interface ColumnEdgeAnalysisOperation {
  type: "column";
  subType: "pattern";
  analysis: "edge";
  eventAttribute: Omit<EventAttribute, "negated">;
}

export type ColumnOperation =
  | ColumnNumericalOperation
  | ColumnCategoricalOperation
  | ColumnPatternAnalysisOperation
  | ColumnEventAttributeAnalysisOperation
  | ColumnFunnelAnalysisOperation
  | ColumnEdgeAnalysisOperation;

// ===== UNIFIED OPERATION TYPE =====

export type Operation = FilterOperation | RowOperation | ColumnOperation;
