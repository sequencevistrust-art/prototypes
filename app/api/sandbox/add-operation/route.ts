import { NextResponse } from "next/server";
import { addOperationToSandbox } from "../../../services/sandbox";

/**
 * POST /api/sandbox/add-operation
 * Adds an operation to a sandbox and returns the updated table
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, operationId, operation } = body;

    if (!sandboxId || !operationId || !operation) {
      return NextResponse.json(
        { error: "sandboxId, operationId, and operation are required" },
        { status: 400 }
      );
    }

    const result = await addOperationToSandbox(sandboxId, operationId, operation);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adding operation to sandbox:", error);

    if (error instanceof Error && error.message === "Sandbox not found") {
      return NextResponse.json(
        { error: "Sandbox not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add operation to sandbox" },
      { status: 500 }
    );
  }
}
