"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import StepNumber from "../step-number";
import TooltipWrapper from "../tooltip-wrapper";
import { formatDuration } from "../../utils/formatters";
import { FunnelAnalysisStep as FunnelAnalysisStepType } from "./types";
import { getFunnelAnalysisTooltip } from "./tooltip-utils";
import { useHighlightIds, useErrorIds } from "./HighlightIdsContext";

interface FunnelAnalysisStepProps {
  step: FunnelAnalysisStepType;
}

export default function FunnelAnalysisStep({
  step,
}: FunnelAnalysisStepProps) {
  const highlightIds = useHighlightIds();
  const errorIds = useErrorIds();
  const { funnel, durations, eventCounts } = step;

  return (
    <div>
      {/* Analysis title line */}
      <TooltipWrapper content={getFunnelAnalysisTooltip(step)}>
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
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            {funnel.map((funnelStep, index) => {
              const isLast = index === funnel.length - 1;
              const durationData = !isLast ? durations[index] : null;
              const countData = !isLast ? eventCounts[index] : null;
              const isHighlighted = highlightIds.has(funnelStep.percentage.id);
              const isError = errorIds.has(funnelStep.percentage.id);
              const isDurationHighlighted = durationData ? highlightIds.has(durationData.id) : false;
              const isDurationError = durationData ? errorIds.has(durationData.id) : false;
              const isCountHighlighted = countData ? highlightIds.has(countData.id) : false;
              const isCountError = countData ? errorIds.has(countData.id) : false;

              const pillStyle = isError
                ? "bg-red-50 border-red-400 text-red-900 shadow-sm"
                : isHighlighted
                ? "bg-blue-50 border-blue-400 text-blue-900 shadow-sm"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50";

              return (
                <div key={index} className="flex flex-col items-center w-full">
                  {/* Event Pill */}
                  <div
                    className={`flex items-center justify-between gap-2 px-2 py-1 border rounded-md shadow-sm transition-all duration-200 ${pillStyle}`}
                    style={{
                      width: `${Math.max(funnelStep.percentage.value, 0)}%`,
                      minWidth: "fit-content",
                    }}
                  >
                    <span
                      className="font-medium truncate max-w-[150px] text-xs"
                      title={funnelStep.eventAttribute.value.value}
                    >
                      {funnelStep.eventAttribute.value.value}
                    </span>
                    <span
                      className={`font-bold px-1 py-0.5 rounded text-[10px] whitespace-nowrap transition-all duration-200 ${
                        isError
                          ? "bg-red-200 text-red-900"
                          : isHighlighted
                          ? "bg-blue-200 text-blue-900"
                          : "text-gray-900 bg-gray-100"
                      }`}
                    >
                      {funnelStep.percentage.value.toFixed(1)}%
                    </span>
                  </div>

                  {/* Connector */}
                  {!isLast && durationData !== null && countData !== null && (
                    <div className="flex flex-col items-center py-1">
                      <div className="w-0.5 h-3 bg-gray-300"></div>
                      <Tooltip.Provider delayDuration={100}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <div
                              className={`cursor-help px-2 py-0.5 border rounded-full text-[10px] font-mono transition-colors ${
                                isDurationError || isCountError
                                  ? "bg-red-50 border-red-400 text-red-700"
                                  : isDurationHighlighted || isCountHighlighted
                                  ? "bg-blue-50 border-blue-400 text-blue-700"
                                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                              }`}
                            >
                              {isDurationHighlighted && !isCountHighlighted &&
                                formatDuration(durationData.value)}
                              {isCountHighlighted && !isDurationHighlighted &&
                                `${Math.round(countData.value).toLocaleString()} events`}
                              {!isDurationHighlighted && !isCountHighlighted &&
                                formatDuration(durationData.value)}
                              {isDurationHighlighted && isCountHighlighted &&
                                formatDuration(durationData.value)}
                            </div>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="bg-gray-800 text-white text-xs px-2 py-1.5 rounded shadow-lg z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                              side="right"
                              sideOffset={5}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div
                                  className={
                                    isDurationError
                                      ? "text-red-300 font-semibold"
                                      : isDurationHighlighted
                                      ? "text-blue-300 font-semibold"
                                      : ""
                                  }
                                >
                                  <span className="text-gray-400">Avg Duration:</span>{" "}
                                  <span className="font-mono ml-1">
                                    {formatDuration(durationData.value)}
                                  </span>
                                </div>
                                <div
                                  className={
                                    isCountError
                                      ? "text-red-300 font-semibold"
                                      : isCountHighlighted ? "text-blue-300 font-semibold" : ""
                                  }
                                >
                                  <span className="text-gray-400">Avg Events:</span>{" "}
                                  <span className="font-mono ml-1">
                                    {Math.round(countData.value).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <Tooltip.Arrow className="fill-gray-800" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                      <div className="w-0.5 h-3 bg-gray-300"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
