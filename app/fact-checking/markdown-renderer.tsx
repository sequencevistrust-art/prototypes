import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import CitedText from "../components/cited-text";
import { Citation } from "../utils/citations";
import { parseReference } from "../utils/citations";
import { MouseEvent as ReactMouseEvent } from "react";

interface FactCheckMarkdownRendererProps {
  content: string;
  citations?: Citation[];
  onCitationHover?: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationLeave?: (event: ReactMouseEvent<HTMLSpanElement>) => void;
  onCitationClick?: (toolCallId: string, ids: string[], reference: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  activeCitationReference?: string | null;
  onErrorHover?: (toolCallId: string, ids: string[], errorId: string, referenceIds: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
  onErrorLeave?: (event: ReactMouseEvent<HTMLSpanElement>) => void;
  onErrorClick?: (toolCallId: string, ids: string[], errorId: string, referenceIds: string, event: ReactMouseEvent<HTMLSpanElement>) => void;
}

export function FactCheckMarkdownRenderer({
  content,
  citations,
  onCitationHover,
  onCitationLeave,
  onCitationClick,
  activeCitationReference,
  onErrorHover,
  onErrorLeave,
  onErrorClick,
}: FactCheckMarkdownRendererProps) {
  const citationMap = new Map<string, Citation>();
  citations?.forEach((c) => citationMap.set(c.reference, c));

  const markdownComponents = {
        // Correct values: blue underline with provenance popup
        cite: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
          const reference = (props.referenceids as string | undefined) ?? "";
          const citation = citationMap.get(reference);
          const { toolCallId } = parseReference(reference);

          if (citation && toolCallId && onCitationHover && onCitationLeave && onCitationClick) {
            return (
              <CitedText
                citation={citation}
                onCitationHover={onCitationHover}
                onCitationLeave={onCitationLeave}
                onCitationClick={onCitationClick}
                isActive={activeCitationReference === reference}
              >
                {children}
              </CitedText>
            );
          }
          return (
            <span className="bg-blue-50 border-b-2 border-dotted border-blue-400 px-0.5 rounded text-gray-800 cursor-default">
              {children}
            </span>
          );
        },

        // Wrong values: red wavy underline — hover/click opens proof popup via errorId
        error: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
          // HTML lowercases attribute names: referenceIds → referenceids, errorId → errorid
          const referenceIds = (props.referenceids as string | undefined) ?? "";
          const errorId = (props.errorid as string | undefined) ?? "";
          // Parse from referenceIds for context cells; errorId is passed separately for red highlighting
          const { toolCallId: rawId, ids } = parseReference(referenceIds || errorId);
          const toolCallId = rawId ?? "";
          return (
            <span
              className="underline decoration-red-500 decoration-wavy decoration-[1.5px] bg-red-50/50 text-gray-800 cursor-help px-0.5 rounded transition-colors hover:bg-red-100 inline-block"
              onMouseEnter={(e) => onErrorHover?.(toolCallId, ids, errorId, referenceIds, e as unknown as ReactMouseEvent<HTMLSpanElement>)}
              onMouseLeave={(e) => onErrorLeave?.(e as unknown as ReactMouseEvent<HTMLSpanElement>)}
              onClick={(e) => onErrorClick?.(toolCallId, ids, errorId, referenceIds, e as unknown as ReactMouseEvent<HTMLSpanElement>)}
            >
              {children}
            </span>
          );
        },

        p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}


