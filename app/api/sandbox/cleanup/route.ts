import { NextResponse } from "next/server";
import { deleteSandbox } from "../../../storage/sandboxStore";

/**
 * POST /api/sandbox/cleanup
 * Deletes specific sandboxes when the page is closed/refreshed
 * This endpoint is called via navigator.sendBeacon on page unload
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sandboxIds } = body as { sandboxIds?: string[] };

    if (!sandboxIds || sandboxIds.length === 0) {
      return NextResponse.json({ success: true, cleared: 0 });
    }

    let cleared = 0;
    for (const sandboxId of sandboxIds) {
      if (deleteSandbox(sandboxId)) {
        cleared++;
      }
    }

    console.log(`[Cleanup] Deleted ${cleared} sandbox(es):`, sandboxIds);

    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    console.error("[Cleanup] Error cleaning up sandboxes:", error);
    return NextResponse.json(
      { error: "Failed to cleanup sandboxes" },
      { status: 500 }
    );
  }
}
