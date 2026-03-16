import { getSandbox, updateSandbox } from "../storage/sandboxStore";
import { withSandboxLock } from "../storage/sandboxLockManager";
import { getRecordAttributes } from "../storage/dataStore";
import {
  Sandbox,
  Table,
  OperationWithId,
  EventSequence,
  RecordAttributes,
  AddOperationToSandboxResponse,
  RemoveOperationFromSandboxResponse,
  UpdateOperationInSandboxResponse,
  ClearSandboxResponse,
} from "../types/sandbox";
import {
  FilterOperation,
  RowOperation,
  ColumnOperation,
  Operation,
} from "../types/operations";

export interface SegmentWithAttributes {
  sequence: EventSequence;
  recordAttribute: RecordAttributes;
}
import { applyOperation } from "../utils/applyOperation";
import {
  regenerateTable,
  getColumnIndexForOperation,
  generateRowCells,
  recalculateSegments,
} from "../utils/sandboxOperations";
import {
  removeOperationFromSteps,
  updateOperationInSteps,
} from "../utils/stepsToOperations";

/**
 * Add an operation to a sandbox
 */
export async function addOperationToSandbox(
  sandboxId: string,
  operationId: string,
  operation: Operation
): Promise<AddOperationToSandboxResponse> {
  const updatedSandbox = await withSandboxLock(sandboxId, async () => {
    const sandbox = getSandbox(sandboxId);

    if (!sandbox) {
      throw new Error("Sandbox not found");
    }

    const operationWithId: OperationWithId = {
      id: operationId,
      operation,
    };

    const updatedSteps = [...sandbox.steps, operationWithId];
    let modifiedSandbox = {
      ...sandbox,
      steps: updatedSteps,
    };

    modifiedSandbox = await applyOperation(modifiedSandbox, operation);
    updateSandbox(sandboxId, modifiedSandbox);

    console.log(
      `Added operation ${operationId} (${operation.type}:${operation.subType}) to sandbox ${sandboxId}`
    );

    return modifiedSandbox;
  });

  return {
    table: updatedSandbox.table,
    steps: updatedSandbox.steps,
  };
}

/**
 * Remove an operation from a sandbox
 */
export async function removeOperationFromSandbox(
  sandboxId: string,
  operationId: string
): Promise<RemoveOperationFromSandboxResponse> {
  const updatedSandbox = await withSandboxLock(sandboxId, async () => {
    const sandbox = getSandbox(sandboxId);

    if (!sandbox) {
      throw new Error("Sandbox not found");
    }

    const operationToRemove = sandbox.steps.find(
      (step) => step.id === operationId
    );

    if (!operationToRemove) {
      throw new Error("Operation not found in sandbox");
    }

    let modifiedSandbox: Sandbox;

    if (operationToRemove.operation.type === "filter") {
      modifiedSandbox = await handleRemoveFilterOperation(sandbox, operationId);
    } else if (operationToRemove.operation.type === "row") {
      modifiedSandbox = await handleRemoveRowOperation(sandbox, operationId);
    } else if (operationToRemove.operation.type === "column") {
      modifiedSandbox = await handleRemoveColumnOperation(sandbox, operationId);
    } else {
      throw new Error("Unknown operation type");
    }

    updateSandbox(sandboxId, modifiedSandbox);

    console.log(
      `Removed operation ${operationId} (${operationToRemove.operation.type}:${operationToRemove.operation.subType}) from sandbox ${sandboxId}`
    );

    return modifiedSandbox;
  });

  return {
    table: updatedSandbox.table,
    steps: updatedSandbox.steps,
  };
}

/**
 * Update an operation in a sandbox
 */
export async function updateOperationInSandbox(
  sandboxId: string,
  operationId: string,
  newOperation: Operation
): Promise<UpdateOperationInSandboxResponse> {
  const updatedSandbox = await withSandboxLock(sandboxId, async () => {
    const sandbox = getSandbox(sandboxId);

    if (!sandbox) {
      throw new Error("Sandbox not found");
    }

    const operationToUpdate = sandbox.steps.find(
      (step) => step.id === operationId
    );

    if (!operationToUpdate) {
      throw new Error("Operation not found in sandbox");
    }

    let modifiedSandbox: Sandbox;

    if (newOperation.type === "filter") {
      modifiedSandbox = await handleUpdateFilterOperation(
        sandbox,
        operationId,
        newOperation as FilterOperation
      );
    } else if (newOperation.type === "row") {
      modifiedSandbox = await handleUpdateRowOperation(
        sandbox,
        operationId,
        newOperation as RowOperation
      );
    } else if (newOperation.type === "column") {
      modifiedSandbox = await handleUpdateColumnOperation(
        sandbox,
        operationId,
        newOperation as ColumnOperation
      );
    } else {
      throw new Error("Unknown operation type");
    }

    updateSandbox(sandboxId, modifiedSandbox);

    console.log(
      `Updated operation ${operationId} to (${newOperation.type}:${newOperation.subType}) in sandbox ${sandboxId}`
    );

    return modifiedSandbox;
  });

  return {
    table: updatedSandbox.table,
    steps: updatedSandbox.steps,
  };
}

