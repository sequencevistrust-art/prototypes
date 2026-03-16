"use client";

import { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import FilterBar from "./filter-bar";
import RowBar from "./row-bar";
import ColumnBar from "./column-bar";
import Workspace from "./table";
import ChatPane from "./chat-pane";
import ClearAllButton from "./clear-all-button";
import DebugToggle from "../debug-toggle";



export type MenuState = {
  type: "filter" | "row" | "column";
  mode: "add" | "edit";
  id?: string;
} | null;

export default function Home() {
  const [activeMenu, setActiveMenu] = useState<MenuState>(null);

  const handleToggleAdd = (type: "filter" | "row" | "column") => {
    if (activeMenu?.type === type && activeMenu.mode === "add") {
      setActiveMenu(null);
    } else {
      setActiveMenu({ type, mode: "add" });
    }
  };

  const handleOpenEdit = (type: "filter" | "row" | "column", id: string) => {
    setActiveMenu({ type, mode: "edit", id });
  };

  const handleCloseMenu = () => {
    setActiveMenu(null);
  };

  return (
    <Tooltip.Provider delayDuration={0}>
      <div className="h-screen w-screen grid grid-cols-[1fr_48px_400px] grid-rows-[48px_48px_48px_1fr] gap-2 p-4 bg-white overflow-hidden overscroll-x-none relative">
        {/* Column 1, Row 1 */}
        <div className={`min-w-0 relative ${activeMenu?.type === "filter" ? "z-50" : "z-30"}`}>
          <FilterBar 
            isOpen={activeMenu?.type === "filter"}
            editingId={activeMenu?.type === "filter" && activeMenu.mode === "edit" ? activeMenu.id : undefined}
            onToggleAdd={() => handleToggleAdd("filter")}
            onOpenEdit={(id) => handleOpenEdit("filter", id)}
            onClose={handleCloseMenu}
          />
        </div>

        {/* Column 2, Row 1-3 */}
        <div className="row-span-3 relative z-20 flex flex-col gap-2">
          <ClearAllButton />
        </div>

        {/* Column 3, Row 1-4 */}
        <div className="row-span-4 relative z-10 overflow-hidden">
          <ChatPane />
        </div>

        {/* Column 1, Row 2 */}
        <div className={`min-w-0 relative ${activeMenu?.type === "row" ? "z-50" : "z-30"}`}>
          <RowBar 
            isOpen={activeMenu?.type === "row"}
            editingId={activeMenu?.type === "row" && activeMenu.mode === "edit" ? activeMenu.id : undefined}
            onToggleMenu={() => handleToggleAdd("row")}
            onOpenEdit={(id) => handleOpenEdit("row", id)}
            onClose={handleCloseMenu}
          />
        </div>

        {/* Column 1, Row 3 */}
        <div className={`min-w-0 relative ${activeMenu?.type === "column" ? "z-50" : "z-30"}`}>
          <ColumnBar 
            isOpen={activeMenu?.type === "column"}
            editingId={activeMenu?.type === "column" && activeMenu.mode === "edit" ? activeMenu.id : undefined}
            onToggleMenu={() => handleToggleAdd("column")}
            onOpenEdit={(id) => handleOpenEdit("column", id)}
            onClose={handleCloseMenu}
          />
        </div>

        {/* Column 1-2, Row 4 */}
        <div className="col-span-2 min-w-0 relative z-10">
          <Workspace />
        </div>
      </div>
    </Tooltip.Provider>
  );
}