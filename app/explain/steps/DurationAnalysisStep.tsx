"use client";

import StepNumber from "../step-number";
import { formatDuration } from "../../utils/formatters";
import { DurationAnalysisStep as DurationAnalysisStepType } from "./types";
import { useHighlightIds, useErrorIds } from "./HighlightIdsContext";

interface DurationAnalysisStepProps {
  step: DurationAnalysisStepType;
}

export default function DurationAnalysisStep({
  step,
}: DurationAnalysisStepProps) {
  const highlightIds = useHighlightIds();
  const errorIds = useErrorIds();
  const duration = step.duration.value;
  const isHighlighted = highlightIds.has(step.duration.id);
  const isError = errorIds.has(step.duration.id);

  return (
    <div>
      {/* Analysis title line */}
      <div className="flex items-center gap-2 mb-2 cursor-default">
        <StepNumber num={step.index} />
        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
          {step.label.value}
        </span>
      </div>

      {/* Visualization Card */}
      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
        <div className="flex flex-col w-full h-full items-center justify-center">
          <div className="flex items-center justify-center gap-2">
            <div className={`text-2xl font-light tracking-tight ${isError ? "text-red-600 font-medium underline decoration-red-400 decoration-wavy" : isHighlighted ? "text-blue-700 font-medium" : "text-gray-900"}`}>
              {formatDuration(duration)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
