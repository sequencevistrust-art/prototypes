/**
 * Citation grid types.
 * The citation grid is a pre-computed 2D array where each cell is a self-contained
 * Step[] representing an atomic unit of computational output with its full context
 * (filters, segmentation, analysis).
 *
 * Column layout per row:
 *   [0] = session count (from row header)
 *   [1] = average duration (from row header)
 *   [2+] = analysis cells (from original table cells)
 */

import { Step } from "./steps";

export interface CitationCell {
  id: string;
  steps: Step[];
}

export type CitationGrid = CitationCell[][];
