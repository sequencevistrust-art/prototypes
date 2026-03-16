import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Table, OperationWithId } from "../types/sandbox";
import { Operation } from "../types/operations";

interface SandboxState {
  // State
  sandboxId: string | null;
  table: Table | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createSandbox: () => Promise<void>;
  clearSandbox: () => Promise<void>;
  addOperation: (operationId: string, operation: Operation) => Promise<void>;
  removeOperation: (operationId: string) => Promise<void>;
  updateOperation: (operationId: string, newOperation: Operation) => Promise<void>;
  replaceSandboxFromSteps: (steps: OperationWithId[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSandboxStore = create<SandboxState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sandboxId: null,
      table: null,
      isLoading: false,
      error: null,

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Create a new sandbox
      createSandbox: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/sandbox/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            throw new Error("Failed to create sandbox");
          }

          const data = await response.json();
          set({
            sandboxId: data.sandboxId,
            table: {
              header: [],
              rows: [],
            },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      // Clear sandbox
      clearSandbox: async () => {
        const { sandboxId } = get();
        if (!sandboxId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/sandbox/clear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sandboxId }),
          });

          if (!response.ok) {
            if (response.status === 404) {
                 set({
                    sandboxId: null, // Reset ID so next op creates new one
                    table: {
                        header: [],
                        rows: [],
                    },
                    isLoading: false,
                 });
                 return;
            }
            throw new Error("Failed to clear sandbox");
          }

          set({
            table: {
              header: [],
              rows: [],
            },
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      // Add operation to sandbox
      addOperation: async (operationId, operation) => {
        let { sandboxId } = get();
        
        // If no sandbox ID, try to create one first
        if (!sandboxId) {
            // Need to wait for creation to complete
            await get().createSandbox();
            // Get the new ID
            sandboxId = get().sandboxId;
            
            if (!sandboxId) {
                 set({
                    error: "Failed to initialize sandbox before adding operation",
                    isLoading: false
                 });
                 return;
            }
        }

        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/sandbox/add-operation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sandboxId, operationId, operation }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // If sandbox not found (404), maybe it expired on server? Recreation logic might be needed
            if (response.status === 404 && errorData.error === "Sandbox not found") {
                console.warn("Sandbox not found on server, recreating...");
                // Clear local invalid ID
                set({ sandboxId: null });
                // Recursive call will see sandboxId is null and create a new one
                return get().addOperation(operationId, operation);
            }
            throw new Error(errorData.error || "Failed to add operation");
          }

          const data = await response.json();
          set({ table: data.table, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      // Remove operation from sandbox
      removeOperation: async (operationId) => {
        const { sandboxId } = get();
        if (!sandboxId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/sandbox/remove-operation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sandboxId, operationId }),
          });

          if (!response.ok) {
            throw new Error("Failed to remove operation");
          }

          const data = await response.json();
          set({ table: data.table, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      // Update operation in sandbox
      updateOperation: async (operationId, newOperation) => {
        const { sandboxId } = get();
        if (!sandboxId) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/sandbox/update-operation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sandboxId, operationId, newOperation }),
          });

          if (!response.ok) {
            throw new Error("Failed to update operation");
          }

          const data = await response.json();
          set({ table: data.table, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      // Replace current sandbox with a new one created from steps
      replaceSandboxFromSteps: async (steps) => {
        const { sandboxId: oldSandboxId } = get();

        set({ isLoading: true, error: null });
        try {
          // First, recreate sandbox with the given steps
          const recreateResponse = await fetch("/api/sandbox/recreate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ steps }),
          });

          if (!recreateResponse.ok) {
            throw new Error("Failed to recreate sandbox");
          }

          const recreateData = await recreateResponse.json();

          // Delete the old sandbox if it exists
          if (oldSandboxId) {
            await fetch("/api/sandbox/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sandboxId: oldSandboxId }),
            });
          }

          set({
            sandboxId: recreateData.sandboxId,
            table: recreateData.table,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "sandbox-store",
    }
  )
);
