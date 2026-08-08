import { useState } from "react";
import {
  Package,
  TrendingDown,
  Scissors,
  ChevronDown,
  ChevronUp,
  Square,
  Wind,
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

  const combinedMosquitoArea = result.combinedSummary.totalMosquitoArea || 0;

  return (
    <div className="space-y-4 md:max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar-thin">
      {/* ── Combined Summary ─────────────────────────────────────────────── */}
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

        {/* Glass Area + Mosquito Area — side-by-side when both present */}
        {(result.combinedSummary.totalGlassArea > 0 ||
          combinedMosquitoArea > 0) && (
          <div
            className={`grid gap-3 mb-4 ${
              result.combinedSummary.totalGlassArea > 0 &&
              combinedMosquitoArea > 0
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {result.combinedSummary.totalGlassArea > 0 && (
              <div className="bg-linear-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <Square className="w-4 h-4 text-cyan-700" />
                  <h4 className="text-sm font-semibold text-cyan-900">
                    Total Glass Area
                  </h4>
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xl font-bold text-cyan-900">
                    {formatMm(result.combinedSummary.totalGlassArea)} mm²
                  </span>
                  <span className="text-xs text-cyan-700">
                    (
                    {(
                      (result.combinedSummary.totalGlassArea / 1000000) *
                      10.764
                    ).toFixed(2)}{" "}
                    sq.ft)
                  </span>
                </div>
              </div>
            )}

            {combinedMosquitoArea > 0 && (
              <div className="bg-linear-to-r from-teal-50 to-emerald-50 rounded-lg p-3 border border-teal-200">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="w-4 h-4 text-teal-700" />
                  <h4 className="text-sm font-semibold text-teal-900">
                    Total Mosquito Net Area
                  </h4>
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xl font-bold text-teal-900">
                    {formatMm(combinedMosquitoArea)} mm²
                  </span>
                  <span className="text-xs text-teal-700">
                    (
                    {((combinedMosquitoArea / 1000000) * 10.764).toFixed(2)}{" "}
                    sq.ft)
                  </span>
                </div>
              </div>
            )}
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

      {/* ── Section Results ───────────────────────────────────────────────── */}
      {result.sectionResults.map((sectionResult) => {
        const sectionKey = `section-${sectionResult.sectionId}`;
        const isExpanded = expandedSections[sectionKey] ?? true;

        const sectionMosquitoArea = sectionResult.summary.totalMosquitoArea || 0;
        const hasMosquitoNet = sectionMosquitoArea > 0;

        // Detect glass-mosquito from the input section so we can annotate
        // individual dimensions in the glass sizes panel
        const inputSection = result.input.sections.find(
          (s) => s.id === sectionResult.sectionId
        );
        const isGlassMosquitoConfig =
          inputSection?.configuration === "glass-mosquito";

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

                {/* ── Glass & Mosquito Net Sizes ─────────────────────────── */}
                {sectionResult.glassInfo.length > 0 && (
                  <div className="rounded-lg mb-4 overflow-hidden border border-cyan-200">
                    {/* Header */}
                    <div className="bg-linear-to-r from-cyan-50 to-blue-50 px-3 py-2 flex items-center gap-2">
                      <Square className="w-4 h-4 text-cyan-700" />
                      <h4 className="text-sm font-semibold text-cyan-900">
                        {hasMosquitoNet
                          ? "Glass & Mosquito Net Sizes"
                          : "Glass Sizes"}
                      </h4>
                      {hasMosquitoNet && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                          <Wind className="w-3 h-3" />
                          Mosquito Net Included
                        </span>
                      )}
                    </div>

                    {/* Per-dimension rows */}
                    <div className="divide-y divide-cyan-100">
                      {sectionResult.glassInfo.map((glass, idx) => {
                        const dimension = inputSection?.dimensions.find(
                          (d) => d.id === glass.dimensionId
                        );

                        // For glass-mosquito config: 1 mosquito shutter per window,
                        // rest are glass shutters. Same profile dims, different fill.
                        const totalShutterCount =
                          inputSection?.trackType === "3-track" ? 3 : 2;
                        const glassShutterCount = isGlassMosquitoConfig
                          ? totalShutterCount - 1
                          : totalShutterCount;
                        const mosquitoCount = isGlassMosquitoConfig ? 1 : 0;

                        // Glass areas — use the pre-computed totalArea only for
                        // all-glass configs; for glass-mosquito we display
                        // the per-shutter breakdown without touching the stored value.
                        const glassAreaPerPane = glass.glassSize.area;
                        const glassTotalArea = isGlassMosquitoConfig
                          ? glassAreaPerPane * glassShutterCount * glass.quantity
                          : glass.glassSize.totalArea;
                        const mosquitoAreaPerMesh = glassAreaPerPane; // same opening
                        const mosquitoTotalArea =
                          isGlassMosquitoConfig
                            ? mosquitoAreaPerMesh * mosquitoCount * glass.quantity
                            : 0;

                        return (
                          <div key={idx} className="bg-white p-3">
                            {/* Dimension header */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-slate-700">
                                Dimension {idx + 1}
                                {dimension &&
                                  ` — ${formatMm(dimension.width!)} × ${formatMm(
                                    dimension.height!
                                  )} mm  ×  Qty ${glass.quantity}`}
                              </span>
                              {isGlassMosquitoConfig && (
                                <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                                  {glassShutterCount}G + {mosquitoCount}M
                                </span>
                              )}
                            </div>

                            {/* Shutter outer dimensions */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-slate-500">
                                  Shutter Width:
                                </span>
                                <div className="font-semibold text-slate-900">
                                  {formatMm(glass.glassSize.finalShutterWidth)}{" "}
                                  mm
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {mmToFeet(glass.glassSize.finalShutterWidth)}{" "}
                                  ft
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500">
                                  Shutter Height:
                                </span>
                                <div className="font-semibold text-slate-900">
                                  {formatMm(glass.glassSize.finalHeight)} mm
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {mmToFeet(glass.glassSize.finalHeight)} ft
                                </div>
                              </div>
                            </div>

                            {/* Glass pane */}
                            <div className="rounded-md bg-cyan-50 border border-cyan-200 p-2 mb-2">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Square className="w-3 h-3 text-cyan-600" />
                                <span className="text-[11px] font-semibold text-cyan-800">
                                  Glass Pane
                                  {isGlassMosquitoConfig &&
                                    ` (×${glassShutterCount} shutter${glassShutterCount !== 1 ? "s" : ""})`}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500">Size:</span>
                                  <div className="font-semibold text-slate-900">
                                    {formatMm(glass.glassSize.width)} ×{" "}
                                    {formatMm(glass.glassSize.height)} mm
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {mmToFeet(glass.glassSize.width)} ×{" "}
                                    {mmToFeet(glass.glassSize.height)} ft
                                  </div>
                                </div>
                                <div>
                                  <span className="text-slate-500">
                                    Total Area:
                                  </span>
                                  <div className="font-semibold text-slate-900">
                                    {formatMm(glassTotalArea)} mm²
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {(
                                      (glassTotalArea / 1000000) *
                                      10.764
                                    ).toFixed(2)}{" "}
                                    sq.ft
                                  </div>
                                </div>
                              </div>
                              <div className="mt-1 text-[10px] text-slate-400">
                                Per pane: {formatMm(glassAreaPerPane)} mm² ×{" "}
                                {glassShutterCount} ×{" "}
                                {glass.quantity} qty
                              </div>
                            </div>

                            {/* Mosquito net mesh — shown only when applicable */}
                            {isGlassMosquitoConfig && hasMosquitoNet && (
                              <div className="rounded-md bg-teal-50 border border-teal-200 p-2">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Wind className="w-3 h-3 text-teal-600" />
                                  <span className="text-[11px] font-semibold text-teal-800">
                                    Mosquito Net Mesh (×1 shutter)
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-500">
                                      Mesh Size:
                                    </span>
                                    <div className="font-semibold text-slate-900">
                                      {formatMm(glass.glassSize.width)} ×{" "}
                                      {formatMm(glass.glassSize.height)} mm
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {mmToFeet(glass.glassSize.width)} ×{" "}
                                      {mmToFeet(glass.glassSize.height)} ft
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">
                                      Total Area:
                                    </span>
                                    <div className="font-semibold text-teal-900">
                                      {formatMm(mosquitoTotalArea)} mm²
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {(
                                        (mosquitoTotalArea / 1000000) *
                                        10.764
                                      ).toFixed(2)}{" "}
                                      sq.ft
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1 text-[10px] text-slate-400">
                                  Per mesh: {formatMm(mosquitoAreaPerMesh)}{" "}
                                  mm² × 1 × {glass.quantity} qty
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Section-level glass + mosquito area totals */}
                    <div
                      className={`px-3 py-2 grid gap-2 text-xs bg-linear-to-r from-cyan-50 to-blue-50 ${
                        hasMosquitoNet ? "grid-cols-2" : "grid-cols-1"
                      }`}
                    >
                      <div>
                        <span className="text-slate-500">Section Glass Area:</span>
                        <div className="font-bold text-cyan-900">
                          {formatMm(sectionResult.summary.totalGlassArea ?? 0)}{" "}
                          mm²
                          <span className="font-normal text-[10px] text-cyan-700 ml-1">
                            (
                            {(
                              ((sectionResult.summary.totalGlassArea ?? 0) /
                                1000000) *
                              10.764
                            ).toFixed(2)}{" "}
                            sq.ft)
                          </span>
                        </div>
                      </div>
                      {hasMosquitoNet && (
                        <div>
                          <span className="text-slate-500">
                            Section Mosquito Area:
                          </span>
                          <div className="font-bold text-teal-900">
                            {formatMm(sectionMosquitoArea)} mm²
                            <span className="font-normal text-[10px] text-teal-700 ml-1">
                              (
                              {(
                                (sectionMosquitoArea / 1000000) *
                                10.764
                              ).toFixed(2)}{" "}
                              sq.ft)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Accessories ───────────────────────────────────────── */}
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

      {/* ── Combined Order Summary ────────────────────────────────────────── */}
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

          {/* Glass + Mosquito area */}
          {(result.combinedSummary.totalGlassArea > 0 ||
            combinedMosquitoArea > 0) && (
            <>
              <div className="border-t border-slate-500 my-1" />
              {result.combinedSummary.totalGlassArea > 0 && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Square className="w-3 h-3 text-cyan-400" />
                    Glass Area:
                  </span>
                  <span className="font-bold">
                    {(
                      (result.combinedSummary.totalGlassArea / 1000000) *
                      10.764
                    ).toFixed(2)}{" "}
                    sq.ft
                  </span>
                </div>
              )}
              {combinedMosquitoArea > 0 && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-teal-400" />
                    Mosquito Net Area:
                  </span>
                  <span className="font-bold text-teal-300">
                    {((combinedMosquitoArea / 1000000) * 10.764).toFixed(2)}{" "}
                    sq.ft
                  </span>
                </div>
              )}
            </>
          )}

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

          {Object.keys(result.combinedSummary.frameStockSummary).length >
            0 && (
            <div className="mt-2 pt-2 border-t border-slate-600">
              <p className="font-semibold text-slate-200 mb-1">
                Frame Stocks:
              </p>
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
