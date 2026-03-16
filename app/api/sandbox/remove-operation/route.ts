import { NextResponse } from "next/server";
import { removeOperationFromSandbox } from "../../../services/sandbox";

/**
 * POST /api/sandbox/remove-operation
 * Removes an operation from a sandbox and returns the updated table
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, operationId } = body;

    if (!sandboxId || !operationId) {
      return NextResponse.json(
        { error: "sandboxId and operationId are required" },
        { status: 400 }
      );
    }

    const result = await removeOperationFromSandbox(sandboxId, operationId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error removing operation from sandbox:", error);

    if (error instanceof Error) {
      if (error.message === "Sandbox not found") {
        return NextResponse.json(
          { error: "Sandbox not found" },
          { status: 404 }
        );
      }
      if (error.message === "Operation not found in sandbox") {
        return NextResponse.json(
          { error: "Operation not found in sandbox" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to remove operation from sandbox" },
      { status: 500 }
    );
  }
}
