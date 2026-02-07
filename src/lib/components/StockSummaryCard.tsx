import { ShoppingCart, TrendingDown } from "lucide-react";

interface StockSummaryCardProps {
  title: string;
  stockSummary: { [key: string]: number };
  wastageSummary?: { [key: string]: number };
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  icon?: "shopping" | "trending";
}

export default function StockSummaryCard({
  title,
  stockSummary,
  wastageSummary,
  bgColor,
  borderColor,
  textColor,
  iconColor,
  icon = "shopping",
}: StockSummaryCardProps) {
  const Icon = icon === "shopping" ? ShoppingCart : TrendingDown;
  const totalWastage = wastageSummary
    ? Object.values(wastageSummary).reduce((a, b) => a + b, 0)
    : 0;

  if (Object.keys(stockSummary).length === 0) return null;

  // Get stock counts in order: 16ft, 15ft, 12ft
  const stock16ft = stockSummary["16ft"] || 0;
  const stock15ft = stockSummary["15ft"] || 0;
  const stock12ft = stockSummary["12ft"] || 0;
  const totalStocks = stock16ft + stock15ft + stock12ft;

  return (
    <div className={`${bgColor} rounded-lg p-2.5 border ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <h3 className={`text-xs font-semibold ${textColor}`}>{title}</h3>
        </div>
        {totalWastage > 0 && (
          <span className={`text-[10px] ${textColor} opacity-75`}>
            {totalWastage}w
          </span>
        )}
      </div>

      {totalStocks > 0 ? (
        <div className="space-y-1.5">
          {stock16ft > 0 && (
            <div className="flex items-center justify-between bg-white rounded px-2 py-1">
              <span className={`text-xs ${textColor} font-medium`}>16ft:</span>
              <span className={`text-xs ${textColor} font-bold`}>
                {stock16ft}
              </span>
            </div>
          )}
          {stock15ft > 0 && (
            <div className="flex items-center justify-between bg-white rounded px-2 py-1">
              <span className={`text-xs ${textColor} font-medium`}>15ft:</span>
              <span className={`text-xs ${textColor} font-bold`}>
                {stock15ft}
              </span>
            </div>
          )}
          {stock12ft > 0 && (
            <div className="flex items-center justify-between bg-white rounded px-2 py-1">
              <span className={`text-xs ${textColor} font-medium`}>12ft:</span>
              <span className={`text-xs ${textColor} font-bold`}>
                {stock12ft}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic">No stocks required</div>
      )}
    </div>
  );
}
