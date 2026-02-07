import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  iconColor?: string;
}

export default function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
  iconColor = "text-slate-600",
}: SummaryCardProps) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200  flex flex-col justify-center ">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="text-xs text-slate-600 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
      {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
    </div>
  );
}
