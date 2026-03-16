import { NextResponse } from "next/server";
import {
  generateSandboxId,
  createSandbox as storeSandbox,
} from "../../../storage/sandboxStore";
import {
  Sandbox,
  Table,
  OperationWithId,
} from "../../../types/sandbox";
import { applyOperation } from "../../../utils/applyOperation";

/**
 * POST /api/sandbox/recreate
 * Creates a new sandbox and replays a list of operations
 */
export async function POST(req: Request) {
  try {
    const { steps } = await req.json();

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: "steps array is required" },
        { status: 400 }
      );
    }

    // Generate unique sandbox ID
    const sandboxId = generateSandboxId();

    // Create initial empty table
    const initialTable: Table = {
      header: [], 
      rows: [],
    };

    // Create sandbox object
    let sandbox: Sandbox = {
      id: sandboxId,
      segments: [], 
      table: initialTable,
      steps: [], 
    };

    // Replay steps
    for (const step of steps) {
      const operationWithId = step as OperationWithId;

      // Update steps list
      sandbox.steps = [...sandbox.steps, operationWithId];

      // Apply operation logic
      sandbox = await applyOperation(sandbox, operationWithId.operation);
    }

    // Store in global sandbox store
    storeSandbox(sandbox);

    console.log(`Recreated sandbox ${sandboxId} with ${steps.length} steps`);

    return NextResponse.json({
      sandboxId,
      table: sandbox.table,
      steps: sandbox.steps
    });
  } catch (error) {
    console.error("Error recreating sandbox:", error);
    return NextResponse.json(
      { error: "Failed to recreate sandbox" },
      { status: 500 }
    );
  }
}