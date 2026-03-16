"use client";

import { useState, useEffect } from "react";
import { useMetadata } from "../../context/metadata-context";
import NumericalRangeSelector from "./numerical-range-selector";

export interface RecordAttributeEditorData {
  attribute: string;
  value?: string;
  min?: number;
  max?: number;
}

interface RecordAttributeEditorProps {
  onCancel: () => void;
  onConfirm: (data: RecordAttributeEditorData) => void;
  mode?: "single" | "multiple";
  attributeType?: "categorical" | "numerical" | "all";
  initialAttribute?: string;
  initialValue?: string;
  initialRange?: [number, number];
}

export default function RecordAttributeEditor({
  onCancel,
  onConfirm,
  mode = "single",
  attributeType = "categorical",
  initialAttribute = "",
  initialValue = "",
  initialRange = [0, 0],
}: RecordAttributeEditorProps) {
  const { metadata, loading } = useMetadata();
  const [selectedAttribute, setSelectedAttribute] = useState(initialAttribute);
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const [range, setRange] = useState<[number, number]>(initialRange);

  const attributes = metadata?.recordAttributes.filter((attr) => {
    if (attributeType === "all") return true;
    return attr.type === attributeType;
  });

  const selectedAttributeData = attributes?.find(
    (attr) => attr.name === selectedAttribute
  );

  useEffect(() => {
    if (selectedAttributeData?.type === "numerical" && !initialAttribute) {
      setRange([selectedAttributeData.min, selectedAttributeData.max]);
    } else if (selectedAttributeData?.type === "categorical" && !initialAttribute) {
      setSelectedValue("");
    }
  }, [selectedAttributeData, initialAttribute]);

  const handleConfirm = () => {
    if (!selectedAttribute) return;

    if (mode === "multiple") {
      onConfirm({ attribute: selectedAttribute });
    } else {
      if (selectedAttributeData?.type === "categorical") {
        if (selectedValue) {
          onConfirm({ attribute: selectedAttribute, value: selectedValue });
        }
      } else if (selectedAttributeData?.type === "numerical") {
        onConfirm({ attribute: selectedAttribute, min: range[0], max: range[1] });
      }
    }
  };

  const isConfirmDisabled =
    mode === "multiple"
      ? !selectedAttribute
      : !selectedAttribute ||
        (selectedAttributeData?.type === "categorical" && !selectedValue);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Record Attribute
        </label>
        <div className="relative">
          <select
            value={selectedAttribute}
            onChange={(e) => {
              setSelectedAttribute(e.target.value);
            }}
            className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Select attribute...</option>
            {attributes?.map((attr) => (
              <option key={attr.name} value={attr.name}>
                {attr.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {mode === "single" && selectedAttribute && selectedAttributeData && (
        <div className="pt-2">
          {selectedAttributeData.type === "categorical" ? (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Value
              </label>
              <div className="relative">
                <select
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <option value="">Select value...</option>
                  {selectedAttributeData.values.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-4">
                Range Selection
              </label>
              <div className="px-2">
                <NumericalRangeSelector
                  min={selectedAttributeData.min}
                  max={selectedAttributeData.max}
                  value={range}
                  onChange={setRange}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "multiple" && selectedAttribute && (
        <div className="px-1">
          <p className="text-xs text-gray-600">
            Rows will be segmented by{" "}
            <span className="font-semibold">{selectedAttribute}</span>.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          ✕ Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          ✓ Confirm
        </button>
      </div>
    </div>
  );
}
