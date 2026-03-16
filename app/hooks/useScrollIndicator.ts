"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseScrollIndicatorOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  scrollAmount?: number; // Amount to scroll when clicking indicator
  contentKey?: string | number | null; // Key that changes when content changes, triggering re-check
}

interface UseScrollIndicatorResult {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  canScrollDown: boolean;
  handleScrollDown: () => void;
}

export default function useScrollIndicator(
  isActive: boolean,
  options: UseScrollIndicatorOptions = {}
): UseScrollIndicatorResult {
  const { threshold = 10, scrollAmount = 100, contentKey } = options;

  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if content is scrollable and not at bottom
  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrollable = scrollHeight > clientHeight;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    setCanScrollDown(isScrollable && !isAtBottom);
  }, [threshold]);

  // Scroll down when clicking the indicator
  const handleScrollDown = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  }, [scrollAmount]);

  // Set up scroll listener and initial check
  useEffect(() => {
    if (!isActive) {
      setCanScrollDown(false);
      return;
    }

    // Reset scroll position and state when content changes
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = 0;
    }
    setCanScrollDown(false);

    // Check after a short delay to ensure content is rendered
    const timer = setTimeout(checkScrollability, 100);

    if (container) {
      container.addEventListener('scroll', checkScrollability);
    }

    return () => {
      clearTimeout(timer);
      if (container) {
        container.removeEventListener('scroll', checkScrollability);
      }
    };
  }, [isActive, contentKey, checkScrollability]);

  return {
    scrollContainerRef,
    canScrollDown,
    handleScrollDown,
  };
}
