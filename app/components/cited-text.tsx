"use client";

import { MouseEvent as ReactMouseEvent } from "react";
import { Citation } from "../utils/citations";
import { parseReference } from "../utils/citations";

interface CitedTextProps {
  citation: Citation;
  children: React.ReactNode;
  onCitationHover: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationLeave: (event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationClick: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  isActive: boolean;
}

/**
 * Component to render a cited piece of text with hover and click handling
 */
export default function CitedText({
  citation,
  children,
  onCitationHover,
  onCitationLeave,
  onCitationClick,
  isActive,
}: CitedTextProps) {
  const handleMouseEnter = (e: ReactMouseEvent<HTMLSpanElement>) => {
    const { ids, toolCallId } = parseReference(citation.reference);

    if (!toolCallId) {
      console.warn("Invalid reference format:", citation.reference);
      return;
    }

    onCitationHover(toolCallId, ids, citation.reference, e);
  };

  const handleMouseLeave = (e: ReactMouseEvent<HTMLSpanElement>) => {
    onCitationLeave(e);
  };

  // Use click (not mousedown) so drag-to-select works on cited text
  const handleClick = (e: ReactMouseEvent<HTMLSpanElement>) => {
    // If there's an active text selection, don't trigger citation click — let user copy
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && (sel.toString().trim().length > 0)) return;

    const { ids, toolCallId } = parseReference(citation.reference);

    if (!toolCallId) {
      console.warn("Invalid reference format:", citation.reference);
      return;
    }

    onCitationClick(toolCallId, ids, citation.reference, e);
  };

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-reference={citation.reference}
      className={`cited-text select-text cursor-pointer border-b-2 border-dotted transition-colors px-0.5 rounded ${
        isActive
          ? "bg-blue-200 border-blue-600"
          : "bg-blue-50 border-blue-400 hover:bg-blue-100"
      }`}
    >
      {children}
    </span>
  );
}
