"use client";

import { NoFilterStep as NoFilterStepType } from "./types";

interface NoFilterStepProps {
  step: NoFilterStepType;
}

export default function NoFilterStep({ step }: NoFilterStepProps) {
  return (
    <div className="flex items-center justify-between gap-1.5 py-1 text-slate-500">
      <span className="text-[11px] font-semibold">
        {step.label.value}
      </span>
      <span className="ml-auto pl-4 text-slate-400 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap">
        {step.sessionCount.value.toLocaleString()} sessions
      </span>
    </div>
  );
}
