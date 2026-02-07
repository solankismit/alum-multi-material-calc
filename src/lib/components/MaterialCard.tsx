import { ChevronDown, ChevronUp } from "lucide-react";
import type { MaterialRequirement } from "../../types";
import { formatMm, getWastageBadgeColor, mmToFeet } from "@/utils/formatters";

interface MaterialCardProps {
  material: MaterialRequirement;
  index: number | string;
  expandedSections: { [key: string]: boolean };
  onToggleSection: (key: string) => void;
}

export default function MaterialCard({
  material,
  index,
  expandedSections,
  onToggleSection,
}: MaterialCardProps) {
  const sectionKey = `material-${index}`;
  const isExpanded = expandedSections[sectionKey] ?? false;

  return (
    <div className="border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-800 text-sm">
            {material.component}
          </h4>
          {material.description && (
            <p className="text-xs text-slate-500 mt-0.5">
              {material.description}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getWastageBadgeColor(
            material.stockBreakdown.wastagePercent
          )}`}
        >
          {material.stockBreakdown.wastagePercent.toFixed(2)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
        <div>
          <p className="text-slate-500 mb-0.5">Required</p>
          <p className="font-semibold text-slate-800">
            {mmToFeet(material.totalRequired)} ft
          </p>
          <p className="text-[10px] text-slate-500">
            {formatMm(material.totalRequired)} mm
          </p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">Stock</p>
          {material.stockBreakdown.allStockCounts ? (
            <div>
              <p className="font-semibold text-slate-800 mb-1">
                {material.stockBreakdown.stocksNeeded} stocks
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(material.stockBreakdown.allStockCounts)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([stockName, count]) => (
                    <span
                      key={stockName}
                      className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded"
                    >
                      {count}× {stockName}
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            <p className="font-semibold text-slate-800">
              {material.stockBreakdown.stocksNeeded}×{" "}
              {material.stockBreakdown.stockName}
            </p>
          )}
        </div>
      </div>

      {material.stockBreakdown.pieceBreakdown && (
        <div className="bg-blue-50 rounded p-2 mb-2">
          <div className="flex flex-wrap gap-1">
            {Object.entries(material.stockBreakdown.pieceBreakdown).map(
              ([type, count]) => (
                <span
                  key={type}
                  className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded"
                >
                  {count} {type}
                </span>
              )
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-slate-50 rounded px-2 py-1 mb-2 text-xs">
        <span className="text-slate-600">Wastage:</span>
        <div className="text-right">
          <span className="font-medium text-slate-800">
            {mmToFeet(material.stockBreakdown.totalWastage)} ft
          </span>
          <p className="text-[10px] text-slate-500">
            {formatMm(material.stockBreakdown.totalWastage)} mm
          </p>
        </div>
      </div>

      {material.stockBreakdown.cuttingPlans &&
        material.stockBreakdown.cuttingPlans.length > 0 && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <button
              onClick={() => onToggleSection(sectionKey)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 mb-2 hover:text-slate-900"
            >
              <span>
                Cutting Plan ({material.stockBreakdown.stocksNeeded} stocks)
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {isExpanded && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar-thin">
                {material.stockBreakdown.cuttingPlans.map((plan, planIndex) => (
                  <div
                    key={planIndex}
                    className="bg-blue-50 rounded p-1.5 text-xs"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-medium text-slate-700">
                        #{plan.stockIndex} (
                        {plan.stockName || material.stockBreakdown.stockName})
                      </span>
                      {plan.wastage > 0 && (
                        <span className="text-red-600 text-xs">
                          {formatMm(plan.wastage)}mm waste
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-xs">
                      {plan.pieces
                        .map((p, idx) => {
                          const pieceType = plan.pieceTypes?.[idx] || "";
                          const typeLabel = pieceType ? `(${pieceType})` : "";
                          return `${mmToFeet(p)}ft${typeLabel}`;
                        })
                        .join(" + ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
