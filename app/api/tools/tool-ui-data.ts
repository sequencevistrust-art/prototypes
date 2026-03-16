import { Table } from "../../types/sandbox";

/**
 * Side-channel store for UI-only data that should NOT be sent to the model.
 *
 * Tools store the transformed table here (keyed by toolCallId) so the model
 * only sees the citationGrid. The stream handler in route.ts reads from this
 * map to enrich tool-result chunks before sending them to the frontend.
 *
 * Entries are deleted after being read to prevent memory leaks.
 */
export const toolUiData = new Map<string, { table: Table }>();
