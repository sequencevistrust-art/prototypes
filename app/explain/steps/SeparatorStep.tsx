"use client";

import { SeparatorStep as SeparatorStepType } from "./types";

interface SeparatorStepProps {
  step: SeparatorStepType;
}

export default function SeparatorStep({ step: _step }: SeparatorStepProps) {
  return (
    <div className="pt-4 mt-4 border-t border-slate-100" />
  );
}
