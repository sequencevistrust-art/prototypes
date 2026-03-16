"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { useMetadata } from "../../context/metadata-context";
import EventValueSelector from "./event-value-selector";
import TooltipWrapper from "../../explain/tooltip-wrapper";

interface PatternEvent {
  attribute: string;
  value: string;
  negated: boolean;
}

export interface PatternEditorData {
  attribute: string;
  events: PatternEvent[];
  segmentStart: number | null;
  segmentEnd: number | null;
}

interface PatternEditorProps {
  onCancel: () => void;
  onConfirm: (data: PatternEditorData) => void;
  disableNegation?: boolean;
  disableSegmentation?: boolean;
  initialAttribute?: string;
  initialEvents?: PatternEvent[];
  initialSegmentStart?: number | null;
  initialSegmentEnd?: number | null;
}

export default function PatternEditor({
  onCancel,
  onConfirm,
  disableNegation = false,
  disableSegmentation = false,
  initialAttribute = "",
  initialEvents = [],
  initialSegmentStart = null,
  initialSegmentEnd = null,
}: PatternEditorProps) {
  const { metadata, loading } = useMetadata();
  const [selectedAttribute, setSelectedAttribute] = useState(initialAttribute);
  const [events, setEvents] = useState<PatternEvent[]>(initialEvents);
  const [showValueSelector, setShowValueSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState<number | null>(null);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

  // Segment state - used in both modes now
  const [segmentStart, setSegmentStart] = useState<number | null>(initialSegmentStart);
  const [segmentEnd, setSegmentEnd] = useState<number | null>(initialSegmentEnd);
  // Track whether virtual start/end are selected (null index but explicitly selected)
  const [segmentStartIsVirtual, setSegmentStartIsVirtual] = useState(initialSegmentStart === null && initialSegmentEnd !== null);
  const [segmentEndIsVirtual, setSegmentEndIsVirtual] = useState(initialSegmentEnd === null && initialSegmentStart !== null);

  // Track which event is being hovered (for showing action buttons)
  // Can be event index (0+), VIRTUAL_START (-1), or VIRTUAL_END (-2)
  const [hoveredEventIndex, setHoveredEventIndex] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to the newly added event
  useEffect(() => {
    if (lastAddedIndex !== null && eventRefs.current[lastAddedIndex]) {
      eventRefs.current[lastAddedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setLastAddedIndex(null);
    }
  }, [lastAddedIndex]);

  const handleAddEvent = (position: number) => {
    if (!selectedAttribute) return;

    // Toggle: if clicking the same position, close the selector
    if (selectorPosition === position && showValueSelector) {
      setShowValueSelector(false);
      setSelectorPosition(null);
    } else {
      setSelectorPosition(position);
      setShowValueSelector(true);
    }
  };

  const handleSelectValue = (value: string) => {
    if (selectorPosition === null || !selectedAttribute) return;

    const newEvent: PatternEvent = {
      attribute: selectedAttribute,
      value,
      negated: false,
    };

    const newEvents = [...events];
    newEvents.splice(selectorPosition, 0, newEvent);
    setEvents(newEvents);
    setLastAddedIndex(selectorPosition);
    setShowValueSelector(false);
    setSelectorPosition(null);

    // Adjust segment indices if needed
    if (segmentStart !== null && selectorPosition <= segmentStart) {
      setSegmentStart(segmentStart + 1);
    }
    if (segmentEnd !== null && selectorPosition <= segmentEnd) {
      setSegmentEnd(segmentEnd + 1);
    }
  };

  // Special indices for virtual start/end markers
  const VIRTUAL_START = -1;
  const VIRTUAL_END = -2;

  const handleVirtualMarkerClick = (index: number) => {
    // Handle virtual start/end marker clicks
    if (index === VIRTUAL_START) {
      if (segmentStartIsVirtual) {
        // Toggle off virtual start
        setSegmentStartIsVirtual(false);
      } else {
        // Set virtual start (clear any real start)
        setSegmentStart(null);
        setSegmentStartIsVirtual(true);
      }
    } else if (index === VIRTUAL_END) {
      if (segmentEndIsVirtual) {
        // Toggle off virtual end
        setSegmentEndIsVirtual(false);
      } else {
        // Set virtual end (clear any real end)
        setSegmentEnd(null);
        setSegmentEndIsVirtual(true);
      }
    }
  };

  const handleRemoveEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));

    // Adjust segment indices
    if (segmentStart !== null) {
      if (index === segmentStart) {
        setSegmentStart(null);
      } else if (index < segmentStart) {
        setSegmentStart(segmentStart - 1);
      }
    }
    if (segmentEnd !== null) {
      if (index === segmentEnd) {
        setSegmentEnd(null);
      } else if (index < segmentEnd) {
        setSegmentEnd(segmentEnd - 1);
      }
    }
  };

  const handleToggleNegation = (index: number) => {
    if (disableNegation) return;

    // Cannot negate if this event is a segment boundary
    if (segmentStart === index || segmentEnd === index) return;

    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], negated: !newEvents[index].negated };
    setEvents(newEvents);
  };

  const handleToggleSegmentStart = (index: number) => {
    const event = events[index];

    // Cannot set segment start on a negated event
    if (event.negated) return;

    if (segmentStart === index) {
      // Toggle off
      setSegmentStart(null);
    } else {
      // Cannot set start at or after end (unless end is virtual)
      if (segmentEnd !== null && !segmentEndIsVirtual && index >= segmentEnd) {
        return;
      }

      // Set as start
      setSegmentStart(index);
      setSegmentStartIsVirtual(false);
    }
  };

  const handleToggleSegmentEnd = (index: number) => {
    const event = events[index];

    // Cannot set segment end on a negated event
    if (event.negated) return;

    if (segmentEnd === index) {
      // Toggle off
      setSegmentEnd(null);
    } else {
      // Cannot set end at or before start (unless start is virtual)
      if (segmentStart !== null && !segmentStartIsVirtual && index <= segmentStart) {
        return;
      }

      // Set as end
      setSegmentEnd(index);
      setSegmentEndIsVirtual(false);
    }
  };

  // Check if segment start button should be disabled for an event
  const isStartButtonDisabled = (index: number): { disabled: boolean; reason?: string } => {
    const event = events[index];

    if (event.negated) {
      return { disabled: true, reason: "Cannot set segment boundary on a negated event" };
    }

    // If there's an end set, start must be before end
    if (segmentEnd !== null && !segmentEndIsVirtual && index >= segmentEnd) {
      return { disabled: true, reason: "Start must be before end" };
    }

    return { disabled: false };
  };

  // Check if segment end button should be disabled for an event
  const isEndButtonDisabled = (index: number): { disabled: boolean; reason?: string } => {
    const event = events[index];

    if (event.negated) {
      return { disabled: true, reason: "Cannot set segment boundary on a negated event" };
    }

    // If there's a start set, end must be after start
    if (segmentStart !== null && !segmentStartIsVirtual && index <= segmentStart) {
      return { disabled: true, reason: "End must be after start" };
    }

    return { disabled: false };
  };

  // Check if negation button should be disabled for an event
  const isNegationButtonDisabled = (index: number): { disabled: boolean; reason?: string } => {
    if (disableNegation) {
      return { disabled: true, reason: "Negation is disabled" };
    }

    if (segmentStart === index || segmentEnd === index) {
      return { disabled: true, reason: "Cannot negate a segment boundary event" };
    }

    return { disabled: false };
  };

  const getEventStyle = () => {
    return "border-gray-300 bg-gray-50 text-gray-700";
  };

  const handleConfirm = () => {
    // Segment is optional, virtual markers = null
    onConfirm({
      attribute: selectedAttribute,
      events,
      segmentStart: segmentStartIsVirtual ? null : segmentStart,
      segmentEnd: segmentEndIsVirtual ? null : segmentEnd,
    });
  };

  const categoricalAttributes = metadata?.eventAttributes.filter(
    (attr) => attr.type === "categorical"
  );

  const selectedAttributeData = categoricalAttributes?.find(
    (attr) => attr.name === selectedAttribute
  );

  // Require at least 1 event, OR both virtual markers selected (entire sequence = no filter)
  const canConfirm = events.length >= 1 || (segmentStartIsVirtual && segmentEndIsVirtual);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  }

  // Render action buttons for an event (shown on hover)
  const renderEventActionButtons = (index: number) => {
    const event = events[index];
    const isStart = segmentStart === index;
    const isEnd = segmentEnd === index;
    const startDisabled = isStartButtonDisabled(index);
    const endDisabled = isEndButtonDisabled(index);
    const negationDisabled = isNegationButtonDisabled(index);

    const renderButton = (
      content: React.ReactNode,
      onClick: () => void,
      disabled: boolean,
      isActive: boolean,
      tooltip: string,
      activeColor: "blue" | "gray" = "blue"
    ) => {
      const button = (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onClick();
          }}
          disabled={disabled}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
            disabled
              ? "text-gray-300 cursor-not-allowed"
              : isActive
              ? activeColor === "blue"
                ? "text-blue-600 bg-blue-100"
                : "text-gray-600 bg-gray-200"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          }`}
        >
          {content}
        </button>
      );

      return (
        <TooltipWrapper content={tooltip} side="top" sideOffset={8}>
          <span>{button}</span>
        </TooltipWrapper>
      );
    };

    return (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-2 flex gap-0.5 bg-white border border-gray-200 rounded shadow-sm px-1 py-0.5 z-10">
        {/* Segment Start button [ */}
        {!disableSegmentation && renderButton(
          <span className="text-xs font-bold">[</span>,
          () => handleToggleSegmentStart(index),
          startDisabled.disabled,
          isStart,
          startDisabled.disabled ? startDisabled.reason! : (isStart ? "Remove start boundary" : "Set as segment start"),
          "gray"
        )}

        {/* Segment End button ] */}
        {!disableSegmentation && renderButton(
          <span className="text-xs font-bold">]</span>,
          () => handleToggleSegmentEnd(index),
          endDisabled.disabled,
          isEnd,
          endDisabled.disabled ? endDisabled.reason! : (isEnd ? "Remove end boundary" : "Set as segment end"),
          "gray"
        )}

        {/* Negation button ! */}
        {!disableNegation && renderButton(
          <span className="text-xs font-bold">!</span>,
          () => handleToggleNegation(index),
          negationDisabled.disabled,
          event.negated,
          negationDisabled.disabled ? negationDisabled.reason! : (event.negated ? "Remove negation" : "Negate event"),
          "gray"
        )}

        {/* Remove button × (rightmost) */}
        <TooltipWrapper content="Remove event" side="top" sideOffset={8}>
          <span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveEvent(index);
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-bold">×</span>
            </button>
          </span>
        </TooltipWrapper>
      </div>
    );
  };

  // Get description text for segment selection
  const getSegmentDescription = () => {
    if (events.length === 0) {
      return null;
    }

    const startSelected = segmentStartIsVirtual || segmentStart !== null;
    const endSelected = segmentEndIsVirtual || segmentEnd !== null;

    if (!startSelected && !endSelected) {
      return null;
    }

    if (startSelected && !endSelected) {
      if (segmentStartIsVirtual) {
        return "Segment starts from beginning. Click END or an event to set the end boundary.";
      }
      return `Segment starts at "${events[segmentStart!].value}". Click END or an event after it to set the end boundary.`;
    }

    if (!startSelected && endSelected) {
      if (segmentEndIsVirtual) {
        return "Segment ends at sequence end. Click START or an event to set the start boundary.";
      }
      return `Segment ends at "${events[segmentEnd!].value}". Click START or an event before it to set the start boundary.`;
    }

    // Both selected
    if (segmentStartIsVirtual && segmentEndIsVirtual) {
      return "Extracting entire sequence (all events).";
    }
    if (segmentStartIsVirtual && !segmentEndIsVirtual) {
      return `Extracting events before "${events[segmentEnd!].value}" (boundary excluded).`;
    }
    if (!segmentStartIsVirtual && segmentEndIsVirtual) {
      return `Extracting events after "${events[segmentStart!].value}" (boundary excluded).`;
    }
    return `Extracting events between "${events[segmentStart!].value}" and "${events[segmentEnd!].value}" (boundaries excluded).`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Event Attribute
        </label>
        <div className="relative">
          <select
            value={selectedAttribute}
            onChange={(e) => {
              setSelectedAttribute(e.target.value);
              setEvents([]);
              setSegmentStart(null);
              setSegmentEnd(null);
              setSegmentStartIsVirtual(false);
              setSegmentEndIsVirtual(false);
            }}
            className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Select attribute...</option>
            {categoricalAttributes?.map((attr) => (
              <option key={attr.name} value={attr.name}>
                {attr.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Pattern Editor
        </label>
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="min-h-[100px] border border-gray-300 rounded-lg px-4 py-10 flex items-center gap-2 overflow-x-auto"
          >
            {/* Virtual START marker */}
            {selectedAttribute && !disableSegmentation && (
              <div
                onMouseEnter={() => setHoveredEventIndex(VIRTUAL_START)}
                onMouseLeave={() => setHoveredEventIndex(null)}
                className={`relative min-w-fit px-3 h-12 border border-dashed rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${getEventStyle()}`}
              >
                {/* Show [ button on hover or when active */}
                {(hoveredEventIndex === VIRTUAL_START || segmentStartIsVirtual) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-2 flex gap-0.5 bg-white border border-gray-200 rounded shadow-sm px-1 py-0.5 z-10">
                    <TooltipWrapper content={segmentStartIsVirtual ? "Remove start boundary" : "Set as segment start"} side="top" sideOffset={8}>
                      <span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVirtualMarkerClick(VIRTUAL_START);
                          }}
                          className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                            segmentStartIsVirtual
                              ? "text-gray-600 bg-gray-200"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-xs font-bold">[</span>
                        </button>
                      </span>
                    </TooltipWrapper>
                  </div>
                )}
                <span className="text-xs">START</span>
              </div>
            )}

            {selectedAttribute && (
              <button
                onClick={() => handleAddEvent(0)}
                className={`w-8 h-12 border border-dashed rounded-lg flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                  selectorPosition === 0 && showValueSelector
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-300 text-gray-400"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}

            {events.map((event, index) => {
              // Check if any button is active for this event
              const isStart = segmentStart === index;
              const isEnd = segmentEnd === index;
              const isNegated = event.negated;
              const hasActiveButton = isStart || isEnd || isNegated;
              const showButtons = hoveredEventIndex === index || hasActiveButton;

              return (
              <Fragment key={index}>
                <div
                  ref={(el) => {
                    eventRefs.current[index] = el;
                  }}
                  onMouseEnter={() => setHoveredEventIndex(index)}
                  onMouseLeave={() => setHoveredEventIndex(null)}
                  className={`relative group min-w-fit px-3 h-12 border border-dashed rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${getEventStyle()}`}
                >
                  {/* Action buttons shown on hover OR when any button is active */}
                  {showButtons && renderEventActionButtons(index)}

                  <span className="text-xs">{event.value}</span>
                </div>
                <button
                  onClick={() => handleAddEvent(index + 1)}
                  className={`w-8 h-12 border border-dashed rounded-lg flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    selectorPosition === index + 1 && showValueSelector
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </Fragment>
            );
            })}

            {/* Virtual END marker */}
            {selectedAttribute && !disableSegmentation && (
              <div
                onMouseEnter={() => setHoveredEventIndex(VIRTUAL_END)}
                onMouseLeave={() => setHoveredEventIndex(null)}
                className={`relative min-w-fit px-3 h-12 border border-dashed rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${getEventStyle()}`}
              >
                {/* Show ] button on hover or when active */}
                {(hoveredEventIndex === VIRTUAL_END || segmentEndIsVirtual) && (
                  <div
                    onMouseEnter={() => setHoveredEventIndex(VIRTUAL_END)}
                    onMouseLeave={() => setHoveredEventIndex(null)}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-2 flex gap-0.5 bg-white border border-gray-200 rounded shadow-sm px-1 py-0.5 z-10"
                  >
                    <TooltipWrapper content={segmentEndIsVirtual ? "Remove end boundary" : "Set as segment end"} side="top" sideOffset={8}>
                      <span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVirtualMarkerClick(VIRTUAL_END);
                          }}
                          className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                            segmentEndIsVirtual
                              ? "text-gray-600 bg-gray-200"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-xs font-bold">]</span>
                        </button>
                      </span>
                    </TooltipWrapper>
                  </div>
                )}
                <span className="text-xs">END</span>
              </div>
            )}

            {!selectedAttribute && (
              <div className="text-sm text-gray-400">
                Select an event attribute to start building a pattern
              </div>
            )}
          </div>

          {showValueSelector &&
            selectedAttributeData &&
            selectedAttributeData.type === "categorical" && (
              <EventValueSelector
                values={selectedAttributeData.values}
                onSelect={handleSelectValue}
                onClose={() => {
                  setShowValueSelector(false);
                  setSelectorPosition(null);
                }}
              />
            )}
        </div>
      </div>

      {/* Segment description */}
      {getSegmentDescription() && (
        <div className="px-1">
          <p className="text-xs text-gray-600">
            {getSegmentDescription()}
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ✕ Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          ✓ Confirm
        </button>
      </div>
    </div>
  );
}
