"use client";

import { Send, Bot, User } from "lucide-react";
import { useRef, useEffect, useState, FormEvent, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import OperationChip from "./chat-pane/operation-chip";
import DebugToggle from "../debug-toggle";
import { Operation } from "../types/operations";
import { useUiStore } from "../store/ui-store";
import { useSandboxStore } from "../store/sandbox-store";
import { useOperationsStore } from "../store/operations-store";
import { stepsToOperations } from "../utils/stepsToOperations";
import { parseReference, parseCitations, Citation } from "../utils/citations";
import {
  ToolCall,
  ToolCallResult,
  MessagePart,
  Message,
  StreamChunk,
} from "../types/chat";

const VISUALIZED_TOOLS = [
  "clearSandbox",
  "addOperationToSandbox",
  "removeOperationFromSandbox",
  "updateOperationInSandbox",
  "loadUserSandbox",
];

interface ChatPaneProps {
  headerAction?: ReactNode;
}

/**
 * Component to render a cited piece of text with click handling
 */
function CitedText({
  citation,
  children,
  onCitationClick,
  isActive,
}: {
  citation: Citation;
  children: React.ReactNode;
  onCitationClick: (toolCallId: string, ids: string[], reference: string) => void;
  isActive: boolean;
}) {
  const handleClick = () => {
    const { ids, toolCallId } = parseReference(citation.reference);

    if (!toolCallId) {
      console.warn("Invalid reference format:", citation.reference);
      return;
    }

    onCitationClick(toolCallId, ids, citation.reference);
  };

  return (
    <span
      onClick={handleClick}
      data-reference={citation.reference}
      className={`cursor-pointer border-b-2 border-dotted transition-colors px-0.5 rounded ${
        isActive
          ? "bg-blue-200 border-blue-600"
          : "bg-blue-50 border-blue-400 hover:bg-blue-100"
      }`}
      title={`Click to view source (${citation.reference})`}
    >
      {children}
    </span>
  );
}

/**
 * Render text with citations highlighted
 * Uses rehype-raw to parse HTML cite tags and renders them as CitedText components
 */
function renderTextWithCitations(
  content: string,
  citations: Citation[] | undefined,
  role: "user" | "assistant",
  onCitationClick: (toolCallId: string, ids: string[], reference: string) => void,
  activeCitationReference: string | null
): React.ReactNode {
  // Create a map of citations by reference for quick lookup
  const citationMap = new Map<string, Citation>();
  if (citations) {
    citations.forEach((citation) => {
      citationMap.set(citation.reference, citation);
    });
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          return isInline ? (
            <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${role === "user" ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-900"}`} {...props}>{children}</code>
          ) : (
            <code className={`block p-2 rounded text-[11px] font-mono overflow-x-auto mb-2 last:mb-0 ${role === "user" ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-900"}`} {...props}>{children}</code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className={`${role === 'user' ? 'text-blue-300' : 'text-blue-600'} hover:underline`}>{children}</a>,
        blockquote: ({ children }) => <blockquote className={`border-l-4 ${role === 'user' ? 'border-gray-600' : 'border-gray-300'} pl-3 italic mb-2 last:mb-0`}>{children}</blockquote>,
        h1: ({ children }) => <h1 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-bold mb-2 mt-2 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
        table: ({ children }) => <div className="overflow-x-auto mb-2 last:mb-0"><table className="min-w-full border-collapse border border-gray-300 text-[10px]">{children}</table></div>,
        thead: ({ children }) => <thead className={role === 'user' ? 'bg-gray-800' : 'bg-gray-100'}>{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className={`border-b ${role === 'user' ? 'border-gray-700' : 'border-gray-200'}`}>{children}</tr>,
        th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1">{children}</td>,
        // Custom handler for <cite> tags
        cite: ({ node, referenceids, children, ...rest }: React.HTMLAttributes<HTMLElement> & { node?: unknown; referenceids?: string }) => {
          const citation = referenceids ? citationMap.get(referenceids) : undefined;

          if (citation) {
            return (
              <CitedText
                citation={citation}
                onCitationClick={onCitationClick}
                isActive={activeCitationReference === citation.reference}
              >
                {children}
              </CitedText>
            );
          }

          return <cite>{children}</cite>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function ChatPane({ headerAction }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentSandboxId, setAgentSandboxId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const enterPreviewMode = useUiStore(s => s.enterPreviewMode);
  const exitPreviewMode = useUiStore(s => s.exitPreviewMode);
  const chatDebugMode = useUiStore(s => s.chatDebugMode);
  const expandedChip = useUiStore(s => s.expandedChip);
  const setExpandedChip = useUiStore(s => s.setExpandedChip);
  const activeCitationReference = useUiStore(s => s.activeCitationReference);
  const setActiveCitationReference = useUiStore(s => s.setActiveCitationReference);
  const { replaceSandboxFromSteps } = useSandboxStore();
  const { replaceOperationsFromSteps } = useOperationsStore();


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Get user sandbox ID from the sandbox store
  const userSandboxId = useSandboxStore((state) => state.sandboxId);

  // Abort ongoing chat request on page unload or component unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Cleanup sandboxes on page unload (separate from abort logic)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sandboxIds: string[] = [];
      if (userSandboxId) sandboxIds.push(userSandboxId);
      if (agentSandboxId) sandboxIds.push(agentSandboxId);

      if (sandboxIds.length > 0) {
        const blob = new Blob([JSON.stringify({ sandboxIds })], { type: 'application/json' });
        navigator.sendBeacon('/api/sandbox/cleanup', blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userSandboxId, agentSandboxId]);

  // Handle clicking on a tool call chip
  const handleChipClick = (messageId: string, partIdx: number, toolCall: ToolCall) => {
    if (expandedChip?.messageId === messageId && expandedChip?.partIdx === partIdx) {
      exitPreviewMode();
      return;
    }

    const result = toolCall.result;
    if (!result || !result.table || !result.steps) {
      return;
    }

    const operations = stepsToOperations(result.steps);

    enterPreviewMode({
      table: result.table,
      steps: result.steps,
      filterOperations: operations.filterOperations,
      rowOperations: operations.rowOperations,
      columnOperations: operations.columnOperations,
    });

    setActiveCitationReference(null);
    setExpandedChip({ messageId, partIdx });
  };

  // Handle clicking on a citation
  const handleCitationClick = (toolCallId: string, ids: string[], reference: string) => {
    const cellIds: string[] = [];
    const sessionCountIds: string[] = [];
    const eventCountIds: string[] = [];
    const durationIds: string[] = [];

    for (const id of ids) {
      const sessionCountMatch = id.match(/^(.+?)-row-header-(\d+)-session-count(?:-|$)/);
      const eventCountMatch = id.match(/^(.+?)-row-header-(\d+)-event-count(?:-|$)/);
      const durationMatch = id.match(/^(.+?)-row-header-(\d+)-duration(?:-|$)/);
      const cellMatch = id.match(/^(.+?)-cell-(\d+)-(\d+)/);

      if (sessionCountMatch) {
        if (!sessionCountIds.includes(id)) sessionCountIds.push(id);
      } else if (eventCountMatch) {
        if (!eventCountIds.includes(id)) eventCountIds.push(id);
      } else if (durationMatch) {
        if (!durationIds.includes(id)) durationIds.push(id);
      } else if (cellMatch) {
        if (!cellIds.includes(id)) cellIds.push(id);
      }
    }

    // Find the tool call in message history
    let toolCallResult: ToolCallResult | null = null;
    let foundMessageId: string | undefined;
    let foundPartIdx: number | undefined;

    for (const msg of messages) {
      if (msg.role === "assistant") {
        for (let i = 0; i < msg.parts.length; i++) {
          const part = msg.parts[i];
          if (
            part.type === "tool-call" &&
            part.toolCall.toolCallId === toolCallId &&
            part.toolCall.result
          ) {
            toolCallResult = part.toolCall.result;
            foundMessageId = msg.id;
            foundPartIdx = i;
            break;
          }
        }
      }
      if (toolCallResult) break;
    }

    if (!toolCallResult || !toolCallResult.table || !toolCallResult.steps || !foundMessageId || foundPartIdx === undefined) {
      console.warn("Tool call result not found for:", toolCallId);
      return;
    }

    const operations = stepsToOperations(toolCallResult.steps);

    enterPreviewMode({
      table: toolCallResult.table,
      steps: toolCallResult.steps,
      filterOperations: operations.filterOperations,
      rowOperations: operations.rowOperations,
      columnOperations: operations.columnOperations,
      highlightCellIds: cellIds.length > 0 ? cellIds : undefined,
      highlightSessionCountIds: sessionCountIds.length > 0 ? sessionCountIds : undefined,
      highlightEventCountIds: eventCountIds.length > 0 ? eventCountIds : undefined,
      highlightDurationIds: durationIds.length > 0 ? durationIds : undefined,
    });

    setActiveCitationReference(reference);
    setExpandedChip({ messageId: foundMessageId, partIdx: foundPartIdx });
  };

  // Handle save button click
  const handleSave = async () => {
    const previewData = useUiStore.getState().previewData;
    if (!previewData) return;

    await replaceSandboxFromSteps(previewData.steps);
    replaceOperationsFromSteps(previewData.steps);
    exitPreviewMode();
  };

  // Handle cancel button click
  const handleCancel = () => {
    exitPreviewMode();
  };

  const submitMessage = async (content: string) => {
    if (isLoading || !content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", content }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/explore/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.parts
              .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === 'text')
              .map(p => p.content)
              .join('\n'),
          })),
          agentSandboxId,
          userSandboxId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const assistantMessageId = (Date.now() + 1).toString();
      let parts: MessagePart[] = [];
      let buffer = "";

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          parts: [],
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk: StreamChunk = JSON.parse(line);

            if (chunk.type === 'sandbox-info') {
              setAgentSandboxId(chunk.sandboxId);
              continue;
            }

            if (chunk.type === 'text-delta') {
              const lastPart = parts[parts.length - 1];
              if (lastPart && lastPart.type === 'text') {
                lastPart.content += chunk.text || "";
              } else {
                parts.push({ type: 'text', content: chunk.text || "" });
              }
            }

            if (chunk.type === 'tool-call') {
              if (chunk.invalid) {
                continue;
              }

              if (chunk.toolName === 'getMetadata') {
                continue;
              }

              const existingPart = parts.find(
                p => p.type === 'tool-call' && p.toolCall.toolCallId === chunk.toolCallId
              );

              const toolArgs = chunk.input || chunk.args || {};

              if (existingPart && existingPart.type === 'tool-call') {
                existingPart.toolCall.args = toolArgs;
              } else {
                parts.push({
                  type: 'tool-call',
                  toolCall: {
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    args: toolArgs,
                  },
                });
              }
            }

            if (chunk.type === 'tool-result') {
              console.log('[tool-result] chunk:', chunk);
              const toolPart = parts.find(
                p => p.type === 'tool-call' && p.toolCall.toolCallId === chunk.toolCallId
              );
              if (toolPart && toolPart.type === 'tool-call') {
                console.log('[tool-result] Found toolPart, toolCallId:', chunk.toolCallId);
                const result = chunk.output || chunk.result;
                toolPart.toolCall.result = result;
              }
            }

            if (chunk.type === 'error' || chunk.type === 'stream-error') {
              console.error('[stream-error] Error in stream:', chunk);
              const errorObj = chunk.error;
              const errorMessage = typeof errorObj === 'object' && errorObj?.message
                ? errorObj.message
                : typeof errorObj === 'string'
                  ? errorObj
                  : "An error occurred while processing your request.";
              const lastPart = parts[parts.length - 1];
              if (lastPart && lastPart.type === 'text') {
                lastPart.content += `\n\n⚠️ ${errorMessage} Please try again.`;
              } else {
                parts.push({ type: 'text', content: `⚠️ ${errorMessage} Please try again.` });
              }
            }

            if (chunk.type === 'tool-error') {
              console.error('[tool-error] Tool error:', chunk);
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, parts: [...parts] }
                  : m
              )
            );
          } catch (e) {
            console.warn("Failed to parse chunk:", line, e);
          }
        }
      }

      // Parse citations from text parts after streaming is complete
      const parsedParts = parts.map((part) => {
        if (part.type === 'text') {
          const { content, citations } = parseCitations(part.content);
          return { type: 'text' as const, content, citations };
        }
        return part;
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, parts: parsedParts }
            : m
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Chat request was aborted");
        return;
      }

      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          parts: [{ type: "text", content: "Sorry, I encountered an error. Please try again." }],
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    submitMessage(input);
  };

  return (
    <div className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between gap-2 h-12 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-gray-400" />
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            AI Assistant
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <DebugToggle mode="chat" />
          {headerAction}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
            <div className="text-center px-8">
              <Bot size={32} className="mx-auto mb-3 text-gray-200" />
              <p>Ask me to filter data, add columns, or analyze trends in your event sequences.</p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const parts: MessagePart[] = message.parts || [];

          return (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.role === "assistant" ? "items-start" : "items-end"
            } gap-1`}
          >
            <div className="flex items-center gap-1.5 px-1">
              {message.role === "assistant" ? (
                parts.length > 0 && (
                  <>
                    <Bot size={12} className="text-gray-400" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Assistant</span>
                  </>
                )
              ) : (
                <>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">You</span>
                  <User size={12} className="text-gray-400" />
                </>
              )}
            </div>

            <div className="w-full max-w-[95%] flex flex-col gap-2">
              {parts.map((part, pIdx) => {
                if (part.type === "text") {
                  return (
                    <div
                      key={pIdx}
                      className={`rounded-2xl px-4 py-2.5 text-xs shadow-sm border ${
                        message.role === "assistant"
                          ? "bg-white border-gray-200 text-gray-800"
                          : "bg-gray-900 border-gray-900 text-white"
                      }`}
                    >
                      {chatDebugMode ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed overflow-x-auto">
                          {part.content}
                        </pre>
                      ) : (
                        renderTextWithCitations(part.content, part.citations, message.role, handleCitationClick, activeCitationReference)
                      )}
                    </div>
                  );
                } else {
                  const toolCall = part.toolCall;

                  if (!VISUALIZED_TOOLS.includes(toolCall.toolName)) {
                    return null;
                  }

                  const operation = (toolCall.args?.operation || toolCall.args?.newOperation) as Operation | undefined;
                  const oldOperation = toolCall.args?.oldOperation as Operation | undefined;
                  const isExpanded = expandedChip?.messageId === message.id && expandedChip?.partIdx === pIdx;
                  const hasResult = !!toolCall.result;
                  const hasFullResult = hasResult && toolCall.result?.table && toolCall.result?.steps;

                  return (
                    <div key={pIdx} className="w-full py-1">
                      <div className="flex flex-wrap gap-1.5 px-2">
                        {toolCall.toolName === "clearSandbox" ? (
                          <div className="flex flex-col gap-1.5">
                            <div
                              className={`inline-flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-[10px] whitespace-nowrap shrink-0 ${hasFullResult ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${isExpanded ? "ring-2 ring-blue-400 shadow-md bg-white border-blue-300" : ""}`}
                              onClick={hasFullResult ? () => handleChipClick(message.id, pIdx, toolCall) : undefined}
                            >
                              <span className="text-[9px] font-semibold uppercase text-red-600">Clear</span>
                              <span className="text-gray-400">→</span>
                              <span className="uppercase font-light text-gray-900">Sandbox</span>
                            </div>
                            {isExpanded && (
                              <div className="flex gap-1.5 pl-1">
                                <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="px-2 py-0.5 text-[9px] font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer">Save</button>
                                <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="px-2 py-0.5 text-[9px] font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors cursor-pointer">Cancel</button>
                              </div>
                            )}
                          </div>
                        ) : toolCall.toolName === "loadUserSandbox" ? (
                          <div className="flex flex-col gap-1.5">
                            <div
                              className={`inline-flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-[10px] whitespace-nowrap shrink-0 ${hasFullResult ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${isExpanded ? "ring-2 ring-blue-400 shadow-md bg-white border-blue-300" : ""}`}
                              onClick={hasFullResult ? () => handleChipClick(message.id, pIdx, toolCall) : undefined}
                            >
                              <span className="text-[9px] font-semibold uppercase text-purple-600">Load</span>
                              <span className="text-gray-400">&rarr;</span>
                              <span className="uppercase font-light text-gray-900">User View</span>
                            </div>
                            {isExpanded && (
                              <div className="flex gap-1.5 pl-1">
                                <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="px-2 py-0.5 text-[9px] font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer">Save</button>
                                <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="px-2 py-0.5 text-[9px] font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors cursor-pointer">Cancel</button>
                              </div>
                            )}
                          </div>
                        ) : operation && (toolCall.toolName === "addOperationToSandbox" || toolCall.toolName === "updateOperationInSandbox" || toolCall.toolName === "removeOperationFromSandbox") ? (
                          <OperationChip
                            operation={operation}
                            oldOperation={oldOperation}
                            action={
                              toolCall.toolName === "addOperationToSandbox" ? "add" :
                              toolCall.toolName === "updateOperationInSandbox" ? "update" :
                              "remove"
                            }
                            isClickable={!!hasFullResult}
                            isExpanded={isExpanded}
                            onClick={() => handleChipClick(message.id, pIdx, toolCall)}
                            onSave={handleSave}
                            onCancel={handleCancel}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        );
      })}

        {isLoading && (
          <div className="flex flex-col items-start gap-1">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
                }
              }
            }}
            placeholder="Ask anything..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all resize-none overflow-hidden text-black placeholder:text-gray-400"
            style={{ minHeight: "36px", maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-8 h-8 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-black active:scale-95 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
