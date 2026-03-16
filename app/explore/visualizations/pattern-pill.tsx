import { EventAttribute } from "../../types/operations";

interface PatternPillProps {
  pattern: EventAttribute[];
  align?: "left" | "center";
  segment?: {
    startIndex: number | null;
    endIndex: number | null;
  };
}

export default function PatternPill({ pattern, align = "center", segment }: PatternPillProps) {
  // Only show segment markers if segment is provided
  const showMarkers = segment !== undefined;
  const startIdx = segment?.startIndex;
  const endIdx = segment?.endIndex;
  const startIsVirtual = startIdx === null;
  const endIsVirtual = endIdx === null;

  return (
    <div className={`flex items-center gap-1 whitespace-nowrap ${align === "center" ? "justify-center" : "justify-start"}`}>
      {/* Segment start bracket if at virtual start */}
      {showMarkers && startIsVirtual && (
        <span className="text-gray-400 font-mono text-lg">[</span>
      )}

      {/* Virtual START marker */}
      {showMarkers && (
        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">start</span>
      )}

      {/* Segment start bracket if at first event */}
      {showMarkers && startIdx === 0 && (
        <span className="text-gray-400 font-mono text-lg">[</span>
      )}

      {pattern.map((event, index) => {
        return (
          <div key={index} className="flex items-center gap-1">
            {/* Segment start bracket if at this event (and not first) */}
            {showMarkers && startIdx === index && index > 0 && (
              <span className="text-gray-400 font-mono text-lg">[</span>
            )}

            <div className="relative flex items-center justify-center px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded transition-all bg-gray-100 text-gray-900 shadow-sm group-hover:border-gray-300 group-hover:shadow-md">
              <span className="opacity-70 mr-1 uppercase tracking-tight text-[10px]">
                {event.attribute}:
              </span>
              <span>{event.negated ? `✕ ${event.value}` : event.value}</span>
            </div>

            {/* Segment end bracket if at this event */}
            {showMarkers && endIdx === index && (
              <span className="text-gray-400 font-mono text-lg">]</span>
            )}
          </div>
        );
      })}

      {/* Virtual END marker */}
      {showMarkers && (
        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">end</span>
      )}

      {/* Segment end bracket if at virtual end */}
      {showMarkers && endIsVirtual && (
        <span className="text-gray-400 font-mono text-lg">]</span>
      )}
    </div>
  );
}
