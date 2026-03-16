import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Table, OperationWithId } from "../types/sandbox";
import { FilterOperation, RowOperation, ColumnOperation } from "../types/operations";

interface PreviewState {
  table: Table;
  steps: OperationWithId[];
  filterOperations: FilterOperation[];
  rowOperations: RowOperation[];
  columnOperations: ColumnOperation[];
  highlightCellIds?: string[]; // Optional cell IDs to highlight (can include -number-N suffix for specific numbers)
  highlightCountIds?: string[]; // Optional row header count IDs to highlight (format: xxx-row-header-N-count)
  highlightDurationIds?: string[]; // Optional row header duration IDs to highlight (format: xxx-row-header-N-duration)
}

interface ExpandedChip {
  messageId: string;
  partIdx: number;
}

interface UiState {
  debugMode: boolean;
  toggleDebugMode: () => void;
  chatDebugMode: boolean;
  toggleChatDebugMode: () => void;
  drilldownRowIndex: number | null;
  setDrilldownRowIndex: (index: number | null) => void;

  // Preview mode state
  previewMode: boolean;
  previewData: PreviewState | null;
  enterPreviewMode: (data: PreviewState) => void;
  exitPreviewMode: () => void;

  // Chat citation/chip state (coupled with preview mode)
  expandedChip: ExpandedChip | null;
  setExpandedChip: (chip: ExpandedChip | null) => void;
  activeCitationReference: string | null;
  setActiveCitationReference: (reference: string | null) => void;

  // Fact-check error IDs (for highlighting errors in explanation popups)
  factCheckErrorIds: Set<string>;
  addFactCheckErrorIds: (ids: string[]) => void;
  clearFactCheckErrorIds: () => void;

  // Picking mode state
  pickedId: string | null;
  pickedText: string | null;
  pickingMenuPosition: { x: number; y: number } | null;
  startExplanationRequest: boolean;
  explanationIntent: string | null; 
  pendingQuote: string | null; 

  setPickedId: (id: string | null) => void;
  setPickedText: (text: string | null) => void;
  setPickingMenuPosition: (pos: { x: number; y: number } | null) => void;
  triggerExplanation: (intent?: string) => void;
  resetExplanationRequest: () => void;
  setPendingQuote: (quote: string | null) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      debugMode: false,
      toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
      chatDebugMode: false,
      toggleChatDebugMode: () => set((state) => ({ chatDebugMode: !state.chatDebugMode })),
      drilldownRowIndex: null,
      setDrilldownRowIndex: (index) => set({ drilldownRowIndex: index }),

      // Picking mode
      pickedId: null,
      pickedText: null,
      pickingMenuPosition: null,
      startExplanationRequest: false,
      explanationIntent: null,
      pendingQuote: null,

      setPickedId: (id) => set({ pickedId: id, pickedText: null }),
      setPickedText: (text) => set({ pickedText: text, pickedId: null }),
      setPickingMenuPosition: (pos) => set({ pickingMenuPosition: pos }),
      triggerExplanation: (intent) => set({ startExplanationRequest: true, explanationIntent: intent || null, pickingMenuPosition: null }),
      resetExplanationRequest: () => set({ startExplanationRequest: false, explanationIntent: null }),
      setPendingQuote: (quote) => set({ pendingQuote: quote }),

      // Preview mode
      previewMode: false,
      previewData: null,
      enterPreviewMode: (data) => set({ previewMode: true, previewData: data }),
      exitPreviewMode: () => set({
        previewMode: false,
        previewData: null,
        expandedChip: null,
        activeCitationReference: null,
      }),

      // Chat citation/chip state
      expandedChip: null,
      setExpandedChip: (chip) => set({ expandedChip: chip }),
      activeCitationReference: null,
      setActiveCitationReference: (reference) => set({ activeCitationReference: reference }),
    }),
    {
      name: "ui-store",
    }
  )
);
