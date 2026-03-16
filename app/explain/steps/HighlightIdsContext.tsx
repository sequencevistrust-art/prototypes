"use client";

import { createContext, useContext, ReactNode } from "react";

// Context for highlight IDs in step components (render-time highlighting)
const HighlightIdsContext = createContext<Set<string>>(new Set());

// Context for error IDs — highlighted in red to show proof of inconsistency
const ErrorIdsContext = createContext<Set<string>>(new Set());

interface HighlightIdsProviderProps {
  highlightIds: string[];
  errorIds?: string[];
  children: ReactNode;
}

export function HighlightIdsProvider({ highlightIds, errorIds, children }: HighlightIdsProviderProps) {
  const highlightIdSet = new Set(highlightIds);
  const errorIdSet = new Set(errorIds ?? []);
  return (
    <HighlightIdsContext.Provider value={highlightIdSet}>
      <ErrorIdsContext.Provider value={errorIdSet}>
        {children}
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
