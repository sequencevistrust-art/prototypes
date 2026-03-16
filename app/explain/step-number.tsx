"use client";

interface StepNumberProps {
  num: number;
}

export default function StepNumber({ num }: StepNumberProps) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold shrink-0">
      {num}
    </span>
  );
}