/**
 * Clear a sandbox
 */
export async function clearSandbox(
  sandboxId: string
): Promise<ClearSandboxResponse> {
  const clearedTable = await withSandboxLock(sandboxId, async () => {
    const sandbox = getSandbox(sandboxId);

    if (!sandbox) {
      throw new Error("Sandbox not found");
    }

    const emptyTable: Table = {
      header: [],
      rows: [],
    };

    const clearedSandbox = {
      ...sandbox,
      segments: [],
      table: emptyTable,
      steps: [],
    };

    updateSandbox(sandboxId, clearedSandbox);

    console.log(`Cleared sandbox ${sandboxId}`);

    return emptyTable;
  });

  return {
    success: true,
    table: clearedTable,
    steps: [],
  };
}

/**
 * Get paginated segments from a sandbox row
 */
export async function getPaginatedSegments(
  sandboxId: string,
  rowIndex: number,
  offset: number,
  size: number
): Promise<{
  segments: SegmentWithAttributes[];
  totalCount: number;
  offset: number;
  size: number;
  returnedCount: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}> {
  const sandbox = getSandbox(sandboxId);

  if (!sandbox) {
    throw new Error("Sandbox not found");
  }

  if (rowIndex >= sandbox.segments.length) {
    throw new Error(
      `Row index ${rowIndex} out of bounds. Sandbox has ${sandbox.segments.length} rows.`
    );
  }

  const segmentList = sandbox.segments[rowIndex];
  const totalCount = segmentList.length;
  const startIndex = offset;
  const endIndex = Math.min(offset + size, totalCount);

  const paginatedSequences = segmentList.slice(startIndex, endIndex);

  const segmentsWithAttributes = await Promise.all(
    paginatedSequences.map(async (sequence) => {
      const recordAttribute = await getRecordAttributes(sequence.sessionId);
      return {
        sequence,
        recordAttribute: recordAttribute || { sessionId: sequence.sessionId },
      };
    })
  );

  const hasMore = endIndex < totalCount;
  const currentPage = Math.floor(offset / size);
  const totalPages = Math.ceil(totalCount / size);

  console.log(
    `Retrieved ${segmentsWithAttributes.length} segments (offset: ${offset}, size: ${size}) from row ${rowIndex} in sandbox ${sandboxId}`
  );

  return {
    segments: segmentsWithAttributes,
    totalCount,
    offset,
    size,
    returnedCount: segmentsWithAttributes.length,
    hasMore,
    currentPage,
    totalPages,
  };
}

/**
 * Get sampled segments from a sandbox row
 */
export async function getSampledSegments(
  sandboxId: string,
  rowIndex: number,
  sampleSize: number
): Promise<{
  segments: SegmentWithAttributes[];
  totalCount: number;
  sampledCount: number;
}> {
  const sandbox = getSandbox(sandboxId);

  if (!sandbox) {
    throw new Error("Sandbox not found");
  }

  if (rowIndex >= sandbox.segments.length) {
    throw new Error(
      `Row index ${rowIndex} out of bounds. Sandbox has ${sandbox.segments.length} rows.`
    );
  }

  const segmentList = sandbox.segments[rowIndex];
  const sampledSequences = randomSample(segmentList, sampleSize);

  const segmentsWithAttributes = await Promise.all(
    sampledSequences.map(async (sequence) => {
      const recordAttribute = await getRecordAttributes(sequence.sessionId);
      return {
        sequence,
        recordAttribute: recordAttribute || { sessionId: sequence.sessionId },
      };
    })
  );

  console.log(
    `Sampled ${segmentsWithAttributes.length} segments from row ${rowIndex} in sandbox ${sandboxId}`
  );

  return {
    segments: segmentsWithAttributes,
    totalCount: segmentList.length,
    sampledCount: segmentsWithAttributes.length,
  };
}

// Helper functions for remove operations
async function handleRemoveFilterOperation(
  sandbox: Sandbox,
  operationId: string
): Promise<Sandbox> {
  const updatedSteps = removeOperationFromSteps(sandbox.steps, operationId);
  const { segments, rowHeaders } = await recalculateSegments(updatedSteps);

  const updatedSandbox = {
    ...sandbox,
    steps: updatedSteps,
    segments: segments,
  };

  updatedSandbox.table = await regenerateTable(updatedSandbox, rowHeaders);

  return updatedSandbox;
}

async function handleRemoveRowOperation(
  sandbox: Sandbox,
  operationId: string
): Promise<Sandbox> {
  const updatedSteps = removeOperationFromSteps(sandbox.steps, operationId);
  const { segments, rowHeaders } = await recalculateSegments(updatedSteps);

  const updatedSandbox = {
    ...sandbox,
    steps: updatedSteps,
    segments: segments,
  };

  updatedSandbox.table = await regenerateTable(updatedSandbox, rowHeaders);

  return updatedSandbox;
}

