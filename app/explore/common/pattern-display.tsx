import { EventAttribute } from "../../types/operations";

interface PatternDisplayProps {
  pattern: (Omit<EventAttribute, "negated"> & { negated?: boolean })[];
  segment?: { startIndex: number | null; endIndex: number | null };
  showSegmentMarkers?: boolean; // When true, shows start/end markers and [ ] brackets
}

export default function PatternDisplay({
  pattern,
  segment,
  showSegmentMarkers = false,
}: PatternDisplayProps) {
  const startIdx = segment?.startIndex;
  const endIdx = segment?.endIndex;
  const startIsVirtual = startIdx === null;
  const endIsVirtual = endIdx === null;

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {/* Segment start bracket if at virtual start */}
      {showSegmentMarkers && startIsVirtual && (
        <span className="text-gray-400 font-mono text-[10px]">[</span>
      )}

      {/* Virtual START marker */}
      {showSegmentMarkers && (
        <div className="flex items-center justify-center px-1 py-px text-[8px] font-medium border border-dashed border-gray-300 rounded bg-gray-50 text-gray-500">
          start
        </div>
      )}

      {/* Segment start bracket if at first event */}
      {showSegmentMarkers && startIdx === 0 && (
        <span className="text-gray-400 font-mono text-[10px]">[</span>
      )}

      {/* Pattern events */}
      {pattern.map((event, index) => (
        <div key={index} className="flex items-center gap-1">
          {/* Segment start bracket if at this event (and not first) */}
          {showSegmentMarkers && startIdx === index && index > 0 && (
            <span className="text-gray-400 font-mono text-[10px]">[</span>
          )}

          <div className="flex items-center justify-center px-1 py-px text-[8px] font-medium border border-gray-300 rounded bg-gray-100 text-gray-700">
            {event.negated && (
              <span className="mr-0.5">x</span>
            )}
            <span>{event.value}</span>
          </div>

          {/* Segment end bracket if at this event */}
          {showSegmentMarkers && endIdx === index && (
            <span className="text-gray-400 font-mono text-[10px]">]</span>
          )}
        </div>
      ))}

      {/* Virtual END marker */}
      {showSegmentMarkers && (
        <div className="flex items-center justify-center px-1 py-px text-[8px] font-medium border border-dashed border-gray-300 rounded bg-gray-50 text-gray-500">
          end
        </div>
      )}

      {/* Segment end bracket if at virtual end */}
      {showSegmentMarkers && endIsVirtual && (
        <span className="text-gray-400 font-mono text-[10px]">]</span>
      )}
    </div>
  );
}
