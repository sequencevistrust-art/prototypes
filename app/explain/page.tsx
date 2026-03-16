"use client";

import { useState, useRef, MouseEvent as ReactMouseEvent, useCallback } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import ExplainChatPane, { CitationHoverData, ExplainChatPaneRef } from "./chat-pane";
import ExplanationPopup from "./explanation-popup";
import { extractReferencedCells, ReferencedCell } from "../utils/extractReferencedCells";
import { Table, OperationWithId } from "../types/sandbox";
import { Step } from "./steps";
import { CitationGrid } from "../types/citation";

interface PopupData {
  referencedCells: ReferencedCell[];
  reference: string;
  highlightedText: string;
  table: Table | null;
  steps: OperationWithId[] | null;
  citationGrid?: CitationGrid;
  explanationSteps?: Step[];
  reason?: string;
}

export default function ExplainPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const isPinnedRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const chatPaneRef = useRef<ExplainChatPaneRef>(null);

  const handleCitationHover = useCallback((data: CitationHoverData | null, event: ReactMouseEvent) => {
    if (isPinnedRef.current) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!data) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowPopup(false);
        setPopupData(null);
      }, 150);
      return;
    }

    setPopupPosition({ x: event.clientX, y: event.clientY });

    if (!data.toolCallResult) {
      setPopupData({
        referencedCells: [],
        reference: data.reference,
        highlightedText: data.highlightedText,
        table: null,
        steps: null,
        reason: data.reason,
      });
      setShowPopup(true);
      return;
    }

    const referencedCells = extractReferencedCells(data.toolCallResult.table, data.ids);
    setPopupData({
      referencedCells,
      reference: data.reference,
      highlightedText: data.highlightedText,
      table: data.toolCallResult.table,
      steps: data.toolCallResult.steps,
      citationGrid: data.toolCallResult.citationGrid,
      explanationSteps: data.explanationSteps,
    });
    setShowPopup(true);
  }, []);

  const handleCitationClick = useCallback((data: CitationHoverData, event: ReactMouseEvent) => {
    isPinnedRef.current = true;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    setPopupPosition({ x: event.clientX, y: event.clientY });

    if (!data.toolCallResult) {
      setPopupData({
        referencedCells: [],
        reference: data.reference,
        highlightedText: data.highlightedText,
        table: null,
        steps: null,
        reason: data.reason,
      });
      setShowPopup(true);
      setIsPinned(true);
      return;
    }

    const referencedCells = extractReferencedCells(data.toolCallResult.table, data.ids);
    setPopupData({
      referencedCells,
      reference: data.reference,
      highlightedText: data.highlightedText,
      table: data.toolCallResult.table,
      steps: data.toolCallResult.steps,
      citationGrid: data.toolCallResult.citationGrid,
      explanationSteps: data.explanationSteps,
    });
    setShowPopup(true);
    setIsPinned(true);
  }, []);

  const handlePopupMouseEnter = useCallback(() => {
    if (isPinnedRef.current) return;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    if (isPinnedRef.current) return;

    hideTimeoutRef.current = setTimeout(() => {
      setShowPopup(false);
      setPopupData(null);
    }, 150);
  }, []);

  const handleClosePopup = useCallback(() => {
    isPinnedRef.current = false;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowPopup(false);
    setPopupData(null);
    setIsPinned(false);
    chatPaneRef.current?.clearActiveCitation();
  }, []);

  const handlePinPopup = useCallback(() => {
    isPinnedRef.current = true;

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsPinned(true);
  }, []);

  const handlePageClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isPinnedRef.current) return;
    if (popupRef.current && popupRef.current.contains(event.target as Node)) return;
    // Don't close if the click was on a cited text element (it will re-pin with new data)
    const target = event.target as HTMLElement;
    if (target.closest('.cited-text')) return;
    handleClosePopup();
  }, [handleClosePopup]);

  return (
    <Tooltip.Provider>
        <div className="h-screen w-screen bg-gray-100 p-4" onClick={handlePageClick}>
        <div className="h-full max-w-4xl mx-auto">
          <ExplainChatPane ref={chatPaneRef} onCitationHover={handleCitationHover} onCitationClick={handleCitationClick} />
        </div>

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
      </div>
    </Tooltip.Provider>
  );
}