async function handleRemoveColumnOperation(
  sandbox: Sandbox,
  operationId: string
): Promise<Sandbox> {
  const updatedSteps = removeOperationFromSteps(sandbox.steps, operationId);
  const columnIndex = getColumnIndexForOperation(sandbox.steps, operationId);

  if (columnIndex === -1) {
    return {
      ...sandbox,
      steps: updatedSteps,
    };
  }

  const newHeader = [
    ...sandbox.table.header.slice(0, columnIndex),
    ...sandbox.table.header.slice(columnIndex + 1),
  ];

  const newRows = sandbox.table.rows.map((row) => ({
    ...row,
    cells: [
      ...row.cells.slice(0, columnIndex),
      ...row.cells.slice(columnIndex + 1),
    ],
  }));

  return {
    ...sandbox,
    steps: updatedSteps,
    table: {
      header: newHeader,
      rows: newRows,
    },
  };
}

// Helper functions for update operations
async function handleUpdateFilterOperation(
  sandbox: Sandbox,
  operationId: string,
  newOperation: FilterOperation
): Promise<Sandbox> {
  const updatedSteps = updateOperationInSteps(
    sandbox.steps,
    operationId,
    newOperation
  );

  const { segments, rowHeaders } = await recalculateSegments(updatedSteps);

  const updatedSandbox = {
    ...sandbox,
    steps: updatedSteps,
    segments: segments,
  };

  updatedSandbox.table = await regenerateTable(updatedSandbox, rowHeaders);

  return updatedSandbox;
}

async function handleUpdateRowOperation(
  sandbox: Sandbox,
  operationId: string,
  newOperation: RowOperation
): Promise<Sandbox> {
  const updatedSteps = updateOperationInSteps(
    sandbox.steps,
    operationId,
    newOperation
  );

  const { segments, rowHeaders } = await recalculateSegments(updatedSteps);

  const updatedSandbox = {
    ...sandbox,
    steps: updatedSteps,
    segments: segments,
  };

  updatedSandbox.table = await regenerateTable(updatedSandbox, rowHeaders);

  return updatedSandbox;
}

async function handleUpdateColumnOperation(
  sandbox: Sandbox,
  operationId: string,
  newOperation: ColumnOperation
): Promise<Sandbox> {
  const updatedSteps = updateOperationInSteps(
    sandbox.steps,
    operationId,
    newOperation
  );

  const columnIndex = getColumnIndexForOperation(sandbox.steps, operationId);

  if (columnIndex === -1) {
    return {
      ...sandbox,
      steps: updatedSteps,
    };
  }

  const newHeader = [...sandbox.table.header];
  newHeader[columnIndex] = newOperation;

  const newRows = await Promise.all(
    sandbox.table.rows.map(async (row, index) => {
      const segmentList = sandbox.segments[index];
      const newCells = await generateRowCells(segmentList, [newOperation], index, columnIndex);

      const updatedCells = [...row.cells];
      updatedCells[columnIndex] = newCells[0];

      return {
        ...row,
        cells: updatedCells,
      };
    })
  );

  return {
    ...sandbox,
    steps: updatedSteps,
    table: {
      header: newHeader,
      rows: newRows,
    },
  };
}

/**
 * Copy the user's sandbox state into the agent's sandbox
 */
export async function copyUserSandboxToAgent(
  userSandboxId: string,
  agentSandboxId: string
): Promise<{ table: Table; steps: OperationWithId[] }> {
  const userSandbox = getSandbox(userSandboxId);

  if (!userSandbox) {
    throw new Error("User sandbox not found");
  }

  const updatedSandbox = await withSandboxLock(agentSandboxId, async () => {
    const agentSandbox = getSandbox(agentSandboxId);
    if (!agentSandbox) {
      throw new Error("Agent sandbox not found");
    }

    const copiedSandbox: Sandbox = {
      id: agentSandboxId,
      segments: JSON.parse(JSON.stringify(userSandbox.segments)),
      table: JSON.parse(JSON.stringify(userSandbox.table)),
      steps: JSON.parse(JSON.stringify(userSandbox.steps)),
    };

    updateSandbox(agentSandboxId, copiedSandbox);
    console.log(
      `Copied user sandbox ${userSandboxId} to agent sandbox ${agentSandboxId} (${copiedSandbox.steps.length} steps)`
    );

    return copiedSandbox;
  });

  return {
    table: updatedSandbox.table,
    steps: updatedSandbox.steps,
  };
}

// Utility functions
function randomSample<T>(array: T[], sampleSize: number): T[] {
  if (sampleSize >= array.length) {
    return shuffleArray([...array]);
  }

  const result: T[] = [];
  const indices = new Set<number>();

  while (result.length < sampleSize) {
    const randomIndex = Math.floor(Math.random() * array.length);
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex);
      result.push(array[randomIndex]);
    }
  }

  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
