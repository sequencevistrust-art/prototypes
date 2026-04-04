/**
 * Shared chat types used by both explore and explain apps.
 */

import { Table, OperationWithId } from "./sandbox";
import { Operation } from "./operations";
import { CitationGrid } from "./citation";
import { Citation } from "../utils/citations";
import { Step } from "./steps";

// Re-export Citation for convenience
export type { Citation };

// Explanation map: reference ID -> explanation steps
export type ExplanationMap = Record<string, Step[]>;

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
  // All citation grids from all tool calls — enables cross-tool-call references
  allCitationGrids?: Map<string, CitationGrid>;
  // For manually-added citations: LLM-generated data source explanation
  reason?: string;
}

/**
 * Result shape returned by tool calls that produce table data.
 */
export interface ToolCallResult {
  table: Table;
  steps: OperationWithId[];
  citationGrid?: CitationGrid;
}

/**
 * Tool call args — the known fields sent by sandbox tools.
 * Additional unknown fields may be present from other tools.
 */
export interface ToolCallArgs {
  operation?: Operation;
  oldOperation?: Operation;
  newOperation?: Operation;
  [key: string]: unknown;
}

/**
 * A tool call from the AI agent.
 */
export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: ToolCallArgs;
  result?: ToolCallResult;
}

/**
 * A part of a message — either text (with optional citations) or a tool call.
 */
export type MessagePart =
  | { type: "text"; content: string; citations?: Citation[] }
  | { type: "tool-call"; toolCall: ToolCall };

/**
 * A chat message.
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  // Optional cached explanation map: reference ID -> explanation steps
  explanationMap?: ExplanationMap;
}

// ===== Stream chunk types =====

export interface TextDeltaChunk {
  type: "text-delta";
  text: string;
}

export interface ToolCallChunk {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args?: ToolCallArgs;
  input?: ToolCallArgs;
  invalid?: boolean;
}

export interface ToolResultChunk {
  type: "tool-result";
  toolCallId: string;
  result?: ToolCallResult;
  output?: ToolCallResult;
}

export interface SandboxInfoChunk {
  type: "sandbox-info";
  sandboxId: string;
}

export interface StreamErrorChunk {
  type: "error" | "stream-error";
  error?: { message?: string } | string;
}

export interface ToolErrorChunk {
  type: "tool-error";
  [key: string]: unknown;
}

export type StreamChunk =
  | TextDeltaChunk
  | ToolCallChunk
  | ToolResultChunk
  | SandboxInfoChunk
  | StreamErrorChunk
  | ToolErrorChunk;
