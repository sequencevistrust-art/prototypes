import { useEffect, useRef } from "react";
import { useOperationsStore } from "../store/operations-store";
import { useSandboxStore } from "../store/sandbox-store";

/**
 * Hook to sync operations store with sandbox store
 * Watches for changes in operations and calls appropriate sandbox APIs
 */
export function useSandboxSync() {
  const operations = useOperationsStore((state) => state.operations);
  const skipSync = useOperationsStore((state) => state.skipSync);
  const { addOperation, removeOperation, updateOperation, clearSandbox } =
    useSandboxStore();

  // Track previous operations to detect changes
  const prevOperationsRef = useRef<typeof operations>([]);

  useEffect(() => {
    // Skip sync if flag is set (e.g., during recreate from steps)
    if (skipSync) {
      prevOperationsRef.current = operations;
      return;
    }

    const prevOperations = prevOperationsRef.current;
    const currentOperations = operations;

    // Detect what changed
    if (currentOperations.length === 0 && prevOperations.length > 0) {
      // All operations cleared
      clearSandbox();
    } else if (currentOperations.length > prevOperations.length) {
      // Operation added (single addition by user)
      const newOperation = currentOperations[currentOperations.length - 1];
      addOperation(newOperation.id, newOperation);
    } else if (currentOperations.length < prevOperations.length) {
      // Operation removed
      const removedOp = prevOperations.find(
        (op) => !currentOperations.some((curr) => curr.id === op.id)
      );
      if (removedOp) {
        removeOperation(removedOp.id);
      }
    } else {
      // Check for updates (same length but different content)
      for (let i = 0; i < currentOperations.length; i++) {
        const curr = currentOperations[i];
        const prev = prevOperations[i];

        if (curr.id === prev.id && JSON.stringify(curr) !== JSON.stringify(prev)) {
          // Operation updated
          updateOperation(curr.id, curr);
          break;
        }
      }
    }

    // Update ref
    prevOperationsRef.current = currentOperations;
  }, [operations, skipSync, addOperation, removeOperation, updateOperation, clearSandbox]);
}
