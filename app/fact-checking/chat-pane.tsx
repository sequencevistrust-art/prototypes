"use client";

import { useState, useRef, useEffect, useCallback, FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { Search, FileText, CheckCircle, AlertCircle, Bot, Send } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { FactCheckMarkdownRenderer } from "./markdown-renderer";
import ExplanationPopup from "../components/explanation-popup";
import { parseCitations, parseReference } from "../utils/citations";
import { buildExplanationMap } from "../utils/explanationMap";
import { extractReferencedCells } from "../utils/extractReferencedCells";
import { Table, OperationWithId } from "../types/sandbox";
import DebugToggle from "../debug-toggle";
import { getToolCallLabel } from "../utils/toolLabels";
import { useUiStore } from "../store/ui-store";
import { ToolCall as ToolCallType } from "../types/chat";
import { Step } from "../types/steps";
import { CitationGrid } from "../types/citation";
import { Message, MessagePart, StreamChunk } from "../types/chat";

interface PopupData {
  referencedCells: ReturnType<typeof extractReferencedCells>;
  reference: string;
  highlightedText: string;
  table: Table | null;
  steps: OperationWithId[] | null;
  citationGrid?: CitationGrid;
  allCitationGrids?: Map<string, CitationGrid>;
  explanationSteps?: Step[];
  reason?: string;
  traceIds?: {
    toolCallId?: string;
    reference?: string;
    errorId?: string;
    referenceIds?: string;
  };
}


export function FactCheckPane() {
  const { chatDebugMode } = useUiStore();
  const [draftText, setDraftText] = useState("Users in South Africa (ZA) have the lowest average purchase amount at $100.");
  const [annotatedText, setAnnotatedText] = useState<string | null>(null);
  const [annotatedCitations, setAnnotatedCitations] = useState<ReturnType<typeof parseCitations>["citations"]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [agentSandboxId, setAgentSandboxId] = useState<string | null>(null);
  const [activeCitationReference, setActiveCitationReference] = useState<string | null>(null);

  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const isPinnedRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => { return () => { abortControllerRef.current?.abort(); }; }, []);

  // ---- Popup handlers ----
  const handleCitationHover = useCallback((data: { toolCallId: string; ids: string[]; reference: string; toolCallResult?: { table: Table; steps: OperationWithId[]; citationGrid?: CitationGrid }; highlightedText: string; explanationSteps?: Step[]; allCitationGrids?: Map<string, CitationGrid> } | null, event: ReactMouseEvent) => {
    if (isPinnedRef.current) return;
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    if (!data) { hideTimeoutRef.current = setTimeout(() => { setShowPopup(false); setPopupData(null); }, 150); return; }
    setPopupPosition({ x: event.clientX, y: event.clientY });
    if (!data.toolCallResult) return;
    const referencedCells = extractReferencedCells(data.toolCallResult.table, data.ids);
    setPopupData({ referencedCells, reference: data.reference, highlightedText: data.highlightedText, table: data.toolCallResult.table, steps: data.toolCallResult.steps, citationGrid: data.toolCallResult.citationGrid, allCitationGrids: data.allCitationGrids, explanationSteps: data.explanationSteps, traceIds: { toolCallId: data.toolCallId, reference: data.reference } });
    setShowPopup(true);
  }, []);

  const handleCitationClick = useCallback((data: { toolCallId: string; ids: string[]; reference: string; toolCallResult?: { table: Table; steps: OperationWithId[]; citationGrid?: CitationGrid }; highlightedText: string; explanationSteps?: Step[]; allCitationGrids?: Map<string, CitationGrid> }, event: ReactMouseEvent) => {
    isPinnedRef.current = true;
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    setPopupPosition({ x: event.clientX, y: event.clientY });
    if (!data.toolCallResult) return;
    const referencedCells = extractReferencedCells(data.toolCallResult.table, data.ids);
    setPopupData({ referencedCells, reference: data.reference, highlightedText: data.highlightedText, table: data.toolCallResult.table, steps: data.toolCallResult.steps, citationGrid: data.toolCallResult.citationGrid, allCitationGrids: data.allCitationGrids, explanationSteps: data.explanationSteps, traceIds: { toolCallId: data.toolCallId, reference: data.reference } });
    setShowPopup(true); setIsPinned(true); setActiveCitationReference(data.reference);
  }, []);

  const handlePopupMouseEnter = useCallback(() => { if (isPinnedRef.current) return; if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; } }, []);
  const handlePopupMouseLeave = useCallback(() => { if (isPinnedRef.current) return; hideTimeoutRef.current = setTimeout(() => { setShowPopup(false); setPopupData(null); }, 150); }, []);
  const handleClosePopup = useCallback(() => { isPinnedRef.current = false; if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); } setShowPopup(false); setPopupData(null); setIsPinned(false); setActiveCitationReference(null); }, []);
  const handlePinPopup = useCallback(() => { isPinnedRef.current = true; if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); } setIsPinned(true); }, []);

  const findToolCallResult = useCallback((toolCallId: string, msgs: Message[]) => {
    for (const msg of msgs) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (part.type === "tool-call" && part.toolCall.toolCallId === toolCallId && part.toolCall.result) return part.toolCall.result;
      }
    }
    return null;
  }, []);

  const collectAllCitationGrids = useCallback((msgs: Message[]) => {
    const grids = new Map<string, import("../types/citation").CitationGrid>();
    for (const msg of msgs) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (part.type === "tool-call" && part.toolCall.result?.citationGrid) {
          grids.set(part.toolCall.toolCallId, part.toolCall.result.citationGrid);
        }
      }
    }
    return grids;
  }, []);

  const onCitationHoverAdapted = useCallback((toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    let resolvedId = toolCallId; let resolvedIds = ids;
    if (!toolCallId || toolCallId === "__manual__") { const p = parseReference(reference); if (p.toolCallId) resolvedId = p.toolCallId; if (p.ids.length > 0) resolvedIds = p.ids; }
    const result = findToolCallResult(resolvedId, allMessages);
    let cachedSteps: Step[] | undefined;
    for (const msg of allMessages) { if (msg.explanationMap?.[reference]) { cachedSteps = msg.explanationMap[reference]; break; } }
    if (result?.table && result?.steps) {
      const allGrids = collectAllCitationGrids(allMessages);
      handleCitationHover({ toolCallId: resolvedId, ids: resolvedIds, reference, toolCallResult: { table: result.table, steps: result.steps, citationGrid: result.citationGrid }, highlightedText: reference, explanationSteps: cachedSteps, allCitationGrids: allGrids }, event as unknown as ReactMouseEvent);
    } else { handleCitationHover(null, event as unknown as ReactMouseEvent); }
  }, [allMessages, findToolCallResult, handleCitationHover, collectAllCitationGrids]);

  const onCitationClickAdapted = useCallback((toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    let resolvedId = toolCallId; let resolvedIds = ids;
    if (!toolCallId || toolCallId === "__manual__") { const p = parseReference(reference); if (p.toolCallId) resolvedId = p.toolCallId; if (p.ids.length > 0) resolvedIds = p.ids; }
    const result = findToolCallResult(resolvedId, allMessages);
    let cachedSteps: Step[] | undefined;
    for (const msg of allMessages) { if (msg.explanationMap?.[reference]) { cachedSteps = msg.explanationMap[reference]; break; } }
    if (result?.table && result?.steps) {
      const allGrids = collectAllCitationGrids(allMessages);
      handleCitationClick({ toolCallId: resolvedId, ids: resolvedIds, reference, toolCallResult: { table: result.table, steps: result.steps, citationGrid: result.citationGrid }, highlightedText: reference, explanationSteps: cachedSteps, allCitationGrids: allGrids }, event as unknown as ReactMouseEvent);
    }
  }, [allMessages, findToolCallResult, handleCitationClick, collectAllCitationGrids]);

  const onCitationLeaveAdapted = useCallback((event: ReactMouseEvent<HTMLSpanElement>) => {
    handleCitationHover(null, event as unknown as ReactMouseEvent);
  }, [handleCitationHover]);

  // ---- Error popup handlers — show referenceIds context + errorId highlighted in red ----
  const onErrorHoverAdapted = useCallback((toolCallId: string, ids: string[], errorId: string, referenceIds: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    if (isPinnedRef.current) return;
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    const result = findToolCallResult(toolCallId, allMessages);
    setPopupPosition({ x: event.clientX, y: event.clientY });
    // Use referenceIds as main reference (shows all context cells), errorId for red highlight
    const allIds = [...ids, ...parseReference(errorId).ids];
    const allGrids = collectAllCitationGrids(allMessages);
    if (result?.table && result?.steps) {
      const referencedCells = extractReferencedCells(result.table, allIds);
      setPopupData({ referencedCells, reference: referenceIds, highlightedText: referenceIds, table: result.table, steps: result.steps, citationGrid: result.citationGrid, allCitationGrids: allGrids, traceIds: { toolCallId, errorId, referenceIds, reference: referenceIds } });
    } else {
      setPopupData({ referencedCells: [], reference: referenceIds, highlightedText: referenceIds, table: null, steps: null, allCitationGrids: allGrids, reason: "No verification data available for this error.", traceIds: { toolCallId, errorId, referenceIds, reference: referenceIds } });
    }
    setShowPopup(true);
  }, [allMessages, findToolCallResult, collectAllCitationGrids]);

  const onErrorLeaveAdapted = useCallback((event: ReactMouseEvent<HTMLSpanElement>) => {
    handleCitationHover(null, event as unknown as ReactMouseEvent);
  }, [handleCitationHover]);

  const onErrorClickAdapted = useCallback((toolCallId: string, ids: string[], errorId: string, referenceIds: string, event: ReactMouseEvent<HTMLSpanElement>) => {
    isPinnedRef.current = true;
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    const result = findToolCallResult(toolCallId, allMessages);
    setPopupPosition({ x: event.clientX, y: event.clientY });
    const allIds = [...ids, ...parseReference(errorId).ids];
    const allGrids = collectAllCitationGrids(allMessages);
    if (result?.table && result?.steps) {
      const referencedCells = extractReferencedCells(result.table, allIds);
      setPopupData({ referencedCells, reference: referenceIds, highlightedText: referenceIds, table: result.table, steps: result.steps, citationGrid: result.citationGrid, allCitationGrids: allGrids, traceIds: { toolCallId, errorId, referenceIds, reference: referenceIds } });
    } else {
      setPopupData({ referencedCells: [], reference: referenceIds, highlightedText: referenceIds, table: null, steps: null, allCitationGrids: allGrids, reason: "No verification data available for this error.", traceIds: { toolCallId, errorId, referenceIds, reference: referenceIds } });
    }
    setShowPopup(true); setIsPinned(true);
  }, [allMessages, findToolCallResult, collectAllCitationGrids]);

  // ---- Submit ----
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draftText.trim() || isProcessing) return;

    setIsProcessing(true);
    setIsDone(false);
    setAnnotatedText(null);
    setAnnotatedCitations([]);
    setToolCalls([]);
    setAllMessages([]);
    abortControllerRef.current = new AbortController();

    const userMessage: Message = { id: Date.now().toString(), role: "user", parts: [{ type: "text", content: draftText }] };

    try {
      const response = await fetch("/api/fact-checking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: draftText }], agentSandboxId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error(`API Error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = (Date.now() + 1).toString();
      const parts: MessagePart[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as StreamChunk;
            if (chunk.type === "sandbox-info") { setAgentSandboxId(chunk.sandboxId); continue; }

            if (chunk.type === "text-delta") {
              const last = parts[parts.length - 1];
              if (last?.type === "text") { last.content += chunk.text || ""; }
              else { parts.push({ type: "text", content: chunk.text || "" }); }
              const currentText = parts.filter(p => p.type === "text").map(p => p.type === "text" ? p.content : "").join("");
              setAnnotatedText(currentText);
            }

            if (chunk.type === "tool-call" && chunk.toolName) {
              const existing = parts.find(p => p.type === "tool-call" && p.toolCall.toolCallId === chunk.toolCallId);
              if (!existing) {
                const tc: ToolCallType = { toolCallId: chunk.toolCallId, toolName: chunk.toolName, args: chunk.input || chunk.args || {} };
                parts.push({ type: "tool-call", toolCall: tc });
                setToolCalls(prev => [...prev, tc]);
              }
            }

            if (chunk.type === "tool-result") {
              const tp = parts.find(p => p.type === "tool-call" && p.toolCall.toolCallId === chunk.toolCallId);
              if (tp && tp.type === "tool-call") {
                tp.toolCall.result = chunk.output || chunk.result;
                setToolCalls(prev => prev.map(tc => tc.toolCallId === chunk.toolCallId ? { ...tc, result: tp.toolCall.result } : tc));
              }
            }
          } catch { /* skip malformed */ }
        }
      }

      // Final: parse citations from the annotated text
      const finalText = parts.filter(p => p.type === "text").map(p => p.type === "text" ? p.content : "").join("");
      const { content: parsedContent, citations } = parseCitations(finalText);
      const parsedParts = parts.map(part => {
        if (part.type === "text") return { type: "text" as const, content: parsedContent, citations };
        return part;
      });

      const assistantMsg: Message = { id: assistantId, role: "assistant", parts: parsedParts };
      const msgs = [userMessage, assistantMsg];
      const explanationMap = buildExplanationMap(parsedParts, msgs);
      const finalMsg = { ...assistantMsg, explanationMap };
      setAllMessages([userMessage, finalMsg]);
      setAnnotatedText(parsedContent);
      setAnnotatedCitations(citations);
      setIsDone(true);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Fact-check error:", error);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handlePageClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!isPinnedRef.current) return;
    if (popupRef.current?.contains(event.target as Node)) return;
    // Don't close if clicking on cited/error text (it will re-pin with new data)
    const target = event.target as HTMLElement;
    if (target.closest('.cited-text') || target.closest('[class*="decoration-red"]')) return;
    handleClosePopup();
  }, [handleClosePopup]);

  const hasErrors = annotatedText?.includes("<error") ?? false;
  const hasCitations = annotatedText?.includes("<cite") ?? false;

  return (
    <Tooltip.Provider>
      <form onSubmit={handleSubmit} className="w-full h-full border border-gray-200 shadow-md rounded-lg bg-gray-50 flex flex-col overflow-hidden" onClick={handlePageClick}>

        {/* Header */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2 h-12 shrink-0">
          <Bot size={16} className="text-gray-400" />
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex-1">
            AI Fact-Check Agent
          </h2>
          <DebugToggle mode="chat" />
        </div>

        {/* === TWO-COLUMN EDITOR === */}
        <div className="flex-1 grid grid-cols-2 gap-0 min-h-0 overflow-hidden">

          {/* LEFT: Draft textarea */}
          <div className="flex flex-col border-r border-gray-200 overflow-hidden relative">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
              <FileText size={12} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original</span>
              <span className="ml-auto text-[10px] text-gray-300 tabular-nums">{draftText.length} chars</span>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Paste your analysis or report here..."
              className="flex-1 w-full p-4 pb-14 text-xs text-gray-800 bg-white resize-none focus:outline-none leading-relaxed focus:ring-0"
              disabled={isProcessing}
            />
            {/* Floating fact-check button */}
            <div className="absolute bottom-3 right-3">
              <button
                type="submit"
                disabled={isProcessing || !draftText.trim()}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-medium disabled:bg-gray-200 disabled:cursor-not-allowed cursor-pointer hover:bg-black active:scale-95 transition-all shadow-sm"
              >
                {isProcessing ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Checking…</>
                ) : (
                  <><Search size={12} /> Fact-Check</>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Progress or annotated doc */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle size={12} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Annotated</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">

              {/* Empty state */}
              {!annotatedText && !isProcessing && (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                  <div className="text-center px-8">
                    <Bot size={32} className="mx-auto mb-3 text-gray-200" />
                    <p>Fact-checked results will appear here</p>
                  </div>
                </div>
              )}

              {/* Processing state */}
              {isProcessing && !annotatedText && (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                  <div className="text-center px-8">
                    <Bot size={32} className="mx-auto mb-3 text-gray-200" />
                    <div className="flex items-center gap-2">
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full" />
                      <p>{toolCalls.length > 0 ? getToolCallLabel(toolCalls[toolCalls.length - 1]) : "Analyzing claims..."}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming live preview while annotating */}
              {isProcessing && annotatedText && (
                <div className="text-xs leading-relaxed text-gray-800 opacity-80">
                  {chatDebugMode ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed overflow-x-auto">{annotatedText}</pre>
                  ) : (
                    <FactCheckMarkdownRenderer
                      content={annotatedText}
                      citations={annotatedCitations}
                      onCitationHover={onCitationHoverAdapted}
                      onCitationLeave={onCitationLeaveAdapted}
                      onCitationClick={onCitationClickAdapted}
                      activeCitationReference={activeCitationReference}
                      onErrorHover={onErrorHoverAdapted}
                      onErrorLeave={onErrorLeaveAdapted}
                      onErrorClick={onErrorClickAdapted}
                    />
                  )}
                </div>
              )}

              {/* Final annotated document */}
              {!isProcessing && annotatedText && (
                <div className="text-xs leading-relaxed text-gray-800">
                  {chatDebugMode ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed overflow-x-auto">{annotatedText}</pre>
                  ) : (
                    <FactCheckMarkdownRenderer
                      content={annotatedText}
                      citations={annotatedCitations}
                      onCitationHover={onCitationHoverAdapted}
                      onCitationLeave={onCitationLeaveAdapted}
                      onCitationClick={onCitationClickAdapted}
                      activeCitationReference={activeCitationReference}
                      onErrorHover={onErrorHoverAdapted}
                      onErrorLeave={onErrorLeaveAdapted}
                      onErrorClick={onErrorClickAdapted}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === BOTTOM STATUS STRIP === */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-1.5 flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0">
          {isProcessing && toolCalls.length > 0 && (
            <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            <span>{getToolCallLabel(toolCalls[toolCalls.length - 1])}</span></>
          )}
          {isProcessing && toolCalls.length === 0 && (
            <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            <span>Analyzing claims...</span></>
          )}
          {!isProcessing && isDone && annotatedText && (
            <><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <span className="text-green-600 font-medium">Fact-check complete</span></>
          )}
          {!isProcessing && !isDone && <span>Ready — paste text and click Fact-Check</span>}
        </div>

      </form>

      <ExplanationPopup
        isOpen={showPopup}
        popupData={popupData}
        position={popupPosition}
        isPinned={isPinned}
        onClose={handleClosePopup}
        onPin={handlePinPopup}
        onMouseEnter={handlePopupMouseEnter}
        onMouseLeave={handlePopupMouseLeave}
        ref={popupRef}
      />
    </Tooltip.Provider>
  );
}
