"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { X, RefreshCw, ChevronLeft, ChevronRight, List, Shuffle } from "lucide-react";
import { useUiStore } from "../../store/ui-store";
import { useSandboxStore } from "../../store/sandbox-store";
import { EventSequence, RecordAttributes, Event } from "../../types/sandbox";
import { EventAttribute } from "../../types/operations";
import PatternPill from "../visualizations/pattern-pill";
import AttributePill from "../visualizations/attribute-pill";
import AppliedFiltersList from "../visualizations/applied-filters-list";

interface SegmentWithAttributes {
  sequence: EventSequence;
  recordAttribute: RecordAttributes;
}

/**
 * Check if an event matches a pattern element
 */
function eventMatchesPatternElement(
  event: Event,
  patternElement: EventAttribute
): boolean {
  const eventValue = event[patternElement.attribute];
  const matches = String(eventValue) === patternElement.value;
  // If we're looking for a match to highlight, we only return true if it's NOT negated
  // because we only highlight positive matches. 
  // But for the matching logic itself, we need to know if it satisfies the condition.
  return patternElement.negated ? !matches : matches;
}

export default function DrilldownView() {
  const { drilldownRowIndex, setDrilldownRowIndex } = useUiStore();
  const { sandboxId, table } = useSandboxStore();
  
  const [mode, setMode] = useState<"all" | "sample">("sample");
  const [segments, setSegments] = useState<SegmentWithAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);

  const rowHeader = useMemo(() => {
    return drilldownRowIndex !== null ? table?.rows[drilldownRowIndex]?.rowHeader : null;
  }, [table, drilldownRowIndex]);

  const fetchSampled = useCallback(async () => {
    if (sandboxId === null || drilldownRowIndex === null) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/sandbox/get-sampled-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandboxId,
          rowIndex: drilldownRowIndex,
          sampleSize: 10,
        }),
      });
      const data = await response.json();
      if (data.segments) {
        setSegments(data.segments);
        setTotalCount(data.totalCount);
      }
    } catch (error) {
      console.error("Error fetching sampled segments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sandboxId, drilldownRowIndex]);

  const fetchPaginated = useCallback(async (pageNum: number) => {
    if (sandboxId === null || drilldownRowIndex === null) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/sandbox/get-paginated-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandboxId,
          rowIndex: drilldownRowIndex,
          offset: pageNum * pageSize,
          size: pageSize,
        }),
      });
      const data = await response.json();
      if (data.segments) {
        setSegments(data.segments);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setPage(data.currentPage);
      }
    } catch (error) {
      console.error("Error fetching paginated segments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sandboxId, drilldownRowIndex, pageSize]);

  useEffect(() => {
    if (drilldownRowIndex !== null) {
      if (mode === "sample") {
        fetchSampled();
      } else {
        fetchPaginated(0);
      }
    } else {
      setSegments([]);
    }
  }, [drilldownRowIndex, mode, fetchSampled, fetchPaginated]);

  if (drilldownRowIndex === null) return null;

  // Helper to calculate match positions and negated segments for patterns
  const getMatchInfo = (sequence: EventSequence, pattern: EventAttribute[]) => {
    if (!pattern || pattern.length === 0) return null;

    // Group pattern elements: each segment is a positive element and its preceding negations
    const patternSegments: { negs: EventAttribute[], pos: EventAttribute }[] = [];
    let currentNegs: EventAttribute[] = [];

    for (const pElem of pattern) {
      if (pElem.negated) {
        currentNegs.push(pElem);
      } else {
        patternSegments.push({ negs: currentNegs, pos: pElem });
        currentNegs = [];
      }
    }

    // Store any trailing negations (pattern ends with negated elements)
    const trailingNegs = currentNegs;

    const matches: { eventIndex: number; patternElement: EventAttribute }[] = [];
    const negatedSegments: { startIdx: number; endIdx: number; negated: EventAttribute[]; isTrailing?: boolean }[] = [];
    let lastEventIdx = -1;

    // Greedy match for positive elements, respecting gap constraints
    for (const seg of patternSegments) {
      let found = false;
      for (let i = lastEventIdx + 1; i < sequence.events.length; i++) {
        // Try matching the current positive element at index i
        if (eventMatchesPatternElement(sequence.events[i], seg.pos)) {
          // If it matches, check if all negations in the gap (lastEventIdx + 1 to i - 1) are satisfied
          let negsSatisfied = true;
          for (let k = lastEventIdx + 1; k < i; k++) {
            for (const neg of seg.negs) {
              if (!eventMatchesPatternElement(sequence.events[k], neg)) {
                negsSatisfied = false;
                break;
              }
            }
            if (!negsSatisfied) break;
          }

          if (negsSatisfied) {
            // If satisfied by gap events, record match and any negation segment for visualization
            if (seg.negs.length > 0 && lastEventIdx !== -1) {
              negatedSegments.push({
                startIdx: lastEventIdx,
                endIdx: i,
                negated: seg.negs
              });
            }
            matches.push({ eventIndex: i, patternElement: seg.pos });
            lastEventIdx = i;
            found = true;
            break;
          }
        }
      }
      if (!found) return null; // No valid match found for this positive element
    }

    // Handle trailing negations: these apply from the last match to the end of the sequence
    if (trailingNegs.length > 0 && lastEventIdx !== -1) {
      negatedSegments.push({
        startIdx: lastEventIdx,
        endIdx: sequence.events.length - 1,
        negated: trailingNegs,
        isTrailing: true
      });
    }

    return { matches, negatedSegments };
  };

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col gap-1.5 items-start">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filters Applied</span>
          <div className="flex flex-col gap-2 items-start">
            {rowHeader?.appliedFilters && rowHeader.appliedFilters.length > 0 && (
              <AppliedFiltersList filters={rowHeader.appliedFilters} align="left" />
            )}
            
            {rowHeader?.type === "pattern" && (
              <PatternPill pattern={rowHeader.pattern} align="left" />
            )}

            {rowHeader?.type === "record-attribute" && (
              <AttributePill 
                name={rowHeader.recordAttribute.name} 
                value={rowHeader.recordAttribute.type === "categorical" 
                  ? rowHeader.recordAttribute.value || "All"
                  : rowHeader.recordAttribute.value ? `${rowHeader.recordAttribute.value.min}-${rowHeader.recordAttribute.value.max}` : "Any"
                } 
              />
            )}

            {(!rowHeader?.appliedFilters || rowHeader.appliedFilters.length === 0) && 
             rowHeader?.type !== "pattern" && 
             rowHeader?.type !== "record-attribute" && (
              <div className="flex items-center px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded bg-gray-100 text-gray-900 shadow-sm">
                <span className="uppercase tracking-widest text-[10px]">None</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode Switcher */}
          <div className="flex items-center bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setMode("sample")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                mode === "sample"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Shuffle size={14} />
              Sample
            </button>
            <button
              onClick={() => setMode("all")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                mode === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List size={14} />
              All
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Controls based on mode */}
          {mode === "sample" ? (
            <button
              onClick={fetchSampled}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span className="text-xs font-medium">Refresh Sample</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPaginated(page - 1)}
                  disabled={isLoading || page === 0}
                  className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => fetchPaginated(page + 1)}
                  disabled={isLoading || page >= totalPages - 1}
                  className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setDrilldownRowIndex(null)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        {isLoading && segments.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 text-sm font-medium">Loading sequences...</p>
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No sequences found
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-6">
            {segments.map((item, idx) => {
              const matchInfo = rowHeader?.type === "pattern" 
                ? getMatchInfo(item.sequence, rowHeader.pattern) 
                : null;
              
              return (
                <div 
                  key={`${item.sequence.sessionId}-${idx}`}
                  className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[120px]"
                >
                  {/* Record Attributes Side */}
                  <div className="w-64 bg-gray-50/80 border-r border-gray-200 p-4 shrink-0 overflow-y-auto max-h-[400px]">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3">
                      Record Attributes
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(item.recordAttribute).map(([key, value]) => {
                        const isHighlighted = rowHeader?.type === "record-attribute" && 
                          rowHeader.recordAttribute.name === key && 
                          (rowHeader.recordAttribute.type === "categorical" 
                            ? String(value) === rowHeader.recordAttribute.value
                            : (rowHeader.recordAttribute.value ? 
                                (Number(value) >= rowHeader.recordAttribute.value.min && Number(value) <= rowHeader.recordAttribute.value.max) :
                                false));

                        return (
                          <div 
                            key={key} 
                            className={`flex flex-col rounded p-1.5 transition-colors ${isHighlighted ? "bg-blue-100 shadow-sm my-1" : ""}`}
                          >
                            <span className={`text-[9px] font-medium uppercase tracking-tighter truncate ${isHighlighted ? "text-blue-700" : "text-gray-400"}`} title={key}>
                              {key}
                            </span>
                            <span className={`text-[10px] font-mono break-all leading-tight ${isHighlighted ? "text-blue-900 font-bold" : "text-gray-700"}`}>
                              {String(value === null || value === undefined || value === "" ? "-" : value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                                  {/* Events Side */}
                                  <div className="flex-1 p-4 overflow-x-auto relative flex flex-col min-h-0">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-3 shrink-0">
                                      Event Sequence ({item.sequence.events.length} events)
                                    </div>
                                    
                                    <div className="flex-1 flex items-center relative">
                                      {/* Pattern line background - only if there are negated elements */}
                                      {matchInfo && rowHeader?.type === "pattern" && matchInfo.negatedSegments.map((seg, sIdx) => {
                                        // For trailing negations, extend the line to the right edge with minimum width
                                        const isTrailing = seg.isTrailing;
                                        const lineLeft = seg.startIdx * 232 + 192;
                                        // For trailing segments, ensure minimum width of 100px or extend to remaining events
                                        const lineWidth = isTrailing
                                          ? Math.max(100, (seg.endIdx - seg.startIdx) * 232 + 40)
                                          : (seg.endIdx - seg.startIdx) * 232 - 192;

                                        return (
                                          <div
                                            key={sIdx}
                                            className={`absolute h-0.5 top-6 z-0 transition-all ${isTrailing ? "bg-blue-400" : "bg-blue-400"}`}
                                            style={{
                                              left: `${lineLeft}px`,
                                              width: `${Math.max(lineWidth, 60)}px`
                                            }}
                                          >
                                            {/* Arrow indicator for trailing negations */}
                                            {isTrailing && (
                                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-blue-400" />
                                            )}
                                            {/* Show negated patterns centered on the line */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                                              {seg.negated.map((p, i) => (
                                                <div key={i} className="bg-blue-100 rounded px-2 py-1 flex flex-col shadow-sm whitespace-nowrap min-w-[60px] border border-blue-200">
                                                  <span className="text-[8px] font-medium uppercase tracking-tighter text-blue-700">{p.attribute}</span>
                                                  <span className="text-[10px] font-mono font-bold text-blue-900 leading-tight flex items-center">
                                                    <span className="text-red-500 mr-1">X</span> {p.value}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                  
                                      <div className="flex items-center gap-3 relative z-10">
                                        {item.sequence.events.map((event, eventIdx) => {
                                          const matchedElem = matchInfo?.matches.find(m => m.eventIndex === eventIdx);
                                          const isMatchedEvent = !!matchedElem;
                  
                                          return (
                                            <Fragment key={eventIdx}>
                                              <div className={`shrink-0 flex flex-col p-3 bg-white border rounded-lg shadow-sm w-48 transition-all group/event ${isMatchedEvent ? "border-blue-500 ring-2 ring-blue-500/20 shadow-blue-100" : "border-gray-200"}`}>
                                                {/* Attributes List - Scrollable */}
                                                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar flex-1 mb-2">
                                                  {Object.entries(event)
                                                    .filter(([key]) => !["sessionId", "eventId", "timestamp"].includes(key))
                                                    .map(([key, value]) => {
                                                      const isAttrMatched = isMatchedEvent && matchedElem.patternElement.attribute === key && String(value) === matchedElem.patternElement.value;
                                                      
                                                      return (
                                                        <div key={key} className={`flex flex-col rounded p-1 transition-colors ${isAttrMatched ? "bg-blue-100 my-0.5" : ""}`}>
                                                          <span className={`text-[9px] font-medium uppercase tracking-tighter truncate ${isAttrMatched ? "text-blue-700" : "text-gray-400"}`} title={key}>
                                                            {key}
                                                          </span>
                                                          <span className={`text-[10px] font-mono break-all leading-tight ${isAttrMatched ? "text-blue-900 font-bold" : "text-gray-700"}`}>
                                                            {String(value || "—")}
                                                          </span>
                                                        </div>
                                                      );
                                                    })}
                                                </div>
                                                
                                                {/* Timestamp - Fixed at bottom */}
                                                <div className="flex flex-col pt-1 border-t border-gray-50 shrink-0">
                                                  <span className="text-[9px] text-gray-300 font-medium uppercase tracking-tighter">
                                                    Timestamp
                                                  </span>
                                                  <span className="text-[9px] text-gray-400 font-mono break-all leading-tight">
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                  </span>
                                                </div>
                                              </div>
                                              {eventIdx < item.sequence.events.length - 1 && (
                                                <div className="flex items-center justify-center shrink-0">
                                                  <ChevronRight size={16} className="text-gray-300" />
                                                </div>
                                              )}
                                            </Fragment>
                                          );
                                        })}
                                        {/* Spacer to ensure right padding is visible when scrolling */}
                                        <div className="w-1 shrink-0" aria-hidden="true" />
                                      </div>
                                    </div>
                                  </div>                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer / Scroll info */}
      <div className="px-6 py-3 border-t border-gray-200 bg-white flex justify-between items-center text-[10px] text-gray-400 font-medium">
        <span>SCROLL HORIZONTALLY TO SEE FULL SEQUENCES • SCROLL VERTICALLY FOR MORE SESSIONS</span>
        {mode === "all" && (
          <span>SHOWING {segments.length} OF {totalCount} SEQUENCES</span>
        )}
      </div>
    </div>
  );
}