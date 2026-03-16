"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { EdgeAnalysisStep as EdgeAnalysisStepType, EventAttribute } from "./types";
import { getEdgeAnalysisTooltip } from "./tooltip-utils";
import { useHighlightIds, useErrorIds } from "./HighlightIdsContext";

interface EdgeAnalysisStepProps {
  step: EdgeAnalysisStepType;
}

export default function EdgeAnalysisStep({
  step,
}: EdgeAnalysisStepProps) {
  const highlightIds = useHighlightIds();
  const errorIds = useErrorIds();
  const { oddsRatios, outcomeEvent } = step;

  const risks = oddsRatios
    .filter((r) => r.oddsRatio.value > 1)
    .sort((a, b) => b.oddsRatio.value - a.oddsRatio.value);

  const protective = oddsRatios
    .filter((r) => r.oddsRatio.value < 1)
    .sort((a, b) => a.oddsRatio.value - b.oddsRatio.value);

  const outcomeName = `${outcomeEvent.attribute.value}: ${outcomeEvent.value.value}`;

  const renderItem = (
    result: {
      eventAttribute: Omit<EventAttribute, "negated">;
      oddsRatio: { id: string; value: number };
    },
    type: "risk" | "protective",
    index: number
  ) => {
    const attributeValue = `${result.eventAttribute.attribute.value}: ${result.eventAttribute.value.value}`;
    const isHighlighted = highlightIds.has(result.oddsRatio.id);
    const isError = errorIds.has(result.oddsRatio.id);
    const pillColor =
      type === "risk"
        ? "bg-red-50 text-red-700 border-red-100"
        : "bg-green-50 text-green-700 border-green-100";

    const tooltipContent = `The outcome "${outcomeName}" is ${result.oddsRatio.value.toFixed(
      2
    )}x ${result.oddsRatio.value >= 1 ? "more" : "less"} likely when "${attributeValue}" is present.`;

    return (
      <Tooltip.Root key={index}>
        <Tooltip.Trigger asChild>
          <div
            className={`flex justify-between items-center py-1 border-b border-gray-50 last:border-0 transition-all duration-200 px-1 rounded cursor-help ${
              isError
                ? "bg-red-50 ring-1 ring-red-400 shadow-sm"
                : isHighlighted
                ? "bg-blue-50 ring-1 ring-blue-400 shadow-sm"
                : "hover:bg-gray-50/50"
            }`}
          >
            <span
              className={`text-[10px] truncate pr-2 flex-1 transition-all duration-200 ${
                isError ? "text-red-600 font-medium underline decoration-red-400 decoration-wavy" : isHighlighted ? "text-gray-900 font-semibold" : "text-gray-700"
              }`}
            >
              {attributeValue}
            </span>
            <span
              className={`text-[9px] font-mono font-medium px-1 py-0 rounded-sm border transition-all duration-200 ${pillColor} whitespace-nowrap`}
            >
              {result.oddsRatio.value.toFixed(2)}x
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            className="z-[100] bg-gray-900 text-white text-[11px] px-3 py-2 rounded shadow-lg max-w-[200px] leading-relaxed animate-in fade-in zoom-in duration-150"
            sideOffset={5}
          >
            {tooltipContent}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  };

  return (
    <Tooltip.Provider delayDuration={0}>
      <div>
        {/* Analysis title line */}
        <TooltipWrapper content={getEdgeAnalysisTooltip(step)}>
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
            <div className="flex flex-col space-y-3 flex-1 justify-center">
              {risks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-semibold text-gray-900">
                      {outcomeName} is more likely with:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {risks.map((r, idx) => renderItem(r, "risk", idx))}
                  </div>
                </div>
              )}

              {protective.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mt-0 mb-3 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-semibold text-gray-900">
                      {outcomeName} is less likely with:
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {protective.map((r, idx) => renderItem(r, "protective", idx))}
                  </div>
                </div>
              )}

              {risks.length === 0 && protective.length === 0 && (
                <div className="text-center py-8 text-gray-400 italic text-xs">
                  No significant factors found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
