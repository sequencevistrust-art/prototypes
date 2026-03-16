"use client";

import React, { MouseEvent as ReactMouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import CitedText from "./cited-text";
import { Citation } from "./chat-types";
import { preprocessContent, parseReference } from "./chat-utils";

interface MarkdownRendererProps {
  content: string;
  citations: Citation[] | undefined;
  role: "user" | "assistant";
  onCitationHover: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationLeave: (event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationClick: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  activeCitationReference: string | null;
}

/**
 * Manual citations (from user highlight + Add Citation) — same visual style as CitedText,
 * but triggers the shared ExplanationPopup via the existing callbacks.
 */
function ManualCitedText({
  reference,
  onCitationHover,
  onCitationLeave,
  onCitationClick,
  isActive,
  children,
}: {
  reference: string;
  onCitationHover: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationLeave: (event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationClick: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      data-reference={reference}
      className={`cited-text select-text cursor-pointer border-b-2 border-dotted transition-colors px-0.5 rounded ${
        isActive
          ? "bg-blue-200 border-blue-600"
          : "bg-blue-50 border-blue-400 hover:bg-blue-100"
      }`}
      onMouseEnter={(e) => onCitationHover("__manual__", [], reference, e)}
      onMouseLeave={(e) => onCitationLeave(e)}
      onClick={(e) => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && (sel.toString().trim().length > 0)) return;
        onCitationClick("__manual__", [], reference, e);
      }}
    >
      {children}
    </span>
  );
}

/**
 * Render markdown text with citations highlighted.
 * Wrapped in React.memo to prevent re-renders from parent state changes
 * (e.g. text selection) that would destroy DOM nodes and clear browser selection.
 */
function MarkdownRenderer({
  content,
  citations,
  role,
  onCitationHover,
  onCitationLeave,
  onCitationClick,
  activeCitationReference,
}: MarkdownRendererProps) {
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
        mark: ({ children }) => (
          <mark className="bg-transparent border-b-2 border-blue-400 rounded-none px-0 not-italic">{children}</mark>
        ),
        cite: ({ node, referenceids, children }: React.HTMLAttributes<HTMLElement> & { node?: unknown; referenceids?: string }) => {
          const reference = referenceids;
          const citation = reference ? citationMap.get(reference) : undefined;
          // Check whether this citation has a real tool-call source
          const { toolCallId } = reference ? parseReference(reference) : { toolCallId: null };

          if (citation && toolCallId) {
            // Tool-call-sourced citation: use CitedText with full data popup
            return (
              <CitedText
                citation={citation}
                onCitationHover={onCitationHover}
                onCitationLeave={onCitationLeave}
                onCitationClick={onCitationClick}
                isActive={activeCitationReference === citation.reference}
              >
                {children}
              </CitedText>
            );
          }

          // Manually-added citation: show reason tooltip on hover
          // reason comes from the HTML attribute (passed via rehype-raw), or from the stored citation
          return (
            <ManualCitedText
              reference={reference ?? ""}
              onCitationHover={onCitationHover}
              onCitationLeave={onCitationLeave}
              onCitationClick={onCitationClick}
              isActive={activeCitationReference === reference}
            >
              {children}
            </ManualCitedText>
          );
        },
      }}
    >
      {preprocessContent(content)}
    </ReactMarkdown>
  );
}

/**
 * Custom comparison: only re-render when content, citations, role, or active
 * citation actually change. Ignore callback prop identity changes that come
 * from parent re-renders (e.g. selection state updates) — those would destroy
 * DOM nodes and break the browser's native text selection / Ctrl+C.
 */
export default React.memo(MarkdownRenderer, (prev, next) => {
  return prev.content === next.content
    && prev.role === next.role
    && prev.activeCitationReference === next.activeCitationReference
    && prev.citations === next.citations;
});
