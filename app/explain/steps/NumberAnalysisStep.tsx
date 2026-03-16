"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { NumberAnalysisStep as NumberAnalysisStepType } from "./types";
import { getNumberAnalysisTooltip } from "./tooltip-utils";
import { useHighlightIds, useErrorIds } from "./HighlightIdsContext";

interface NumberAnalysisStepProps {
  step: NumberAnalysisStepType;
}

export default function NumberAnalysisStep({ step }: NumberAnalysisStepProps) {
  const highlightIds = useHighlightIds();
  const errorIds = useErrorIds();
  const value = step.value.value;
  const isHighlighted = highlightIds.has(step.value.id);
  const isError = errorIds.has(step.value.id);

  // Format the number to be more readable
  const formattedValue = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  return (
    <div>
      {/* Analysis title line */}
      <TooltipWrapper content={getNumberAnalysisTooltip(step)}>
        <div className="flex items-center gap-2 mb-2 cursor-default">
          <StepNumber num={step.index} />
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            {step.label.value}
          </span>
        </div>
      </TooltipWrapper>

      {/* Visualization Card */}
      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-2xl font-light tracking-tight ${isError ? "text-red-600 font-medium underline decoration-red-400 decoration-wavy" : isHighlighted ? "text-blue-700 font-medium" : "text-gray-900"}`}>
            {formattedValue}
          </div>
        </div>
      </div>
    </div>
  );
}
