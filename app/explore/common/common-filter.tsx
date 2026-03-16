"use client";

import { useRef, useEffect } from "react";
import RecordAttributeEditor, { RecordAttributeEditorData } from "./record-attribute-editor";
import { StoredOperation } from "../../store/operations-store";

interface CommonFilterProps {
  onCancel: () => void;
  onConfirm: (filter: { type: "attribute"; data: RecordAttributeEditorData }) => void;
  initialOperation?: StoredOperation;
}

export default function CommonFilter({
  onCancel,
  onConfirm,
  initialOperation,
}: CommonFilterProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onCancel();
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
  }, [onCancel]);
  const getInitialAttributeProps = () => {
    if (initialOperation?.type === "filter" && initialOperation.subType === "record-attribute") {
      const recordAttribute = initialOperation.recordAttribute;
      return {
        initialAttribute: recordAttribute.name,
        initialValue: recordAttribute.type === "categorical" ? recordAttribute.value : "",
        initialRange: recordAttribute.type === "numerical"
            ? [recordAttribute.min, recordAttribute.max] as [number, number]
            : undefined,
      };
    }
    return {};
  };

  const initialAttributeProps = getInitialAttributeProps();

  return (
    <div ref={menuRef} className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50">
      <div className="flex gap-4 border-b border-gray-200 pb-2 mb-4">
        <span className="text-sm font-medium pb-1 px-2 text-blue-600 border-b-2 border-blue-600">
          Record Attribute
        </span>
      </div>

      <RecordAttributeEditor
        key={initialOperation?.id || "new-filter-attribute"}
        mode="single"
        attributeType="all"
        onCancel={onCancel}
        onConfirm={(data) => onConfirm({ type: "attribute", data })}
        {...initialAttributeProps}
      />
    </div>
  );
}
