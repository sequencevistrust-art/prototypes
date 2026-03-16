"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

interface TooltipWrapperProps {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

export default function TooltipWrapper({
  content,
  children,
  side = "left",
  sideOffset = 5,
}: TooltipWrapperProps) {
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          className="z-[10000] px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-md max-w-xs"
          sideOffset={sideOffset}
        >
          {content}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
