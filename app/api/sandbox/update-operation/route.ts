import { NextResponse } from "next/server";
import { updateOperationInSandbox } from "../../../services/sandbox";

/**
 * POST /api/sandbox/update-operation
 * Updates an operation in a sandbox and returns the updated table
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, operationId, newOperation } = body;

    if (!sandboxId || !operationId || !newOperation) {
      return NextResponse.json(
        { error: "sandboxId, operationId, and newOperation are required" },
        { status: 400 }
      );
    }

    const result = await updateOperationInSandbox(sandboxId, operationId, newOperation);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating operation in sandbox:", error);

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
      { error: "Failed to update operation in sandbox" },
      { status: 500 }
    );
  }
}
