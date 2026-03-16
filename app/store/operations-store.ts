import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Operation } from "../types/operations";

// Stored operation with id
export type StoredOperation = Operation & { id: string };

interface OperationsState {
  // State
  operations: StoredOperation[];
  skipSync: boolean; // Flag to skip useSandboxSync during bulk updates

  // Actions
  addOperation: (operation: Operation) => void;
  removeOperation: (id: string) => void;
  clearOperations: () => void;
  updateOperation: (id: string, operation: Operation) => void;
  replaceOperationsFromSteps: (steps: Array<{ id: string; operation: Operation }>) => void;

  // Selectors (convenience methods)
  getFilterOperations: () => StoredOperation[];
  getRowOperations: () => StoredOperation[];
  getColumnOperations: () => StoredOperation[];
}

// Helper to generate unique IDs
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useOperationsStore = create<OperationsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      operations: [],
      skipSync: false,

      // Add operation to the end of the list
      addOperation: (operation) => {
        const newOperation: StoredOperation = {
          ...operation,
          id: generateId(),
        };

        set((state) => ({
          operations: [...state.operations, newOperation],
        }));
      },

      // Remove operation by ID
      removeOperation: (id) => {
        set((state) => ({
          operations: state.operations.filter((op) => op.id !== id),
        }));
      },

      // Clear all operations
      clearOperations: () => {
        set({ operations: [] });
      },

      // Update operation (for future use)
      updateOperation: (id, operation) => {
        set((state) => ({
          operations: state.operations.map((op) =>
            op.id === id ? { ...operation, id } : op
          ),
        }));
      },

      // Replace all operations from steps
      replaceOperationsFromSteps: (steps) => {
        const newOperations: StoredOperation[] = steps.map((step) => ({
          ...step.operation,
          id: step.id,
        }));
        // Set skipSync flag to prevent useSandboxSync from re-adding operations
        set({ skipSync: true, operations: newOperations });
        // Reset flag after a short delay to allow effect to run
        setTimeout(() => set({ skipSync: false }), 0);
      },

      // Selector: Get all filter operations
      getFilterOperations: () => {
        return get().operations.filter((op) => op.type === "filter");
      },

      // Selector: Get all row operations
      getRowOperations: () => {
        return get().operations.filter((op) => op.type === "row");
      },

      // Selector: Get all column operations
      getColumnOperations: () => {
        return get().operations.filter((op) => op.type === "column");
      },
    }),
    {
      name: "operations-store",
    }
  )
);

// Optional: Export individual selectors for use with useShallow
export const selectFilterOperations = (state: OperationsState) =>
  state.operations.filter((op) => op.type === "filter");

export const selectRowOperations = (state: OperationsState) =>
  state.operations.filter((op) => op.type === "row");

export const selectColumnOperations = (state: OperationsState) =>
  state.operations.filter((op) => op.type === "column");
