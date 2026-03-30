"use client";

import { createContext, useContext, ReactNode } from "react";

// Context for highlight IDs in step components (render-time highlighting)
const HighlightIdsContext = createContext<Set<string>>(new Set());

// Context for error IDs — highlighted in red to show proof of inconsistency
const ErrorIdsContext = createContext<Set<string>>(new Set());

// Context for comparison error IDs — used by ComparisonStep for derived errorId highlighting
const ComparisonErrorIdsContext = createContext<Set<string>>(new Set());

interface HighlightIdsProviderProps {
  highlightIds: string[];
  errorIds?: string[];
  comparisonErrorIds?: string[];
  children: ReactNode;
}

export function HighlightIdsProvider({ highlightIds, errorIds, comparisonErrorIds, children }: HighlightIdsProviderProps) {
  const highlightIdSet = new Set(highlightIds);
  const errorIdSet = new Set(errorIds ?? []);
  const comparisonErrorIdSet = new Set(comparisonErrorIds ?? []);
  return (
    <HighlightIdsContext.Provider value={highlightIdSet}>
      <ErrorIdsContext.Provider value={errorIdSet}>
        <ComparisonErrorIdsContext.Provider value={comparisonErrorIdSet}>
          {children}
        </ComparisonErrorIdsContext.Provider>
      </ErrorIdsContext.Provider>
    </HighlightIdsContext.Provider>
  );
}

/**
 * Hook to access highlight IDs for cited entity highlighting.
 * Returns a Set of IDs that should be visually highlighted.
 */
export function useHighlightIds(): Set<string> {
  return useContext(HighlightIdsContext);
}

/**
 * Hook to access error IDs for error entity highlighting (red).
 * Returns a Set of IDs that should be highlighted in red.
 */
export function useErrorIds(): Set<string> {
  return useContext(ErrorIdsContext);
}

/**
 * Hook to access comparison error IDs for derived errorId highlighting.
 * Used by ComparisonStep to highlight values/result when errorId is a derived expression.
 */
export function useComparisonErrorIds(): Set<string> {
  return useContext(ComparisonErrorIdsContext);
}
