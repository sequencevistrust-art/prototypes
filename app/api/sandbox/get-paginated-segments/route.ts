import { NextResponse } from "next/server";
import { getPaginatedSegments } from "../../../services/sandbox";

/**
 * POST /api/sandbox/get-paginated-segments
 * Gets paginated segments from a specific row in the sandbox
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, rowIndex, offset, size } = body;

    // Validate required parameters
    if (sandboxId === undefined || rowIndex === undefined || offset === undefined || size === undefined) {
      return NextResponse.json(
        { error: "sandboxId, rowIndex, offset, and size are required" },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    if (typeof rowIndex !== "number" || typeof offset !== "number" || typeof size !== "number") {
      return NextResponse.json(
        { error: "rowIndex, offset, and size must be numbers" },
        { status: 400 }
      );
    }

    if (rowIndex < 0 || offset < 0 || size < 0) {
      return NextResponse.json(
        { error: "rowIndex, offset, and size must be non-negative" },
        { status: 400 }
      );
    }

    const result = await getPaginatedSegments(sandboxId, rowIndex, offset, size);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting paginated segments:", error);

    if (error instanceof Error) {
      if (error.message === "Sandbox not found") {
        return NextResponse.json(
          { error: "Sandbox not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("out of bounds")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to get paginated segments" },
      { status: 500 }
    );
  }
}
