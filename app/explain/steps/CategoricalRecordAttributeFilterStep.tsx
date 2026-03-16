"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { CategoricalRecordAttributeFilterStep as CategoricalFilterStepType } from "./types";
import { getCategoricalFilterTooltip } from "./tooltip-utils";

interface CategoricalRecordAttributeFilterStepProps {
  step: CategoricalFilterStepType;
}

export default function CategoricalRecordAttributeFilterStep({
  step,
}: CategoricalRecordAttributeFilterStepProps) {
  return (
    <TooltipWrapper content={getCategoricalFilterTooltip(step)}>
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
              {step.recordAttribute.value.value}
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
