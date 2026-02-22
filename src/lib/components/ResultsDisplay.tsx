import { useState } from "react";
import {
  Package,
  TrendingDown,
  Scissors,
  ChevronDown,
  ChevronUp,
  Square,
} from "lucide-react";
import type { CalculationResult } from "../../types";
import { mmToFeet, formatMm } from "@/utils/formatters";
import SummaryCard from "./SummaryCard";
import StockSummaryCard from "./StockSummaryCard";
import MaterialCard from "./MaterialCard";

interface ResultsDisplayProps {
  result: CalculationResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalWindows = result.input.sections.reduce(
    (sum, section) =>
      sum +
      section.dimensions.reduce(
        (s, dim) => s + (dim.quantity !== null ? dim.quantity : 0),
        0
      ),
    0
  );

  return (
    <div className="space-y-4 md:max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar-thin">
      {/* Combined Summary */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Overall Summary
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <SummaryCard
            icon={Package}
            label="Total Material"
            value={`${mmToFeet(result.combinedSummary.totalMaterial)} ft`}
            subValue={formatMm(result.combinedSummary.totalMaterial) + " mm"}
          />
          <SummaryCard
            icon={TrendingDown}
            label="Total Wastage"
            value={`${result.combinedSummary.wastagePercent.toFixed(2)}%`}
            subValue={formatMm(result.combinedSummary.totalWastage) + " mm"}
          />
        </div>

        {/* Total Glass Area */}
        {result.combinedSummary.totalGlassArea > 0 && (
          <div className="bg-linear-to-r from-cyan-50 to-blue-50 rounded-lg p-3 mb-4 border border-cyan-200">
            <div className="flex items-center gap-2 mb-2">
              <Square className="w-4 h-4 text-cyan-700" />
              <h4 className="text-sm font-semibold text-cyan-900">
                Total Glass Area
              </h4>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-cyan-900">
                {formatMm(result.combinedSummary.totalGlassArea)} mm²
              </span>
              <span className="text-xs text-cyan-700">
                ({((result.combinedSummary.totalGlassArea / 1000000) * 10.764).toFixed(2)} sq.ft)
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <StockSummaryCard
            title="Total Stock"
            stockSummary={result.combinedSummary.stockSummary}
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-900"
            iconColor="text-blue-700"
          />

          <StockSummaryCard
            title="Frame Stock"
            stockSummary={result.combinedSummary.frameStockSummary}
            wastageSummary={result.combinedSummary.frameWastagePiecesSummary}
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-900"
            iconColor="text-green-700"
          />

          <StockSummaryCard
            title="Shutter Stock"
            stockSummary={result.combinedSummary.shutterStockSummary}
            wastageSummary={result.combinedSummary.shutterWastagePiecesSummary}
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            textColor="text-purple-900"
            iconColor="text-purple-700"
          />

          <StockSummaryCard
            title="Interlock Stock"
            stockSummary={result.combinedSummary.interlockStockSummary}
            wastageSummary={
              result.combinedSummary.interlockWastagePiecesSummary
            }
            bgColor="bg-amber-50"
            borderColor="border-amber-200"
            textColor="text-amber-900"
            iconColor="text-amber-700"
          />
        </div>
      </div>

      {/* Section Results */}
      {result.sectionResults.map((sectionResult) => {
        const sectionKey = `section-${sectionResult.sectionId}`;
        const isExpanded = expandedSections[sectionKey] ?? true;

        return (
          <div
            key={sectionResult.sectionId}
            className="bg-white rounded-xl shadow-lg p-4"
          >
            <button
              type="button"
              onClick={() => toggleSection(sectionKey)}
              className="flex items-center justify-between w-full mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Scissors className="w-5 h-5 text-indigo-700" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-slate-900 border-b-2 border-indigo-200 pb-1 inline-block">
                    {sectionResult.sectionName}
                  </h3>
                  {sectionResult.sectionTypeName && (
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-semibold">
                      System: {sectionResult.sectionTypeName}
                    </p>
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {isExpanded && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <SummaryCard
                    icon={Package}
                    label="Material"
                    value={`${mmToFeet(
                      sectionResult.summary.totalMaterial
                    )} ft`}
                    subValue={
                      formatMm(sectionResult.summary.totalMaterial) + " mm"
                    }
                  />
                  <SummaryCard
                    icon={TrendingDown}
                    label="Wastage"
                    value={`${sectionResult.summary.wastagePercent.toFixed(
                      2
                    )}%`}
                    subValue={
                      formatMm(sectionResult.summary.totalWastage) + " mm"
                    }
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                  <StockSummaryCard
                    title="Total Stock"
                    stockSummary={sectionResult.summary.stockSummary}
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                    textColor="text-blue-900"
                    iconColor="text-blue-700"
                  />

                  <StockSummaryCard
                    title="Frame Stock"
                    stockSummary={sectionResult.summary.frameStockSummary}
                    wastageSummary={
                      sectionResult.summary.frameWastagePiecesSummary
                    }
                    bgColor="bg-green-50"
                    borderColor="border-green-200"
                    textColor="text-green-900"
                    iconColor="text-green-700"
                  />

                  <StockSummaryCard
                    title="Shutter Stock"
                    stockSummary={sectionResult.summary.shutterStockSummary}
                    wastageSummary={
                      sectionResult.summary.shutterWastagePiecesSummary
                    }
                    bgColor="bg-purple-50"
                    borderColor="border-purple-200"
                    textColor="text-purple-900"
                    iconColor="text-purple-700"
                  />

                  <StockSummaryCard
                    title="Interlock Stock"
                    stockSummary={sectionResult.summary.interlockStockSummary}
                    wastageSummary={
                      sectionResult.summary.interlockWastagePiecesSummary
                    }
                    bgColor="bg-amber-50"
                    borderColor="border-amber-200"
                    textColor="text-amber-900"
                    iconColor="text-amber-700"
                  />
                </div>

                <div className="space-y-3 mb-4">
                  {sectionResult.materials.map((material, index) => (
                    <MaterialCard
                      key={index}
                      material={material}
                      index={`${sectionKey}-${index}`}
                      expandedSections={expandedSections}
                      onToggleSection={toggleSection}
                    />
                  ))}
                </div>

                {/* Glass Sizes */}
                {sectionResult.glassInfo.length > 0 && (
                  <div className="bg-linear-to-r from-cyan-50 to-blue-50 rounded-lg p-3 mb-4 border border-cyan-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Square className="w-4 h-4 text-cyan-700" />
                      <h4 className="text-sm font-semibold text-cyan-900">
                        Glass Sizes
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {sectionResult.glassInfo.map((glass, idx) => {
                        const dimension = result.input.sections
                          .find((s) => s.id === sectionResult.sectionId)
                          ?.dimensions.find((d) => d.id === glass.dimensionId);
                        return (
                          <div
                            key={idx}
                            className="bg-white rounded p-2 border border-cyan-200"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700">
                                Dimension {idx + 1}
                                {dimension &&
                                  ` (${formatMm(dimension.width!)} × ${formatMm(dimension.height!)} mm, Qty: ${glass.quantity})`}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-slate-600">
                                  Final Shutter Width:
                                </span>
                                <div className="font-semibold text-slate-900">
                                  {formatMm(glass.glassSize.finalShutterWidth)} mm
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {mmToFeet(glass.glassSize.finalShutterWidth)} ft
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-600">
                                  Final Height:
                                </span>
                                <div className="font-semibold text-slate-900">
                                  {formatMm(glass.glassSize.finalHeight)} mm
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {mmToFeet(glass.glassSize.finalHeight)} ft
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2 border-t border-cyan-200 pt-2">
                              <div>
                                <span className="text-slate-600">Glass Size:</span>
                                <div className="font-semibold text-slate-900">
                                  {formatMm(glass.glassSize.width)} ×{" "}
                                  {formatMm(glass.glassSize.height)} mm
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {mmToFeet(glass.glassSize.width)} ×{" "}
                                  {mmToFeet(glass.glassSize.height)} ft
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-600">
                                  Total Area:
                                </span>
                                <div className="font-semibold text-slate-900">
                                  {formatMm(glass.glassSize.totalArea)} mm²
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {(
                                    (glass.glassSize.totalArea / 1000000) *
                                    10.764
                                  ).toFixed(2)}{" "}
                                  sq.ft
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500">
                              Per glass: {formatMm(glass.glassSize.area)} mm² ×{" "}
                              {glass.quantity} qty
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(sectionResult.accessories.mosquitoCChannel > 0 ||
                  sectionResult.accessories.trackCap > 0) && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <h4 className="text-xs font-semibold text-slate-800 mb-2">
                        Accessories
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {sectionResult.accessories.mosquitoCChannel > 0 && (
                          <div className="flex justify-between items-center p-2 bg-white rounded text-xs">
                            <span className="text-slate-700">C-Channel:</span>
                            <span className="font-bold text-slate-900">
                              {sectionResult.accessories.mosquitoCChannel}
                            </span>
                          </div>
                        )}
                        {sectionResult.accessories.trackCap > 0 && (
                          <div className="flex justify-between items-center p-2 bg-white rounded text-xs">
                            <span className="text-slate-700">Track Cap:</span>
                            <span className="font-bold text-slate-900">
                              {sectionResult.accessories.trackCap}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        );
      })}

      {/* Combined Order Summary */}
      <div className="bg-linear-to-r from-slate-700 to-slate-800 rounded-xl shadow-lg p-4 text-white">
        <h3 className="text-sm font-semibold mb-3">Order Summary</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span>Total Windows:</span>
            <span className="font-bold">{totalWindows}</span>
          </div>
          <div className="flex justify-between">
            <span>Sections:</span>
            <span className="font-bold">{result.input.sections.length}</span>
          </div>
          <div className="border-t border-slate-500 my-2"></div>
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span>Total Stocks:</span>
            <span>
              {Object.values(result.combinedSummary.stockSummary).reduce(
                (sum, count) => sum + count,
                0
              )}
            </span>
          </div>

          {Object.keys(result.combinedSummary.frameStockSummary).length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-600">
              <p className="font-semibold text-slate-200 mb-1">Frame Stocks:</p>
              <div className="flex flex-wrap gap-x-2">
                {Object.entries(result.combinedSummary.frameStockSummary)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([stockName, count]) => (
                    <span key={stockName} className="text-slate-300">
                      {stockName}: <span className="font-bold">{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {Object.keys(result.combinedSummary.shutterStockSummary).length >
            0 && (
              <div className="mt-2 pt-2 border-t border-slate-600">
                <p className="font-semibold text-slate-200 mb-1">
                  Shutter Stocks:
                </p>
                <div className="flex flex-wrap gap-x-2">
                  {Object.entries(result.combinedSummary.shutterStockSummary)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([stockName, count]) => (
                      <span key={stockName} className="text-slate-300">
                        {stockName}: <span className="font-bold">{count}</span>
                      </span>
                    ))}
                </div>
              </div>
            )}

          {Object.keys(result.combinedSummary.interlockStockSummary).length >
            0 && (
              <div className="mt-2 pt-2 border-t border-slate-600">
                <p className="font-semibold text-slate-200 mb-1">
                  Interlock Stocks:
                </p>
                <div className="flex flex-wrap gap-x-2">
                  {Object.entries(result.combinedSummary.interlockStockSummary)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([stockName, count]) => (
                      <span key={stockName} className="text-slate-300">
                        {stockName}: <span className="font-bold">{count}</span>
                      </span>
                    ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
