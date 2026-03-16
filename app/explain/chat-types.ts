import { Table, OperationWithId } from "../types/sandbox";
import { Step } from "./steps";
import { CitationGrid } from "../types/citation";

// Re-export shared types for convenience
export type {
  Citation,
  ToolCall,
  ToolCallResult,
  ToolCallArgs,
  MessagePart,
  StreamChunk,
  TextDeltaChunk,
  ToolCallChunk,
  ToolResultChunk,
  SandboxInfoChunk,
  StreamErrorChunk,
  ToolErrorChunk,
} from "../types/chat";

// Explanation map: reference ID -> explanation steps
export type ExplanationMap = Record<string, Step[]>;

/**
 * Explain app's Message extends the base with cached explanation data.
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  parts: import("../types/chat").MessagePart[];
  // Cached explanation map: reference ID -> explanation steps
  explanationMap?: ExplanationMap;
}

// Data passed to parent when citation is hovered
export interface CitationHoverData {
  toolCallId: string;
  ids: string[];
  reference: string; // The full reference string to parse operators
  // toolCallResult is absent for manually-added citations (user highlight flow)
  toolCallResult?: {
    table: Table;
    steps: OperationWithId[];
    citationGrid?: CitationGrid;
  };
  highlightedText: string;
  // Cached explanation steps with stable IDs
  explanationSteps?: Step[];
  // For manually-added citations: LLM-generated data source explanation
  reason?: string;
}
