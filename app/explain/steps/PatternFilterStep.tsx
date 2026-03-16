"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { PatternFilterStep as PatternFilterStepType, EventAttribute } from "./types";
import { getPatternFilterTooltip } from "./tooltip-utils";

interface PatternFilterStepProps {
  step: PatternFilterStepType;
}

/**
 * Render a pattern pill from step EventAttribute format
 */
function PatternPill({ pattern }: { pattern: EventAttribute[] }) {
  return (
    <div className="flex items-center whitespace-nowrap justify-start">
      {pattern.map((event, index) => {
        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <span className="text-slate-400 mx-2 text-[13px]">→</span>
            )}
            <span className="text-slate-600 mr-1.5 uppercase tracking-wide text-[11px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
              {event.attribute.value}
            </span>
            <span className="text-slate-900 text-[13px]">
              {event.negated?.value && <span className="text-red-700">✕ </span>}
              {event.value.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PatternFilterStep({ step }: PatternFilterStepProps) {
  return (
    <TooltipWrapper content={getPatternFilterTooltip(step)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-default">
          <StepNumber num={step.index} />
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
            {step.label.value}
          </span>
          <PatternPill pattern={step.pattern} />
        </div>
        {step.sessionCount && (
          <span className="ml-auto pl-4 text-slate-400 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap">
            {step.sessionCount.value.toLocaleString()} sessions
          </span>
        )}
      </div>
    </TooltipWrapper>
  );
}
