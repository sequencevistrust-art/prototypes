import { generateObject } from "ai";
import { z } from "zod";
import { createModel } from "../../../utils/model";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { highlightedText, surroundingContext, citationGrids } = await req.json();

    if (!highlightedText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("[add-citation] Request:", { highlightedText, contextLength: surroundingContext?.length, gridCount: citationGrids?.length });

    const systemPrompt = `You are a data citation assistant. You are given:
1. A highlighted phrase from a data analysis response
2. Surrounding context showing where the phrase appears
3. Citation grids from tool calls — each grid is a 2D array of cells with IDs and step descriptions

Your task: determine the correct referenceIds for the highlighted phrase.

## How to find referenceIds
- Each citation grid cell has an "id" field (e.g. "tool_xxx-cell-0-1") and "steps" describing the data
- For a single data point: use the cell ID directly (e.g. "tool_xxx-cell-0-1-number-0")
- For comparisons/rankings ("highest", "more than", "dominant"): combine IDs with operators:
  - "id1 > id2" for greater than
  - "id1 < id2" for less than
  - "id1 ~ id2" for approximately equal
  - "id1 , id2" for related values (use ONLY when values are not being compared)
- Look at existing <cite> tags in the context to find the right tool call IDs

## Operator consistency (CRITICAL)
When chaining multiple IDs, use the SAME operator throughout if the relationship is the same.
- "lowest volume" means the value is LESS THAN all others → use ALL <: "id_ref < id_organic < id_direct < id_paid"
- "highest spend" means the value is GREATER THAN all others → use ALL >: "id_wallet > id_card > id_paypal"
- "similar across groups" → use ALL ~: "id1 ~ id2 ~ id3 ~ id4"
- Do NOT mix operators like "id1 < id2 , id3 , id4" — if the relationship is "less than", use < for ALL.

## Superlatives from distributions (IMPORTANT)
When the data comes from a distribution (category-distribution-analysis step), superlatives like "preferred", "most popular", "dominant", "top" should reference ONLY the leading value's ID — do NOT chain all candidates with >.
The distribution is displayed as a bar chart, so the reader can already see the full ranking visually.
- GOOD: "Card is the preferred method" → referenceIds="tool_xxx-cell-0-2-number-1" (just the card percentage ID)
- BAD: "Card is the preferred method" → referenceIds="tool_xxx-cell-0-2-number-1 > tool_xxx-cell-0-2-number-2 > ..." (noisy, unnecessary)

## Rules
- Return a valid referenceIds string using cell IDs from the citation grids
- If you cannot find matching data, use the highlighted text itself as a fallback reference
- Always provide a reason explaining the data source`;

    const userPrompt = `Highlighted phrase: "${highlightedText}"

${surroundingContext ? `Context:\n${surroundingContext}\n` : ""}
${citationGrids && citationGrids.length > 0 ? `Citation grids:\n${JSON.stringify(citationGrids, null, 2)}` : "No citation grids available."}`;

    console.log("[add-citation] User prompt preview:", userPrompt.substring(0, 300));

    const model = createModel();
    const result = await generateObject({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      schema: z.object({
        referenceIds: z.string().describe("The referenceIds value for the cite tag"),
        reason: z.string().describe("Brief explanation of the data source"),
      }),
    });

    console.log("[add-citation] Result:", result.object);
    return NextResponse.json(result.object);
  } catch (error: any) {
    console.error("Add citation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
