import { NextResponse } from "next/server";
import { getSampledSegments } from "../../../services/sandbox";

/**
 * POST /api/sandbox/get-sampled-segments
 * Gets randomly sampled segments from a specific row in the sandbox
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sandboxId, rowIndex, sampleSize } = body;

    // Validate required parameters
    if (sandboxId === undefined || rowIndex === undefined || sampleSize === undefined) {
      return NextResponse.json(
        { error: "sandboxId, rowIndex, and sampleSize are required" },
        { status: 400 }
      );
    }

    // Validate numeric parameters
    if (typeof rowIndex !== "number" || typeof sampleSize !== "number") {
      return NextResponse.json(
        { error: "rowIndex and sampleSize must be numbers" },
        { status: 400 }
      );
    }

    if (rowIndex < 0 || sampleSize < 0) {
      return NextResponse.json(
        { error: "rowIndex and sampleSize must be non-negative" },
        { status: 400 }
      );
    }

    const result = await getSampledSegments(sandboxId, rowIndex, sampleSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting sampled segments:", error);

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
      { error: "Failed to get sampled segments" },
      { status: 500 }
    );
  }
}
