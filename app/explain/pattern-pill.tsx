import { EventAttribute } from "../types/operations";

interface PatternPillProps {
  pattern: EventAttribute[];
  align?: "left" | "center";
}

export default function PatternPill({ pattern, align = "center" }: PatternPillProps) {
  return (
    <div className={`flex items-center whitespace-nowrap ${align === "center" ? "justify-center" : "justify-start"}`}>
      {pattern.map((event, index) => {
        return (
          <div
            key={index}
            className="flex items-center"
          >
            {index > 0 && (
              <span className="text-slate-400 mx-2 text-[13px]">→</span>
            )}
            <span className="text-slate-600 mr-1.5 uppercase tracking-wide text-[11px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
              {event.attribute}
            </span>
            <span className="text-slate-900 text-[13px]">
              {event.negated && <span className="text-red-700">✕ </span>}
              {event.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}