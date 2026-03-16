"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { NumericalRecordAttributeFilterStep as NumericalFilterStepType } from "./types";
import { getNumericalFilterTooltip } from "./tooltip-utils";

interface NumericalRecordAttributeFilterStepProps {
  step: NumericalFilterStepType;
}

export default function NumericalRecordAttributeFilterStep({
  step,
}: NumericalRecordAttributeFilterStepProps) {
  const range = step.recordAttribute.range.value;

  return (
    <TooltipWrapper content={getNumericalFilterTooltip(step)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-default">
          <StepNumber num={step.index} />
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
            {step.label.value}
          </span>
          <div className="flex items-center">
            <span className="text-slate-600 mr-1.5 uppercase tracking-wide text-[11px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
              {step.recordAttribute.name.value}
            </span>
            <span className="text-slate-900 text-[13px]">
              {range.min} - {range.max}
            </span>
          </div>
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
