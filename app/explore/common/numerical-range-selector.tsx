"use client";

import * as Slider from "@radix-ui/react-slider";

interface NumericalRangeSelectorProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export default function NumericalRangeSelector({
  min,
  max,
  value,
  onChange,
}: NumericalRangeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs font-medium text-blue-600">
        <span>{value[0].toLocaleString()}</span>
        <span>{value[1].toLocaleString()}</span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={value}
        max={max}
        min={min}
        step={(max - min) / 100 || 1}
        onValueChange={(val) => onChange(val as [number, number])}
      >
        <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
          <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-4 h-4 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none shadow-sm cursor-pointer"
          aria-label="Min value"
        />
        <Slider.Thumb
          className="block w-4 h-4 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none shadow-sm cursor-pointer"
          aria-label="Max value"
        />
      </Slider.Root>
      <div className="flex justify-between text-[10px] text-gray-400 font-medium">
        <span>MIN: {min.toLocaleString()}</span>
        <span>MAX: {max.toLocaleString()}</span>
      </div>
    </div>
  );
}
