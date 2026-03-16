interface AttributePillProps {
  name: string;
  value: string;
}

export default function AttributePill({ name, value }: AttributePillProps) {
  return (
    <div className="flex items-center px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded bg-gray-100 text-gray-900 shadow-sm transition-all group-hover:border-gray-300 group-hover:shadow-md">
      <span className="opacity-70 mr-1.5 uppercase tracking-tight text-[10px]">
        {name}:
      </span>
      <span>
        {value}
      </span>
    </div>
  );
}
