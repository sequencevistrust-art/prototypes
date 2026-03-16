"use client";

import { useState, useEffect, useRef } from "react";
import PatternEditor, { PatternEditorData } from "../common/pattern-editor";
import { useMetadata } from "../../context/metadata-context";
import { useOperationsStore, StoredOperation } from "../../store/operations-store";

interface ColumnMenuProps {
  onClose: () => void;
  initialOperation?: StoredOperation;
}

type PatternAnalysisType =
  | "pattern analysis"
  | "event attribute analysis"
  | "funnel analysis";

export default function ColumnMenu({
  onClose,
  initialOperation,
}: ColumnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { metadata } = useMetadata();
  const addOperation = useOperationsStore((state) => state.addOperation);
  const updateOperation = useOperationsStore((state) => state.updateOperation);
  const [activeTab, setActiveTab] = useState<"numerical" | "categorical" | "pattern">(
    "numerical"
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Delay attaching to avoid the click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Numerical state
  const [numericalAttribute, setNumericalAttribute] = useState("");
  const [aggregation, setAggregation] = useState("average");

  // Categorical state
  const [categoricalAttribute, setCategoricalAttribute] = useState("");
  const [categoricalAggregation, setCategoricalAggregation] = useState<"distribution" | "count-unique">("distribution");

  // Pattern state
  const [patternAnalysisType, setPatternAnalysisType] =
    useState<PatternAnalysisType>("pattern analysis");

  // Pattern/Event attribute analysis state
  const [patternEventAttribute, setPatternEventAttribute] = useState("");


  useEffect(() => {
    if (initialOperation && initialOperation.type === "column") {
      if (initialOperation.subType === "numerical") {
        setActiveTab("numerical");
        setNumericalAttribute(initialOperation.recordAttribute.name);
        setAggregation(initialOperation.aggregation);
      } else if (initialOperation.subType === "categorical") {
        setActiveTab("categorical");
        setCategoricalAttribute(initialOperation.recordAttribute.name);
        setCategoricalAggregation(initialOperation.aggregation ?? "distribution");
      } else if (initialOperation.subType === "pattern") {
        setActiveTab("pattern");
        if (initialOperation.analysis === "pattern") {
          setPatternAnalysisType("pattern analysis");
          if ("eventAttribute" in initialOperation && typeof initialOperation.eventAttribute === "string") {
            setPatternEventAttribute(initialOperation.eventAttribute);
          }
        } else if (initialOperation.analysis === "event-attribute") {
          setPatternAnalysisType("event attribute analysis");
          if ("eventAttribute" in initialOperation && typeof initialOperation.eventAttribute === "string") {
            setPatternEventAttribute(initialOperation.eventAttribute);
          }
        } else if (initialOperation.analysis === "funnel") {
          setPatternAnalysisType("funnel analysis");
        }
      }
    }
  }, [initialOperation]);

  const handleConfirmNumerical = () => {
    const operation = {
      type: "column" as const,
      subType: "numerical" as const,
      recordAttribute: {
        name: numericalAttribute,
        type: "numerical" as const,
      },
      aggregation: aggregation as "average" | "sum" | "min" | "max",
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const handleConfirmCategorical = () => {
    const operation = {
      type: "column" as const,
      subType: "categorical" as const,
      recordAttribute: {
        name: categoricalAttribute,
        type: "categorical" as const,
      },
      aggregation: categoricalAggregation,
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const handleConfirmPatternAnalysis = () => {
    const operation = {
      type: "column" as const,
      subType: "pattern" as const,
      analysis: "pattern" as const,
      eventAttribute: patternEventAttribute,
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const handleConfirmEventAttributeAnalysis = () => {
    const operation = {
      type: "column" as const,
      subType: "pattern" as const,
      analysis: "event-attribute" as const,
      eventAttribute: patternEventAttribute,
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const handleConfirmFunnel = (data: PatternEditorData) => {
    const operation = {
      type: "column" as const,
      subType: "pattern" as const,
      analysis: "funnel" as const,
      pattern: data.events,
    };

    if (initialOperation) {
      updateOperation(initialOperation.id, operation);
    } else {
      addOperation(operation);
    }
    onClose();
  };

  const numericalAttributes = metadata?.recordAttributes.filter(
    (attr) => attr.type === "numerical"
  );

  const categoricalAttributes = metadata?.recordAttributes.filter(
    (attr) => attr.type === "categorical"
  );

  const eventAttributes = metadata?.eventAttributes.filter(
    (attr) => attr.type === "categorical"
  );

  // Helper to extract initial values for PatternEditor (funnel only)
  const getInitialFunnelProps = () => {
    if (initialOperation?.type === "column" && initialOperation.subType === "pattern" && initialOperation.analysis === "funnel") {
      if ("pattern" in initialOperation) {
        return {
          initialAttribute: initialOperation.pattern[0]?.attribute || "",
          initialEvents: initialOperation.pattern.map((e: { attribute: string; value: string; negated?: boolean }) => ({ ...e, negated: e.negated ?? false })),
        };
      }
    }
    return {};
  };

  const initialFunnelProps = getInitialFunnelProps();

  return (
    <div ref={menuRef} className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-2 mb-4">
        {(["numerical", "categorical", "pattern"] as const).map((tab) => (
          <button
            key={tab}
            className={`text-sm font-medium pb-1 px-2 rounded-t-md capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "numerical" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Record Attribute
            </label>
            <div className="relative">
              <select
                value={numericalAttribute}
                onChange={(e) => setNumericalAttribute(e.target.value)}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
              >
                <option value="">Select attribute...</option>
                {numericalAttributes?.map((attr) => (
                  <option key={attr.name} value={attr.name}>
                    {attr.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Aggregation
            </label>
            <div className="relative">
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
              >
                <option value="average">Average</option>
                <option value="sum">Sum</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              ✕ Cancel
            </button>
            <button
              onClick={handleConfirmNumerical}
              disabled={!numericalAttribute}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      )}

      {activeTab === "categorical" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Record Attribute
            </label>
            <div className="relative">
              <select
                value={categoricalAttribute}
                onChange={(e) => setCategoricalAttribute(e.target.value)}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
              >
                <option value="">Select attribute...</option>
                {categoricalAttributes?.map((attr) => (
                  <option key={attr.name} value={attr.name}>
                    {attr.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Aggregation
            </label>
            <div className="relative">
              <select
                value={categoricalAggregation}
                onChange={(e) => setCategoricalAggregation(e.target.value as "distribution" | "count-unique")}
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
              >
                <option value="distribution">Distribution</option>
                <option value="count-unique">Count Unique</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              ✕ Cancel
            </button>
            <button
              onClick={handleConfirmCategorical}
              disabled={!categoricalAttribute}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      )}

      {activeTab === "pattern" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Analysis Type
            </label>
            <div className="relative">
              <select
                value={patternAnalysisType}
                onChange={(e) =>
                  setPatternAnalysisType(e.target.value as PatternAnalysisType)
                }
                className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
              >
                <option value="pattern analysis">Pattern Analysis</option>
                <option value="event attribute analysis">Event Attribute Analysis</option>
                <option value="funnel analysis">Funnel Analysis</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          {patternAnalysisType === "pattern analysis" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Event Attribute
                </label>
                <div className="relative">
                  <select
                    value={patternEventAttribute}
                    onChange={(e) => setPatternEventAttribute(e.target.value)}
                    className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
                  >
                    <option value="">Select attribute...</option>
                    {eventAttributes?.map((attr) => (
                      <option key={attr.name} value={attr.name}>
                        {attr.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                    ▼
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  ✕ Cancel
                </button>
                <button
                  onClick={handleConfirmPatternAnalysis}
                  disabled={!patternEventAttribute}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  ✓ Confirm
                </button>
              </div>
            </div>
          )}

          {patternAnalysisType === "event attribute analysis" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Event Attribute
                </label>
                <div className="relative">
                  <select
                    value={patternEventAttribute}
                    onChange={(e) => setPatternEventAttribute(e.target.value)}
                    className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 cursor-pointer"
                  >
                    <option value="">Select attribute...</option>
                    {eventAttributes?.map((attr) => (
                      <option key={attr.name} value={attr.name}>
                        {attr.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                    ▼
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  ✕ Cancel
                </button>
                <button
                  onClick={handleConfirmEventAttributeAnalysis}
                  disabled={!patternEventAttribute}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  ✓ Confirm
                </button>
              </div>
            </div>
          )}

          {patternAnalysisType === "funnel analysis" && (
            <PatternEditor
              key={initialOperation?.id || "new-funnel"}
              disableNegation={true}
              disableSegmentation={true}
              onCancel={onClose}
              onConfirm={handleConfirmFunnel}
              {...initialFunnelProps}
            />
          )}

        </div>
      )}
    </div>
  );
}
