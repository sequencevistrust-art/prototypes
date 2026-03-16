import { streamText, stepCountIs } from "ai";
import { createModel } from "../../../utils/model";
import { NextResponse } from "next/server";
import {
  clearSandboxTool,
  addOperationToSandboxTool,
  removeOperationFromSandboxTool,
  updateOperationInSandboxTool,
  getMetadataTool,
  loadUserSandboxTool,
} from "../../tools/index";
import { toolUiData } from "../../tools/tool-ui-data";
import { getSandbox, generateSandboxId, createSandbox } from "../../../storage/sandboxStore";
import { Sandbox, Table } from "../../../types/sandbox";
import { EXPLAIN_SYSTEM_PROMPT } from "../system-prompt";

export const maxDuration = 60;

function ensureSandbox(clientSandboxId?: string): string {
  if (clientSandboxId) {
    const sandbox = getSandbox(clientSandboxId);
    if (sandbox) {
      return clientSandboxId;
    }
    console.log("[ensureSandbox] Sandbox", clientSandboxId, "no longer exists, creating new one...");
  }

  console.log("[ensureSandbox] Creating new sandbox...");
  const sandboxId = generateSandboxId();

  const initialTable: Table = {
    header: [],
    rows: [],
  };

  const sandbox: Sandbox = {
    id: sandboxId,
    segments: [],
    table: initialTable,
    steps: [],
  };

  createSandbox(sandbox);
  console.log("[ensureSandbox] Created sandbox:", sandboxId);

  return sandboxId;
}

export async function POST(req: Request) {
  try {
    const { messages, agentSandboxId: clientAgentSandboxId, userSandboxId } = await req.json();

    const sandboxId = ensureSandbox(clientAgentSandboxId);

    const result = streamText({
      model: createModel(),
      messages,
      system: EXPLAIN_SYSTEM_PROMPT,
      tools: {
        clearSandbox: clearSandboxTool,
        addOperationToSandbox: addOperationToSandboxTool,
        removeOperationFromSandbox: removeOperationFromSandboxTool,
        updateOperationInSandbox: updateOperationInSandboxTool,
        getMetadata: getMetadataTool,
        loadUserSandbox: loadUserSandboxTool,
      },
      stopWhen: stepCountIs(100),
      experimental_context: {
        agentSandboxId: sandboxId,
        userSandboxId: userSandboxId || null,
      },
      onError: (event) => {
        console.error("[streamText] Error during streaming:", event.error);
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sandboxInfo = JSON.stringify({ type: 'sandbox-info', sandboxId }) + '\n';
          controller.enqueue(encoder.encode(sandboxInfo));

          for await (const chunk of result.fullStream) {
            if (chunk.type === 'tool-result') {
              const uiData = toolUiData.get(chunk.toolCallId);
              if (uiData) {
                const chunkAny = chunk as any;
                const originalResult = chunkAny.result ?? chunkAny.output ?? {};
                const enrichedResult = { ...originalResult, ...uiData };
                const enrichedChunk = { ...chunk };
                if ('output' in chunkAny) {
                  (enrichedChunk as any).output = enrichedResult;
                } else {
                  (enrichedChunk as any).result = enrichedResult;
                }
                controller.enqueue(encoder.encode(JSON.stringify(enrichedChunk) + '\n'));
                toolUiData.delete(chunk.toolCallId);
                continue;
              }
            }
            const data = JSON.stringify(chunk) + '\n';
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          console.error("Stream error in loop:", error);
          const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
          const errorData = JSON.stringify({
            type: 'stream-error',
            error: errorMessage,
            recoverable: true
          }) + '\n';
          controller.enqueue(encoder.encode(errorData));
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
    console.error("Explain Chat API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process chat request",
      },
      { status: 500 }
    );
  }
}
