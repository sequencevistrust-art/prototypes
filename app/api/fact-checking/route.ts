import { streamText, stepCountIs } from "ai";
import { createModel } from "../../utils/model";
import { NextResponse } from "next/server";
import {
  clearSandboxTool,
  addOperationToSandboxTool,
  removeOperationFromSandboxTool,
  updateOperationInSandboxTool,
  getMetadataTool,
} from "../tools/index";
import { toolUiData } from "../tools/tool-ui-data";
import { getSandbox, generateSandboxId, createSandbox } from "../../storage/sandboxStore";
import { Sandbox, Table } from "../../types/sandbox";
import { FACT_CHECK_SYSTEM_PROMPT } from "./system-prompt";

export const maxDuration = 60;

function ensureSandbox(clientSandboxId?: string): string {
  if (clientSandboxId) {
    const sandbox = getSandbox(clientSandboxId);
    if (sandbox) return clientSandboxId;
  }
  const sandboxId = generateSandboxId();
  const initialTable: Table = { header: [], rows: [] };
  const sandbox: Sandbox = { id: sandboxId, segments: [], table: initialTable, steps: [] };
  createSandbox(sandbox);
  return sandboxId;
}


export async function POST(req: Request) {
  try {
    const { messages, agentSandboxId: clientAgentSandboxId } = await req.json();

    const sandboxId = ensureSandbox(clientAgentSandboxId);

    const result = streamText({
      model: createModel(),
      messages,
      system: FACT_CHECK_SYSTEM_PROMPT,
      tools: {
        clearSandbox: clearSandboxTool,
        addOperationToSandbox: addOperationToSandboxTool,
        removeOperationFromSandbox: removeOperationFromSandboxTool,
        updateOperationInSandbox: updateOperationInSandboxTool,
        getMetadata: getMetadataTool,
      },
      stopWhen: stepCountIs(100),
      experimental_context: {
        agentSandboxId: sandboxId,
        userSandboxId: null,
      },
      onError: (event) => {
        console.error("[fact-checking streamText] Error:", event.error);
      },
    });

    const NL = "\n";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + NL));
        try {
          send({ type: 'sandbox-info', sandboxId });

          for await (const chunk of result.fullStream) {
            if (chunk.type === 'tool-result') {
              const uiData = toolUiData.get(chunk.toolCallId);
              if (uiData) {
                const chunkAny = chunk as unknown as Record<string, unknown>;
                const originalResult =
                  typeof chunkAny.result === 'object' && chunkAny.result !== null ? chunkAny.result :
                  typeof chunkAny.output === 'object' && chunkAny.output !== null ? chunkAny.output : {};
                const enrichedResult = { ...originalResult, ...uiData };
                const enrichedChunk = { ...chunkAny };
                if ('output' in chunkAny) {
                  enrichedChunk.output = enrichedResult;
                } else {
                  enrichedChunk.result = enrichedResult;
                }
                send(enrichedChunk);
                toolUiData.delete(chunk.toolCallId);
                continue;
              }
            }
            send(chunk);
          }
          controller.close();
        } catch (error) {
          console.error("Stream error in fact-checking:", error);
          send({ type: 'stream-error', error: error instanceof Error ? error.message : "Unexpected error", recoverable: true });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("fact-checking API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
