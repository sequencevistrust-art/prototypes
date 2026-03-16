"use client";

import { Plus, Minus, X as Multiply, Divide, Equal, Info } from "lucide-react";
import StepNumber from "../step-number";
import { ComparisonStep as ComparisonStepType } from "./types";

interface ComparisonStepProps {
  step: ComparisonStepType;
}

/**
 * Helper to get operator icon
 */
function OperatorIcon({ op }: { op: string }) {
  const className = "w-4 h-4 text-slate-400";
  const textClassName = "text-base font-medium text-slate-400";
  switch (op) {
    case "+":
      return <Plus className={className} />;
    case "-":
      return <Minus className={className} />;
    case "*":
      return <Multiply className={className} />;
    case "/":
      return <Divide className={className} />;
    case "=":
      return <Equal className={className} />;
    default:
      return <span className={textClassName}>{op}</span>;
  }
}

export default function ComparisonStep({ step }: ComparisonStepProps) {
  const { values, operators } = step;

  // Determine if it's a comparison or arithmetic operation
  const isComparison = operators.some((op) =>
    [">", "<", "=", "~"].includes(op.value)
  );
  const isArithmetic = operators.some((op) =>
    ["+", "-", "*", "/"].includes(op.value)
  );

  // Calculate result for arithmetic operations
  let result: number | null = null;
  if (isArithmetic) {
    const numValues = values.map((v) => parseFloat(v.value)).filter((n) => !isNaN(n));

    if (numValues.length >= 2) {
      result = numValues[0];
      for (let i = 0; i < operators.length && i + 1 < numValues.length; i++) {
        const nextVal = numValues[i + 1];
        switch (operators[i].value) {
          case "+":
            result = result + nextVal;
            break;
          case "-":
            result = result - nextVal;
            break;
          case "*":
            result = result * nextVal;
            break;
          case "/":
            result = nextVal !== 0 ? result / nextVal : null;
            break;
        }
        if (result === null) break;
      }
    }
  }

  // Format a numeric value for display
  const formatValue = (value: number | null): string => {
    if (value === null) return "N/A";
    if (globalThis.Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format input values for display (parse string to number first)
  // If the string is already formatted (contains non-numeric chars), return as-is
  const formatInputValue = (valueStr: string): string => {
    // Check if the string is a pure number (only digits, optional decimal, optional leading minus)
    if (!/^-?\d+(\.\d+)?$/.test(valueStr)) {
      return valueStr; // Already formatted (e.g., "1h 5m"), return as-is
    }
    const num = parseFloat(valueStr);
    if (isNaN(num)) return valueStr;
    return formatValue(num);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-4">
        {step.index && <StepNumber num={step.index} />}
        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
          {step.label.value}
        </span>
      </div>

      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
        <div className="flex flex-col items-center justify-center py-2">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {values.map((v, idx) => {
              const operator = idx > 0 ? operators[idx - 1] : null;
              return (
                <div key={idx} className="flex items-center gap-3">
                  {operator && (
                    <OperatorIcon op={operator.value} />
                  )}

                  <div className="flex flex-col items-center">
                    <span className="text-xl font-light text-slate-800 tabular-nums tracking-tight">
                      {formatInputValue(v.value)}
                    </span>
                  </div>
                </div>
              );
            })}

            {isArithmetic && result !== null && (
              <>
                <Equal className="w-4 h-4 text-slate-300" />

                <div className="flex flex-col items-center">
                  <span className="text-xl font-light text-slate-800 tabular-nums tracking-tight">
                    {formatValue(result)}
                  </span>
                </div>
              </>
            )}
          </div>

          {isComparison && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50/50 px-3 py-1.5 rounded-full">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {operators.some((o) => o.value === ">") && "First value is greater"}
                {operators.some((o) => o.value === "<") && "First value is smaller"}
                {operators.some((o) => o.value === "=") && "Values are equal"}
                {operators.some((o) => o.value === "~") && "Values are approx. equal"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
