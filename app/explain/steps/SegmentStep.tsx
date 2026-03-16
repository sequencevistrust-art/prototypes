"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { SegmentStep as SegmentStepType, EventAttribute } from "./types";
import { getSegmentTooltip } from "./tooltip-utils";

interface SegmentStepProps {
  step: SegmentStepType;
}

/**
 * Render an event pill for segment display
 */
function EventPill({ event }: { event: EventAttribute }) {
  return (
    <span className="inline-flex items-center">
      <span className="text-slate-600 mr-1.5 uppercase tracking-wide text-[11px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
        {event.attribute.value}
      </span>
      <span className="text-slate-900 text-[13px]">
        {event.negated?.value && <span>✕ </span>}
        {event.value.value}
      </span>
    </span>
  );
}

export default function SegmentStep({ step }: SegmentStepProps) {
  const isBetween = Array.isArray(step.events);

  return (
    <TooltipWrapper content={getSegmentTooltip(step)}>
      <div className="flex items-center gap-2 cursor-default">
        <StepNumber num={step.index} />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[11px] font-semibold text-slate-500">
            {step.label.value}
          </span>
          {isBetween ? (
            <>
              <EventPill event={(step.events as [EventAttribute, EventAttribute])[0]} />
              <span className="text-[11px] font-semibold text-slate-500">AND</span>
              <EventPill event={(step.events as [EventAttribute, EventAttribute])[1]} />
            </>
          ) : (
            <EventPill event={step.events as EventAttribute} />
          )}
        </div>
      </div>
    </TooltipWrapper>
  );
}
