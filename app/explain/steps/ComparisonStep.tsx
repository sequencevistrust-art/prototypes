"use client";

import { Plus, Minus, X as Multiply, Divide, Equal, Info } from "lucide-react";
import StepNumber from "../step-number";
import { ComparisonStep as ComparisonStepType } from "./types";
import { useComparisonErrorIds } from "./HighlightIdsContext";

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
  const { values, operators, sourceIds, valueFlags, grouping } = step;
  const comparisonErrorIds = useComparisonErrorIds();

  // Check if any source IDs match comparison error IDs
  const hasError = sourceIds?.some(id => comparisonErrorIds.has(id)) ?? false;

  // Determine if it's a comparison or arithmetic operation
  const isComparison = operators.some((op) =>
    [">", "<", "=", "~"].includes(op.value)
  );
  const isArithmetic = operators.some((op) =>
    ["+", "-", "*", "/"].includes(op.value)
  );

  // Calculate result for arithmetic operations
  let result: number | null = null;
  const anyPercentage = valueFlags?.some(f => f.isPercentage) ?? false;
  const hasMixedComparisonArithmetic = isComparison && isArithmetic;

  // Determine if the result should be shown as a percentage:
  // - All values are % → result is % (sum, difference, or ratio of percentages)
  // - Mixed comparison+arithmetic with any % → arithmetic result shown as %
  // - Mixed % with non-% in pure arithmetic → % gets "consumed", result is raw number
  const allValuesFlagged = valueFlags?.length === values.length && valueFlags.every(f => f.isPercentage);
  const resultIsPercentage = anyPercentage && (allValuesFlagged || hasMixedComparisonArithmetic);

  if (isArithmetic) {
    const arithmeticOps = ["+", "-", "*", "/"];

    // Always convert percentages to decimals for computation
    const numValues = values.map((v, i) => {
      const num = parseFloat(v.value);
      if (isNaN(num)) return NaN;
      if (anyPercentage && valueFlags?.[i]?.isPercentage) return num / 100;
      return num;
    });

    // Evaluate expression respecting parentheses grouping
    const evaluate = (vals: number[], ops: string[]): number | null => {
      if (vals.some(n => isNaN(n))) return null;
      if (vals.length === 0) return null;
      if (vals.length === 1) return vals[0];

      let workVals = [...vals];
      let workOps = [...ops];

      if (grouping && grouping.length > 0) {
        const sorted = [...grouping].sort((a, b) => b.start - a.start);
        for (const group of sorted) {
          const groupVals = workVals.slice(group.start, group.end + 1);
          const groupOps = workOps.slice(group.start, group.end);
          const groupResult = evaluateFlat(groupVals, groupOps);
          if (groupResult === null) return null;
          workVals.splice(group.start, group.end - group.start + 1, groupResult);
          workOps.splice(group.start, group.end - group.start);
        }
      }

      return evaluateFlat(workVals, workOps);
    };

    // Left-to-right evaluation of arithmetic operators only
    const evaluateFlat = (vals: number[], ops: string[]): number | null => {
      let acc: number | null = vals[0];
      for (let i = 0; i < ops.length && i + 1 < vals.length; i++) {
        if (acc === null) return null;
        const nextVal = vals[i + 1];
        if (!arithmeticOps.includes(ops[i])) {
          // Comparison operator — restart accumulator from next value
          acc = nextVal;
          continue;
        }
        switch (ops[i]) {
          case "+": acc = acc + nextVal; break;
          case "-": acc = acc - nextVal; break;
          case "*": acc = acc * nextVal; break;
          case "/": acc = nextVal !== 0 ? acc / nextVal : null; break;
        }
      }
      return acc;
    };

    result = evaluate(numValues, operators.map(o => o.value));

    // Convert result back to percentage if needed
    if (resultIsPercentage && result !== null) {
      result = result * 100;
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
              const isPercent = valueFlags?.[idx]?.isPercentage;
              const opensGroup = grouping?.some(g => g.start === idx);
              const closesGroup = grouping?.some(g => g.end === idx);
              return (
                <div key={idx} className="flex items-center gap-3">
                  {operator && (
                    <OperatorIcon op={operator.value} />
                  )}

                  {opensGroup && (
                    <span className="text-xl font-light text-slate-300">(</span>
                  )}

                  <div className="flex flex-col items-center">
                    <span className="text-xl font-light text-slate-800 tabular-nums tracking-tight">
                      {formatInputValue(v.value)}{isPercent ? "%" : ""}
                    </span>
                  </div>

                  {closesGroup && (
                    <span className="text-xl font-light text-slate-300">)</span>
                  )}
                </div>
              );
            })}

            {isArithmetic && result !== null && (
              <>
                <Equal className="w-4 h-4 text-slate-300" />

                <div className="flex flex-col items-center">
                  <span className={`text-xl font-light tabular-nums tracking-tight ${hasError ? "text-red-600 font-medium underline decoration-red-400 decoration-wavy" : "text-slate-800"}`}>
                    {formatValue(result)}{resultIsPercentage ? "%" : ""}
                  </span>
                </div>
              </>
            )}
          </div>

          {operators.every((o) => o.value === "=") && operators.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50/50 px-3 py-1.5 rounded-full">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Values are equal</span>
            </div>
          )}
          {operators.every((o) => o.value === "~") && operators.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50/50 px-3 py-1.5 rounded-full">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Values are approx. equal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
