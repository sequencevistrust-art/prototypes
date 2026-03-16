import { OperationWithId } from "../types/sandbox";
import {
  FilterOperation,
  RowOperation,
  ColumnOperation,
  Operation,
} from "../types/operations";

/**
 * Converts cumulative steps into the current state of operations.
 *
 * Steps can include:
 * - Adding an operation (implicit in OperationWithId)
 * - Removing an operation (tracked by absence in final state)
 * - Updating an operation (latest version is used)
 *
 * This function processes the steps chronologically and returns only
 * the operations that are currently active (not removed).
 */
export interface CurrentOperations {
  filterOperations: FilterOperation[];
  rowOperations: RowOperation[];
  columnOperations: ColumnOperation[];
}

export function stepsToOperations(steps: OperationWithId[]): CurrentOperations {
  // Create a map to track the current state of each operation
  // Key: operation ID, Value: operation or null (if removed)
  const operationsMap = new Map<string, Operation | null>();

  // Process steps in order
  for (const step of steps) {
    operationsMap.set(step.id, step.operation);
  }

  // Extract active operations (not null) and group by type
  const filterOperations: FilterOperation[] = [];
  const rowOperations: RowOperation[] = [];
  const columnOperations: ColumnOperation[] = [];

  for (const [id, operation] of operationsMap.entries()) {
    if (operation === null) {
      // Operation was removed, skip it
      continue;
    }

    if (operation.type === "filter") {
      filterOperations.push(operation as FilterOperation);
    } else if (operation.type === "row") {
      rowOperations.push(operation as RowOperation);
    } else if (operation.type === "column") {
      columnOperations.push(operation as ColumnOperation);
    }
  }

  return {
    filterOperations,
    rowOperations,
    columnOperations,
  };
}

/**
 * Helper function to remove an operation from steps.
 * This is used internally by sandbox operations.
 */
export function removeOperationFromSteps(
  steps: OperationWithId[],
  operationId: string
): OperationWithId[] {
  return steps.filter((step) => step.id !== operationId);
}

/**
 * Helper function to update an operation in steps.
 * This is used internally by sandbox operations.
 */
export function updateOperationInSteps(
  steps: OperationWithId[],
  operationId: string,
  newOperation: Operation
): OperationWithId[] {
  return steps.map((step) =>
    step.id === operationId ? { ...step, operation: newOperation } : step
  );
}
