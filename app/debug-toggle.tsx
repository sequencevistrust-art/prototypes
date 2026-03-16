"use client";

import { useUiStore } from "./store/ui-store";

interface DebugToggleProps {
  mode?: "table" | "chat";
}

export default function DebugToggle({ mode = "table" }: DebugToggleProps) {
  if (process.env.NODE_ENV === "production") return null;

  const { debugMode, toggleDebugMode, chatDebugMode, toggleChatDebugMode } = useUiStore();

  const isOn = mode === "chat" ? chatDebugMode : debugMode;
  const toggle = mode === "chat" ? toggleChatDebugMode : toggleDebugMode;

  return (
    <div className="flex items-center">
      <label className={`
        flex items-center gap-2 px-2 py-1 rounded-full cursor-pointer transition-all duration-200 border
        ${isOn
          ? "bg-gray-900 border-gray-900 text-white opacity-100 shadow-sm"
          : "bg-white border-gray-200 text-gray-400 opacity-60 hover:opacity-100 hover:border-gray-300"
        }
      `}>
        <input
          type="checkbox"
          className="hidden"
          checked={isOn}
          onChange={toggle}
        />
        <div className={`w-2 h-2 rounded-full ${isOn ? "bg-green-400 animate-pulse" : "bg-gray-300"}`} />
        <span className="text-[9px] font-bold uppercase tracking-widest leading-none select-none">Debug</span>
      </label>
    </div>
  );
}
