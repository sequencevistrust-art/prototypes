import { NextResponse } from "next/server";
import {
  generateSandboxId,
  createSandbox as storeSandbox,
} from "../../../storage/sandboxStore";
import { getAllEventSequences } from "../../../storage/dataStore";
import {
  Sandbox,
  CreateSandboxResponse,
  Table,
} from "../../../types/sandbox";

/**
 * POST /api/sandbox/create
 * Creates a new sandbox with empty table
 */
export async function POST() {
  try {
    // Generate unique sandbox ID
    const sandboxId = generateSandboxId();

    // Create initial empty table
    const initialTable: Table = {
      header: [], // No column operations yet
      rows: [], // Empty rows - user will add rows as needed
    };

    // Create sandbox object
    const sandbox: Sandbox = {
      id: sandboxId,
      segments: [], // Empty segments - will be populated when rows are added
      table: initialTable,
      steps: [], // No operations applied yet
    };

    // Store in global sandbox store
    storeSandbox(sandbox);

    console.log(`Created sandbox ${sandboxId} with empty table`);

    // Return response
    const response: CreateSandboxResponse = {
      sandboxId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creating sandbox:", error);
    return NextResponse.json(
      { error: "Failed to create sandbox" },
      { status: 500 }
    );
  }
}
