"use client";

import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { CategoryDistributionAnalysisStep as CategoryDistributionAnalysisStepType } from "./types";
import { getCategoryDistributionTooltip } from "./tooltip-utils";
import { useHighlightIds, useErrorIds } from "./HighlightIdsContext";

interface CategoryDistributionAnalysisStepProps {
  step: CategoryDistributionAnalysisStepType;
}

export default function CategoryDistributionAnalysisStep({
  step,
}: CategoryDistributionAnalysisStepProps) {
  const highlightIds = useHighlightIds();
  const errorIds = useErrorIds();

  // Sort distribution by percentage descending
  const sortedDistribution = [...step.distribution]
    .sort((a, b) => b.percentage.value - a.percentage.value);

  return (
    <div>
      {/* Analysis title line */}
      <TooltipWrapper content={getCategoryDistributionTooltip(step)}>
        <div className="flex items-center gap-2 mb-2 cursor-default">
          <StepNumber num={step.index} />
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            {step.label.value}
          </span>
        </div>
      </TooltipWrapper>

      {/* Visualization Card */}
      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
        <div className="flex flex-col gap-1">
          {sortedDistribution.map((item, index) => {
            const isHighlighted = highlightIds.has(item.percentage.id) || highlightIds.has(item.category.id);
            const isError = errorIds.has(item.percentage.id) || errorIds.has(item.category.id);
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 rounded-md transition-all duration-200 ${
                  isError ? "bg-red-50 ring-1 ring-red-400 shadow-sm" : isHighlighted ? "bg-blue-50 ring-1 ring-blue-400 shadow-sm" : ""
                }`}
              >
                {/* Category name */}
                <span
                  className={`text-xs truncate w-[100px] flex-shrink-0 text-right ${
                    isError ? "text-red-600 font-medium underline decoration-red-400 decoration-wavy" : isHighlighted ? "text-blue-700 font-medium" : "text-slate-600"
                  }`}
                  title={item.category.value}
                >
                  {item.category.value}
                </span>

                {/* Bar */}
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      isError ? "bg-red-400" : isHighlighted ? "bg-blue-500" : "bg-slate-300"
                    }`}
                    style={{ width: `${Math.max(item.percentage.value, 2)}%` }}
                  />
                </div>

                {/* Percentage */}
                <span
                  className={`text-xs font-mono min-w-[45px] text-right ${
                    isError ? "text-red-600 font-medium underline decoration-red-400 decoration-wavy" : isHighlighted ? "text-blue-700 font-semibold" : "text-slate-500"
                  }`}
                >
                  {item.percentage.value.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
