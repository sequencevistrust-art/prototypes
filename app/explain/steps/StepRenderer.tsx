"use client";

import { Step } from "./types";
import NoFilterStep from "./NoFilterStep";
import PatternFilterStep from "./PatternFilterStep";
import CategoricalRecordAttributeFilterStep from "./CategoricalRecordAttributeFilterStep";
import NumericalRecordAttributeFilterStep from "./NumericalRecordAttributeFilterStep";
import SegmentStep from "./SegmentStep";
import SessionCountAnalysisStep from "./SessionCountAnalysisStep";
import DurationAnalysisStep from "./DurationAnalysisStep";
import PatternDistributionAnalysisStep from "./PatternDistributionAnalysisStep";
import CategoryDistributionAnalysisStep from "./CategoryDistributionAnalysisStep";
import NumberAnalysisStep from "./NumberAnalysisStep";
import FunnelAnalysisStep from "./FunnelAnalysisStep";
import EdgeAnalysisStep from "./EdgeAnalysisStep";
import ComparisonStep from "./ComparisonStep";
import SeparatorStep from "./SeparatorStep";

interface StepRendererProps {
  step: Step;
}

/**
 * Renders the appropriate step component based on the step type
 */
export default function StepRenderer({
  step,
}: StepRendererProps) {
  switch (step.type) {
    case "no-filter":
      return <NoFilterStep step={step} />;

    case "pattern-filter":
      return <PatternFilterStep step={step} />;

    case "categorical-record-attribute-filter":
      return <CategoricalRecordAttributeFilterStep step={step} />;

    case "numerical-record-attribute-filter":
      return <NumericalRecordAttributeFilterStep step={step} />;

    case "segment":
      return <SegmentStep step={step} />;

    case "session-count-analysis":
      return <SessionCountAnalysisStep step={step} />;

    case "duration-analysis":
      return <DurationAnalysisStep step={step} />;

    case "pattern-distribution-analysis":
      return <PatternDistributionAnalysisStep step={step} />;

    case "category-distribution-analysis":
      return <CategoryDistributionAnalysisStep step={step} />;

    case "number-analysis":
      return <NumberAnalysisStep step={step} />;

    case "funnel-analysis":
      return <FunnelAnalysisStep step={step} />;

    case "edge-analysis":
      return <EdgeAnalysisStep step={step} />;

    case "comparison":
      return <ComparisonStep step={step} />;

    case "separator":
      return <SeparatorStep step={step} />;

    default:
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = step;
      return null;
  }
}
