"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Search, Calculator, Check, ThumbsUp, ThumbsDown, X, Database, Terminal, AlertTriangle, MessageSquarePlus } from "lucide-react";
import { useUiStore } from "./store/ui-store";
import { useSandboxStore } from "./store/sandbox-store";
import { useOperationsStore } from "./store/operations-store";

// Helper to find the reference from selection
function getCitationReference(selection: Selection | null): string | null {
  if (!selection || selection.rangeCount === 0) return null;
  
  let node: Node | null = selection.anchorNode;
  
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const ref = (node as Element).getAttribute('data-reference');
      if (ref) return ref;
    }
    node = node.parentNode;
  }
  
  return null;
}

function getToolCallIdInReference(reference: string): string | null {
  const match = reference.match(/^(tool_[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default function PickingMenu() {
  const { pickingMenuPosition, setPickingMenuPosition, triggerExplanation, setPickedId, setPickedText, pickedText } = useUiStore();
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setPickingMenuPosition(null);
        setPickedId(null);
        setPickedText(null);
      }
    };

    if (pickingMenuPosition) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pickingMenuPosition, setPickingMenuPosition]);

  if (!pickingMenuPosition) return null;

  const handleAction = (type: "source" | "logic" | "chat") => {
    if (type === "chat") {
      triggerExplanation(); 
    } else {
      triggerExplanation(type);
    }
    setPickingMenuPosition(null); 
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 flex flex-col items-center"
      style={{
        left: pickingMenuPosition.x,
        top: pickingMenuPosition.y,
        transform: 'translate(-50%, -100%)', 
        pointerEvents: 'auto' 
      }}
    >
      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 ease-out origin-bottom">
        
        <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl p-3 w-64 border border-gray-700">
          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
            <span className="font-semibold text-[10px] text-gray-300 uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={10} className="text-blue-400"/> Analysis
            </span>
            <button 
              onClick={() => setPickingMenuPosition(null)} 
              className="text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-300">
              Selected: <span className="text-yellow-400 italic">"{pickedText?.slice(0, 30)}{pickedText && pickedText.length > 30 ? '...' : ''}"</span>
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-2 rounded-md text-xs transition-colors font-medium border border-gray-600 hover:border-gray-500"
                onClick={() => handleAction("source")}
              >
                <Search size={12} className="text-blue-400"/>
                <span>Source</span>
              </button>
              <button 
                className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 px-2 rounded-md text-xs transition-colors font-medium border border-gray-600 hover:border-gray-500"
                onClick={() => handleAction("logic")}
              >
                <Calculator size={12} className="text-purple-400"/>
                <span>Logic</span>
              </button>
            </div>

            <button 
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-1.5 px-2 rounded-md text-xs transition-colors font-medium shadow-sm hover:shadow"
              onClick={() => handleAction("chat")}
            >
              <MessageSquarePlus size={12} />
              <span>Add to Chat (Edit)</span>
            </button>
          </div>
        </div>

        <div 
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 filter drop-shadow-md"
          style={{ marginTop: '-1px' }} 
        ></div>

      </div>
    </div>
  );
}
