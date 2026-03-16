import { NextResponse } from "next/server";
import { clearSandbox } from "../../../services/sandbox";

/**
 * POST /api/sandbox/clear
 * Clears a sandbox and reverts it to initial state (empty table)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId } = body;

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    const result = await clearSandbox(sandboxId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error clearing sandbox:", error);

    if (error instanceof Error && error.message === "Sandbox not found") {
      return NextResponse.json(
        { error: "Sandbox not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to clear sandbox" },
      { status: 500 }
    );
  }
}
