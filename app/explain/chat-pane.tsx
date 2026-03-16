"use client";

import { Send, Bot, User, Highlighter, Loader2 } from "lucide-react";
import { useRef, useEffect, useState, useCallback, FormEvent, MouseEvent as ReactMouseEvent, forwardRef, useImperativeHandle } from "react";
import ToolCallBar from "./tool-call-bar";
import DebugToggle from "../debug-toggle";
import MarkdownRenderer from "./markdown-renderer";
import { useUiStore } from "../store/ui-store";
import { parseCitations, parseReference } from "./chat-utils";
import { buildPositionMap } from "../utils/citations";
import { Step } from "./steps";

import {
  ToolCall,
  Citation,
  MessagePart,
  Message,
  CitationHoverData,
  StreamChunk,
  ToolCallResult,
} from "./chat-types";

import {
  buildExplanationMap,
} from "./chat-utils";

export type { CitationHoverData };

interface ExplainChatPaneProps {
  onCitationHover: (data: CitationHoverData | null, event: ReactMouseEvent) => void;
  onCitationClick: (data: CitationHoverData, event: ReactMouseEvent) => void;
}

export interface ExplainChatPaneRef {
  clearActiveCitation: () => void;
}

const ExplainChatPane = forwardRef<ExplainChatPaneRef, ExplainChatPaneProps>(function ExplainChatPane({ onCitationHover, onCitationClick }, ref) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentSandboxId, setAgentSandboxId] = useState<string | null>(null);
  const [activeCitationReference, setActiveCitationReference] = useState<string | null>(null);

  const [selection, setSelection] = useState<{ text: string; messageId: string } | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [isCiting, setIsCiting] = useState(false);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { chatDebugMode } = useUiStore();

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearActiveCitation: () => setActiveCitationReference(null),
  }));

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

  // Abort ongoing chat request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const isDraggingRef = useRef(false);
  const isCitingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isCitingRef.current = isCiting;
  }, [isCiting]);

  // Block new selections during citing
  useEffect(() => {
    const container = messagesAreaRef.current;
    if (!container) return;
    const handler = (e: Event) => {
      if (isCitingRef.current) e.preventDefault();
    };
    container.addEventListener('selectstart', handler);
    return () => container.removeEventListener('selectstart', handler);
  }, []);

  // Capture selection on mouseup
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (isCiting || chatDebugMode) return;

    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        window.getSelection()?.removeAllRanges();
        setSelection(null);
        setSelectionPos(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 5) {
        window.getSelection()?.removeAllRanges();
        setSelection(null);
        setSelectionPos(null);
        return;
      }

      // Find which message the selection is anchored in
      let node: Node | null = sel.anchorNode;
      let messageId: string | null = null;
      while (node) {
        if (node instanceof Element && node.hasAttribute("data-message-id")) {
          messageId = node.getAttribute("data-message-id");
          break;
        }
        node = node.parentNode;
      }

      if (!messageId) {
        window.getSelection()?.removeAllRanges();
        setSelection(null);
        setSelectionPos(null);
        return;
      }

      // Only allow highlight-to-cite on assistant messages
      const message = messages.find(m => m.id === messageId);
      if (!message || message.role !== "assistant") {
        window.getSelection()?.removeAllRanges();
        setSelection(null);
        setSelectionPos(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelection({ text, messageId });
      setSelectionPos({ x: rect.left + rect.width / 2, y: rect.top });
    }, 10);
  }, [messages, isCiting, chatDebugMode]);

  // Clear selection when clicking elsewhere (not on the popover button)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCiting) {
      e.preventDefault();
      return;
    }
    // Don't clear on right-click (button=2) — allows the user to copy selected text
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (!target.closest('[data-popover="add-citation"]')) {
      isDraggingRef.current = true;
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setSelectionPos(null);
    } else {
      isDraggingRef.current = false;
    }
  }, [isCiting]);

  const handleAddCitation = async () => {
    if (!selection || isCiting) return;

    const { text, messageId } = selection;

    // Keep native selection visible — ::selection CSS handles blue bg + white text
    setIsCiting(true);
    setSelection(null);

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) throw new Error("Message not found");

      // Find the text part containing the highlighted text
      let targetPartIndex = -1;
      let rawContent = "";
      for (let i = 0; i < message.parts.length; i++) {
        const p = message.parts[i];
        if (p.type !== "text") continue;
        const { strippedText } = buildPositionMap(p.content, ["cite"]);
        if (strippedText.includes(text)) {
          targetPartIndex = i;
          rawContent = p.content;
          break;
        }
      }

      if (targetPartIndex === -1) {
        console.warn("[add-citation] Could not find part containing selected text");
        return;
      }

      // Build position map and find the occurrence in stripped text
      const { strippedText, map } = buildPositionMap(rawContent, ["cite"]);
      const highlightStart = strippedText.indexOf(text);
      if (highlightStart === -1) {
        console.warn("[add-citation] Could not find highlighted text in stripped content");
        return;
      }

      // Extract surrounding context (80 chars before/after) for the LLM
      const ctxStart = Math.max(0, highlightStart - 80);
      const ctxEnd = Math.min(strippedText.length, highlightStart + text.length + 80);
      const surroundingContext = strippedText.substring(ctxStart, ctxEnd);

      // Collect all citation grids from tool call results
      const citationGrids: any[] = [];
      for (const msg of messages) {
        if (msg.role !== "assistant") continue;
        for (const part of msg.parts) {
          if (part.type === "tool-call" && part.toolCall.result?.citationGrid) {
            citationGrids.push({
              toolCallId: part.toolCall.toolCallId,
              grid: part.toolCall.result.citationGrid,
            });
          }
        }
      }

      console.log("[add-citation] Sending", { text, surroundingContextLength: surroundingContext.length, gridCount: citationGrids.length });

      const response = await fetch("/api/explain/add-citation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highlightedText: text,
          surroundingContext,
          citationGrids,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      const { referenceIds, reason } = await response.json();
      console.log("[add-citation] Result:", { referenceIds, reason });

      if (!referenceIds) return;

      // Merge: insert new cite tag into rawContent, removing overlapping existing cites
      const highlightEnd = highlightStart + text.length;

      // Parse existing cite tags from rawContent
      const citeRegex = /<cite\s+referenceIds="([^"]*)"(?:\s+reason="([^"]*)")?>([\s\S]*?)<\/cite>/g;
      let match;
      const existingCites: { fullMatch: string; start: number; end: number; strippedStart: number; strippedEnd: number }[] = [];

      // Track stripped position as we scan
      let strippedPos = 0;
      let rawPos = 0;
      const tagRegex = /<\/?cite[^>]*>/g;
      let lastTagEnd = 0;
      let tagMatch;
      const rawToStrippedMap: number[] = new Array(rawContent.length).fill(-1);

      // Build raw→stripped position map
      let si = 0;
      const tagRegex2 = /<\/?cite[^>]*>/g;
      let tm;
      let lastEnd2 = 0;
      while ((tm = tagRegex2.exec(rawContent)) !== null) {
        for (let i = lastEnd2; i < tm.index; i++) {
          rawToStrippedMap[i] = si++;
        }
        // Tag characters map to -1 (not in stripped text)
        lastEnd2 = tm.index + tm[0].length;
      }
      for (let i = lastEnd2; i < rawContent.length; i++) {
        rawToStrippedMap[i] = si++;
      }

      // Find existing cite tags and their stripped positions
      while ((match = citeRegex.exec(rawContent)) !== null) {
        const rawStart = match.index;
        const rawEnd = match.index + match[0].length;
        // The inner text starts after the opening tag
        const openTagEnd = rawContent.indexOf('>', rawStart) + 1;
        const closeTagStart = rawContent.lastIndexOf('<', rawEnd - 1);
        const innerStrippedStart = rawToStrippedMap[openTagEnd] ?? -1;
        const innerStrippedEnd = closeTagStart > openTagEnd ? (rawToStrippedMap[closeTagStart - 1] ?? -1) + 1 : innerStrippedStart;

        existingCites.push({
          fullMatch: match[0],
          start: rawStart,
          end: rawEnd,
          strippedStart: innerStrippedStart,
          strippedEnd: innerStrippedEnd,
        });
      }

      // Build new rawContent: remove overlapping cites, insert new cite tag
      let newRawContent = "";
      let cursor = 0;

      // Sort existing cites by position
      existingCites.sort((a, b) => a.start - b.start);

      // Determine which existing cites overlap with the new highlight range
      const overlapping = existingCites.filter(c =>
        c.strippedStart < highlightEnd && c.strippedEnd > highlightStart
      );
      const nonOverlapping = existingCites.filter(c =>
        !(c.strippedStart < highlightEnd && c.strippedEnd > highlightStart)
      );

      // Remove overlapping cite tags (keep their inner text)
      let cleanedRaw = rawContent;
      // Process in reverse order to preserve positions
      for (let i = overlapping.length - 1; i >= 0; i--) {
        const c = overlapping[i];
        const openTag = cleanedRaw.substring(c.start, cleanedRaw.indexOf('>', c.start) + 1);
        const closeTag = '</cite>';
        // Remove opening tag
        cleanedRaw = cleanedRaw.substring(0, c.start) + cleanedRaw.substring(c.start + openTag.length);
        // Find and remove closing tag (now shifted)
        const closePos = cleanedRaw.lastIndexOf(closeTag, c.end - openTag.length);
        if (closePos >= 0) {
          cleanedRaw = cleanedRaw.substring(0, closePos) + cleanedRaw.substring(closePos + closeTag.length);
        }
      }

      // Now insert the new cite tag at the correct position in cleanedRaw
      // Rebuild position map for cleanedRaw
      const { strippedText: cleanedStripped, map: cleanedMap } = buildPositionMap(cleanedRaw, ["cite"]);
      const newHighlightStart = cleanedStripped.indexOf(text, Math.max(0, highlightStart - 5));

      if (newHighlightStart >= 0) {
        const newHighlightEnd = newHighlightStart + text.length;
        // Map stripped positions back to raw positions
        const rawInsertStart = cleanedMap[newHighlightStart];
        const rawInsertEnd = newHighlightEnd < cleanedMap.length ? cleanedMap[newHighlightEnd] : cleanedRaw.length;

        const reasonAttr = reason ? ` reason="${reason.replace(/"/g, '&quot;')}"` : '';
        const citeOpen = `<cite referenceIds="${referenceIds}"${reasonAttr}>`;
        const citeClose = '</cite>';

        const updatedRaw = cleanedRaw.substring(0, rawInsertStart) +
          citeOpen + cleanedRaw.substring(rawInsertStart, rawInsertEnd) + citeClose +
          cleanedRaw.substring(rawInsertEnd);

        setMessages(prev => {
          const updatedMessages = prev.map(m => {
            if (m.id !== messageId) return m;
            const newParts = m.parts.map((part, idx) => {
              if (idx !== targetPartIndex || part.type !== "text") return part;
              const parsed = parseCitations(updatedRaw);
              return { ...part, content: parsed.content, citations: parsed.citations };
            });
            return { ...m, parts: newParts };
          });

          return updatedMessages.map(m => {
            if (m.id !== messageId) return m;
            const explanationMap = buildExplanationMap(m.parts, updatedMessages);
            return { ...m, explanationMap };
          });
        });
      }

    } catch (e) {
      console.error("[add-citation] Error:", e);
    } finally {
      window.getSelection()?.removeAllRanges();
      setIsCiting(false);
      setSelectionPos(null);
    }
  };

  // Lookup a citation's reason and text from message history
  const findManualCitationData = (reference: string) => {
    let reason: string | undefined;
    let highlightedText = "";
    for (const msg of messages) {
      for (const part of msg.parts) {
        if (part.type === "text" && part.citations) {
          const found = part.citations.find(c => c.reference === reference);
          if (found) { reason = found.reason; highlightedText = found.text; break; }
        }
      }
      if (highlightedText) break;
    }
    return { reason, highlightedText };
  };

  // Handle hovering on a citation - pass data to parent
  const handleCitationHoverInternal = (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    const { reason, highlightedText } = findManualCitationData(reference);

    let toolCallResult: ToolCallResult | null = null;
    let cachedExplanationSteps: Step[] | undefined;
    let resolvedToolCallId = toolCallId;
    let resolvedIds = ids;

    if (!toolCallId || toolCallId === "__manual__") {
      const parsed = parseReference(reference);
      if (parsed.toolCallId) resolvedToolCallId = parsed.toolCallId;
      if (parsed.ids.length > 0) resolvedIds = parsed.ids;
    }

    for (const msg of messages) {
      if (msg.role === "assistant") {
        for (const part of msg.parts) {
          if (
            part.type === "tool-call" &&
            part.toolCall.toolCallId === resolvedToolCallId &&
            part.toolCall.result
          ) {
            toolCallResult = part.toolCall.result;
            break;
          }
        }
        if (msg.explanationMap && msg.explanationMap[reference]) {
          cachedExplanationSteps = msg.explanationMap[reference];
        }
      }
      if (toolCallResult && cachedExplanationSteps) break;
    }

    if (toolCallResult && toolCallResult.table && toolCallResult.steps) {
        onCitationHover(
          {
            toolCallId: resolvedToolCallId,
            ids: resolvedIds,
            reference,
            toolCallResult: {
              table: toolCallResult.table,
              steps: toolCallResult.steps,
              citationGrid: toolCallResult.citationGrid,
            },
            highlightedText: highlightedText || reference, // Use highlighted text if found
            explanationSteps: cachedExplanationSteps,
            reason, // Include the reason as supplementary
          },
          event
        );
        return;
    }

    if (reason) {
      onCitationHover({ toolCallId: "__manual__", ids: [], reference, highlightedText, reason }, event);
      return;
    }

    if (!toolCallResult) {
       console.warn("Tool call result not found for:", resolvedToolCallId);
       return;
    }
  };

  // Handle clicking on a citation - pass data to parent to pin popup
  const handleCitationClickInternal = (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    let resolvedToolCallId = toolCallId;
    let resolvedIds = ids;

    if (toolCallId === "__manual__") {
      const parsed = parseReference(reference);
      if (parsed.toolCallId) resolvedToolCallId = parsed.toolCallId;
      if (parsed.ids.length > 0) resolvedIds = parsed.ids;
    }

    if (toolCallId === "__manual__" && resolvedToolCallId === "__manual__") {
      const { reason, highlightedText } = findManualCitationData(reference);
      onCitationClick({ toolCallId: "__manual__", ids: [], reference, highlightedText, reason }, event);
      setActiveCitationReference(reference);
      return;
    }

    let toolCallResult: ToolCallResult | null = null;
    let cachedExplanationSteps: Step[] | undefined;

    for (const msg of messages) {
      if (msg.role === "assistant") {
        for (const part of msg.parts) {
          if (
            part.type === "tool-call" &&
            part.toolCall.toolCallId === resolvedToolCallId &&
            part.toolCall.result
          ) {
            toolCallResult = part.toolCall.result;
            break;
          }
        }
        if (msg.explanationMap && msg.explanationMap[reference]) {
          cachedExplanationSteps = msg.explanationMap[reference];
        }
      }
      if (toolCallResult && cachedExplanationSteps) break;
    }

    if (!toolCallResult || !toolCallResult.table || !toolCallResult.steps) {
      // Fallback if no tool call result found for manual citation
      if (toolCallId === "__manual__") {
        const { reason, highlightedText } = findManualCitationData(reference);
        onCitationClick({ toolCallId: "__manual__", ids: resolvedIds, reference, highlightedText, reason }, event);
        setActiveCitationReference(reference);
      } else {
        console.warn("Tool call result not found for:", resolvedToolCallId);
      }
      return;
    }

    let highlightedText = "";
    for (const msg of messages) {
      if (msg.role === "assistant") {
        for (const part of msg.parts) {
          if (part.type === "text" && part.citations) {
            for (const citation of part.citations) {
              if (citation.reference === reference) {
                highlightedText = citation.text;
                break;
              }
            }
          }
          if (highlightedText) break;
        }
      }
      if (highlightedText) break;
    }

    onCitationClick(
      {
        toolCallId: resolvedToolCallId,
        ids: resolvedIds,
        reference,
        toolCallResult: {
          table: toolCallResult.table,
          steps: toolCallResult.steps,
          citationGrid: toolCallResult.citationGrid,
        },
        highlightedText: highlightedText || findManualCitationData(reference).highlightedText || reference,
        explanationSteps: cachedExplanationSteps,
        reason: findManualCitationData(reference).reason,
      },
      event
    );

    setActiveCitationReference(reference);
  };

  const handleCitationLeaveInternal = (event: ReactMouseEvent<HTMLSpanElement>) => {
    onCitationHover(null, event);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", content: input }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/explain/chat", {
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
              if (chunk.invalid) continue;
              if (chunk.toolName === 'getMetadata') continue;

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
              const toolPart = parts.find(
                p => p.type === 'tool-call' && p.toolCall.toolCallId === chunk.toolCallId
              );
              if (toolPart && toolPart.type === 'tool-call') {
                const result = chunk.output || chunk.result;
                toolPart.toolCall.result = result;
              }
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

      const parsedParts = parts.map((part) => {
        if (part.type === 'text') {
          const { content, citations } = parseCitations(part.content);
          return { type: 'text' as const, content, citations };
        }
        return part;
      });

      setMessages((prev) => {
        const updatedMessages = prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, parts: parsedParts }
            : m
        );

        const explanationMap = buildExplanationMap(parsedParts, updatedMessages);

        return updatedMessages.map((m) =>
          m.id === assistantMessageId
            ? { ...m, explanationMap }
            : m
        );
      });
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

  return (
    <div className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-gray-50 flex flex-col overflow-hidden relative">
      {selectionPos && (selection || isCiting) && !chatDebugMode && (
        <div
          data-popover="add-citation"
          className={`fixed z-50 flex items-center gap-1 px-1.5 py-0.5 select-none ${
            isCiting
              ? "text-white cursor-default"
              : "text-white cursor-pointer hover:brightness-110 transition-colors"
          }`}
          style={{
            left: selectionPos.x,
            top: selectionPos.y - 8,
            transform: "translate(-50%, -100%)",
            backgroundColor: "#3b82f6",
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={isCiting ? undefined : handleAddCitation}
        >
          {isCiting ? (
            <>
              <Loader2 size={13} className="shrink-0 animate-spin" />
              <span className="text-xs font-medium whitespace-nowrap">Citing...</span>
            </>
          ) : (
            <>
              <Highlighter size={13} className="shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">Cite</span>
            </>
          )}
        </div>
      )}


      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2 h-12 shrink-0">
        <Bot size={16} className="text-gray-400" />
        <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex-1">
          AI Assistant
        </h2>
        <DebugToggle mode="chat" />
      </div>

      {/* Messages Area */}
      <div
        ref={messagesAreaRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar chat-messages-area"
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
            <div className="text-center px-8">
              <Bot size={32} className="mx-auto mb-3 text-gray-200" />
              <p>Ask me to analyze your event sequences. Hover over any cited fact to see the data behind it.</p>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const parts: MessagePart[] = message.parts;

          return (
            <div
              key={message.id}
              data-message-id={message.id}
              data-message-role={message.role}
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

              <div className={`flex flex-col gap-2 ${message.role === "assistant" ? "w-full max-w-[95%]" : "w-fit max-w-[80%]"}`}>
                {(() => {
                  // Separate text parts and tool calls
                  const textParts = parts.filter((p): p is { type: "text"; content: string; citations?: Citation[] } => p.type === "text");
                  const toolCallParts = parts.filter((p): p is { type: "tool-call"; toolCall: ToolCall } => p.type === "tool-call");
                  const toolCalls = toolCallParts.map(p => p.toolCall);

                  // Check if there's any text content (signals that tools are done)
                  const hasTextContent = textParts.some(p => p.content.trim().length > 0);

                  return (
                    <>
                      {/* Tool call bar (shown first if there are tool calls) */}
                      {toolCalls.length > 0 && (
                        <ToolCallBar toolCalls={toolCalls} hasTextContent={hasTextContent} />
                      )}

                      {/* Text parts */}
                      {textParts.map((part, pIdx) => {
                        return (
                        <div
                          key={pIdx}
                          className={`relative rounded-2xl px-4 py-2.5 text-xs shadow-sm border ${
                            message.role === "assistant"
                              ? "bg-white border-gray-200 text-gray-800"
                              : "bg-gray-900 border-gray-900 text-white inline-block"
                          }`}
                        >
                          {chatDebugMode ? (
                            <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed overflow-x-auto">
                              {part.content}
                            </pre>
                          ) : (
                            <MarkdownRenderer
                              content={part.content}
                              citations={part.citations}
                              role={message.role}
                              onCitationHover={handleCitationHoverInternal}
                              onCitationLeave={handleCitationLeaveInternal}
                              onCitationClick={handleCitationClickInternal}
                              activeCitationReference={activeCitationReference}
                            />
                          )}
                        </div>
                        );
                      })}
                    </>
                  );
                })()}
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
            className="flex-1 px-3 py-2 text-xs text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed transition-all resize-none overflow-hidden"
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
});

export default ExplainChatPane;
