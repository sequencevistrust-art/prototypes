"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { PatternDistributionAnalysisStep as PatternDistributionAnalysisStepType, EventAttribute } from "./types";
import { getPatternDistributionTooltip } from "./tooltip-utils";
import { useHighlightIds, useErrorIds } from "./HighlightIdsContext";

interface PatternDistributionAnalysisStepProps {
  step: PatternDistributionAnalysisStepType;
}

/**
 * Render a pattern display from step EventAttribute format
 */
function PatternDisplay({ pattern }: { pattern: EventAttribute[] }) {
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {pattern.map((event, index) => {
        return (
          <div key={index} className="flex items-center gap-1">
            <div className="flex items-center justify-center px-1 py-px text-[8px] font-medium border border-gray-300 rounded bg-gray-100 text-gray-700">
              {event.negated?.value && <span className="mr-0.5">x</span>}
              <span>{event.value.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PatternDistributionAnalysisStep({
  step,
}: PatternDistributionAnalysisStepProps) {
  const highlightIds = useHighlightIds();
  const errorIds = useErrorIds();

  return (
    <div>
      {/* Analysis title line */}
      <TooltipWrapper content={getPatternDistributionTooltip(step)}>
        <div className="flex items-center gap-2 mb-2 cursor-default">
          <StepNumber num={step.index} />
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            {step.label.value}
          </span>
        </div>
      </TooltipWrapper>

      {/* Visualization Card */}
      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
        <div className="flex flex-col w-full h-full">
          <div className="flex-1 flex flex-col justify-center gap-2">
            {step.distribution.map((item, index) => {
              const isHighlighted = highlightIds.has(item.percentage.id);
              const isError = errorIds.has(item.percentage.id);
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 w-full group rounded-md px-1 -mx-1 py-0.5 transition-all duration-200 ${
                    isError ? "bg-red-50 ring-1 ring-red-300" : isHighlighted ? "bg-blue-50 ring-1 ring-blue-300" : ""
                  }`}
                >
                  <div className="flex-shrink-0 w-14 flex items-center justify-end">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap transition-all duration-200 ${
                      isError ? "text-red-600 bg-red-100" : "text-gray-700 bg-gray-100 group-hover:bg-gray-200"
                    }`}>
                      {item.percentage.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex-1 flex items-center">
                    <PatternDisplay pattern={item.pattern} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
