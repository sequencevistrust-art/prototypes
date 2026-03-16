import { NextResponse } from "next/server";
import { getMetadata } from "../../services/metadata";

export async function GET() {
  try {
    const result = await getMetadata();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reading metadata:", error);
    return NextResponse.json(
      { error: "Failed to read metadata" },
      { status: 500 }
    );
  }
}
