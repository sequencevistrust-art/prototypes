interface AttributePillProps {
  name: string;
  value: string | null | undefined;
}

export default function AttributePill({ name, value }: AttributePillProps) {
  return (
    <div className="flex items-center">
      <span className="text-slate-600 mr-1.5 uppercase tracking-wide text-[11px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
        {name}
      </span>
      <span className="text-slate-900 text-[13px]">
        {value ?? "All"}
      </span>
    </div>
  );
}