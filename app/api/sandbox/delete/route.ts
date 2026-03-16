import { NextResponse } from "next/server";
import { deleteSandbox } from "../../../storage/sandboxStore";

/**
 * POST /api/sandbox/delete
 * Deletes a sandbox by ID
 */
export async function POST(req: Request) {
  try {
    const { sandboxId } = await req.json();

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    const success = deleteSandbox(sandboxId);

    if (!success) {
      return NextResponse.json(
        { error: "Sandbox not found" },
        { status: 404 }
      );
    }

    console.log(`Deleted sandbox ${sandboxId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sandbox:", error);
    return NextResponse.json(
      { error: "Failed to delete sandbox" },
      { status: 500 }
    );
  }
}